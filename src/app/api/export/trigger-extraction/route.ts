import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'

export const dynamic = 'force-dynamic'
export const maxDuration = 300 // 5 minutes for extraction

// Sanitize username helper
function sanitizeUsername(username: string): string {
  if (!username) return `unknown_${Date.now()}`
  return username
    .replace(/^_+|_+$/g, '')
    .replace(/\//g, '_')
    .replace(/\./g, '_')
    .replace(/__+/g, '_')
    .trim() || `unknown_${Date.now()}`
}

// DEDICATED extraction endpoint - NOT in webhook!
export async function POST(request: NextRequest) {
  try {
    const { username, userId } = await request.json()
    
    if (!username) {
      return NextResponse.json({ error: 'Username required' }, { status: 400 })
    }
    
    const cleanUsername = username.toLowerCase().replace(/^@/, '')
    console.log(`[Extraction API] Starting extraction for @${cleanUsername}`)
    
    // Check if fresh extraction is needed (from eligibility check)
    const followerDbDoc = await adminDb.collection('follower_database').doc(cleanUsername).get()
    const needsExtraction = followerDbDoc.data()?.needsExtraction ?? true
    
    console.log(`[Extraction API] needsExtraction flag: ${needsExtraction}`)
    
    // FIRST: Check if user already has dashboard data (faster!) - but only if extraction not needed
    if (userId && !needsExtraction) {
      console.log(`[Extraction API] Checking dashboard data for user ${userId} (no new followers detected)`)
      const dashboardFollowers = await adminDb
        .collection('users')
        .doc(userId)
        .collection('followers')
        .where('target_username', '==', cleanUsername)
        .where('status', '==', 'active')
        .get()
      
      if (!dashboardFollowers.empty) {
        console.log(`[Extraction API] Found ${dashboardFollowers.size} dashboard followers, using cached data!`)
        
        const followers = dashboardFollowers.docs.map(doc => doc.data())
        
        // Store in export location
        await adminDb.collection('follower_database').doc(cleanUsername).set({
          followerCount: followers.length,
          lastExtractedAt: new Date(),
          extractedBy: 'dashboard-cache',
          extractionProgress: {
            status: 'complete',
            message: 'Ready to download!',
            percentage: 100,
            completedAt: new Date()
          }
        }, { merge: true })
        
        // Store in subcollection with sanitized usernames
        const followersRef = adminDb.collection('follower_database').doc(cleanUsername).collection('followers')
        const batchSize = 500
        
        for (let i = 0; i < followers.length; i += batchSize) {
          const batch = adminDb.batch()
          const chunk = followers.slice(i, i + batchSize)
          
          chunk.forEach((follower: any) => {
            const sanitized = sanitizeUsername(follower.username)
            const docRef = followersRef.doc(sanitized)
            batch.set(docRef, follower)
          })
          
          await batch.commit()
        }
        
        console.log(`[Extraction API] SUCCESS - Used dashboard cache (${followers.length} followers)`)
        
        return NextResponse.json({
          success: true,
          followerCount: followers.length,
          cached: true,
          message: `Ready! ${followers.length} followers from cache (no changes detected)`
        })
      } else {
        console.log(`[Extraction API] No dashboard data found, will extract fresh`)
      }
    } else if (needsExtraction) {
      console.log(`[Extraction API] New followers detected - extracting fresh to get latest ${followerDbDoc.data()?.followerCount || 'all'} followers`)
    }
    
    // Check if extraction already in progress
    const existing = await adminDb.collection('follower_database').doc(cleanUsername).get()
    const data = existing.data()
    
    if (data?.extractionProgress?.status === 'extracting') {
      console.log(`[Extraction API] Already extracting @${cleanUsername}`)
      return NextResponse.json({ 
        message: 'Extraction already in progress',
        status: data.extractionProgress 
      })
    }
    
    // Check if already complete
    if (data?.extractionProgress?.status === 'complete') {
      console.log(`[Extraction API] Already complete for @${cleanUsername}`)
      return NextResponse.json({ 
        message: 'Extraction already complete',
        followerCount: data.followerCount,
        status: 'complete'
      })
    }
    
    // Set starting state
    await adminDb.collection('follower_database').doc(cleanUsername).set({
      extractionProgress: {
        status: 'starting',
        message: 'Starting extraction...',
        percentage: 0,
        startedAt: new Date()
      },
      username: cleanUsername
    }, { merge: true })
    
    console.log(`[Extraction API] Running actor for @${cleanUsername}...`)
    
    // Import and run actor
    const { getDataProvider } = await import('@/lib/data-provider')
    const provider = getDataProvider()
    
    // Update to extracting
    await adminDb.collection('follower_database').doc(cleanUsername).set({
      extractionProgress: {
        status: 'extracting',
        message: 'Extracting followers from X...',
        percentage: 25
      }
    }, { merge: true })
    
    const startTime = Date.now()
    
    // ACTUALLY RUN THE ACTOR
    const result = await provider.getFollowers(cleanUsername, {
      maxFollowers: 10000,
      includeDetails: true
    })
    
    const duration = Math.round((Date.now() - startTime) / 1000)
    
    console.log(`[Extraction API] Actor finished - success: ${result.success}, followers: ${result.followers?.length || 0}, duration: ${duration}s`)
    
    if (!result.success || !result.followers || result.followers.length === 0) {
      await adminDb.collection('follower_database').doc(cleanUsername).set({
        error: result.error || 'No followers found',
        extractionFailed: true,
        extractionProgress: {
          status: 'failed',
          message: result.error || 'Extraction failed',
          percentage: 0
        }
      }, { merge: true })
      
      return NextResponse.json({ 
        error: result.error || 'No followers found',
        success: false
      }, { status: 500 })
    }
    
    // Clean followers
    const cleanFollowers = result.followers.map((f: any) => ({
      username: f.username || '',
      name: f.name || '',
      bio: f.bio || '',
      verified: f.verified || false,
      followersCount: f.followersCount || 0,
      followingCount: f.followingCount || 0,
      profileImageUrl: f.profileImageUrl || '',
      location: f.location || ''
    }))
    
    // DETECT CHANGES: Compare with previous extraction
    let unfollows: any[] = []
    let newFollows: any[] = []
    
    // Get existing data to compare
    const existingDoc = await adminDb.collection('follower_database').doc(cleanUsername).get()
    
    if (existingDoc.exists) {
      const oldData = existingDoc.data()!
      
      // Get old followers from subcollection
      const oldFollowersSnapshot = await adminDb
        .collection('follower_database')
        .doc(cleanUsername)
        .collection('followers')
        .get()
      
      if (!oldFollowersSnapshot.empty) {
        const oldFollowers = new Map(
          oldFollowersSnapshot.docs.map(doc => [sanitizeUsername(doc.data().username), doc.data()])
        )
        const newFollowersSet = new Set(cleanFollowers.map((f: any) => sanitizeUsername(f.username)))
        
        // Detect unfollows (in old but not in new)
        oldFollowers.forEach((followerData, username) => {
          if (!newFollowersSet.has(username)) {
            unfollows.push({
              username: followerData.username,
              name: followerData.name,
              followersCount: followerData.followersCount,
              unfollowedAt: new Date()
            })
          }
        })
        
        // Detect new follows (in new but not in old)
        cleanFollowers.forEach((follower: any) => {
          const sanitized = sanitizeUsername(follower.username)
          if (!oldFollowers.has(sanitized)) {
            newFollows.push({
              username: follower.username,
              name: follower.name,
              followersCount: follower.followersCount,
              followedAt: new Date()
            })
          }
        })
        
        console.log(`[Extraction API] Changes detected: ${newFollows.length} new followers, ${unfollows.length} unfollows`)
      }
    }
    
    console.log(`[Extraction API] Storing ${cleanFollowers.length} followers in subcollection...`)
    
    // Store changes in a separate collection for analytics
    if (unfollows.length > 0 || newFollows.length > 0) {
      const changeRef = await adminDb.collection('follower_changes').add({
        username: cleanUsername,
        extractedAt: new Date(),
        newFollows: newFollows,
        unfollows: unfollows,
        newFollowsCount: newFollows.length,
        unfollowsCount: unfollows.length,
        netChange: newFollows.length - unfollows.length
      })
      
      console.log(`[Extraction API] Stored follower changes: ${changeRef.id}`)
    }
    
    // Store metadata in main document (NO followers array - avoid 1MB limit!)
    await adminDb.collection('follower_database').doc(cleanUsername).set({
      followerCount: cleanFollowers.length,
      lastExtractedAt: new Date(),
      extractedBy: 'extraction-api',
      extractionProgress: {
        status: 'complete',
        message: 'Extraction complete!',
        percentage: 100,
        completedAt: new Date()
      },
      lastChanges: {
        newFollows: newFollows.length,
        unfollows: unfollows.length,
        netChange: newFollows.length - unfollows.length,
        detectedAt: new Date()
      }
    }, { merge: true })
    
    // Store followers in SUBCOLLECTION (no size limit!)
    const followersRef = adminDb.collection('follower_database').doc(cleanUsername).collection('followers')
    
    // Batch write followers (500 per batch - Firestore limit)
    const batchSize = 500
    for (let i = 0; i < cleanFollowers.length; i += batchSize) {
      const batch = adminDb.batch()
      const chunk = cleanFollowers.slice(i, i + batchSize)
      
      chunk.forEach((follower: any) => {
        const sanitized = sanitizeUsername(follower.username)
        const docRef = followersRef.doc(sanitized)
        batch.set(docRef, follower)
      })
      
      await batch.commit()
      console.log(`[Extraction API] Stored batch ${Math.floor(i / batchSize) + 1} (${chunk.length} followers)`)
    }
    
    console.log(`[Extraction API] SUCCESS - Stored ${cleanFollowers.length} followers in subcollection for @${cleanUsername}`)
    
    // Send email
    const customerEmail = data?.customerEmail
    if (customerEmail && customerEmail !== 'no-email') {
      try {
        const { Resend } = await import('resend')
        const resend = new Resend(process.env.RESEND_API_KEY)
        
        const downloadUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://followlytics-zeta.vercel.app'}/export/success?username=${cleanUsername}&session_id=email_access`
        
        await resend.emails.send({
          from: 'Followlytics <notifications@followlytics.io>',
          to: customerEmail,
          subject: `✅ Your ${cleanFollowers.length} Followers Are Ready!`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h1 style="color: #1DA1F2;">🎉 Your Follower Export is Ready!</h1>
              <p>Great news! We've successfully extracted <strong>${cleanFollowers.length} followers</strong> from <strong>@${cleanUsername}</strong>.</p>
              <div style="background: #f5f8fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="margin-top: 0;">📊 What You Get:</h3>
                <ul>
                  <li><strong>${cleanFollowers.length} followers</strong> with complete profile data</li>
                  <li>CSV format (Excel-ready)</li>
                  <li>JSON format (developer-friendly)</li>
                  <li>Excel format (.xlsx)</li>
                </ul>
              </div>
              <a href="${downloadUrl}" style="display: inline-block; background: #1DA1F2; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; margin: 20px 0;">
                Download Your Followers
              </a>
              <p style="color: #657786; font-size: 14px;">This link will remain active for 30 days.</p>
              <hr style="border: none; border-top: 1px solid #e1e8ed; margin: 30px 0;">
              <p style="color: #657786; font-size: 12px;">
                Questions? Reply to this email or visit our help center.<br>
                Thanks for using Followlytics!
              </p>
            </div>
          `
        })
        
        console.log(`[Extraction API] Email sent to ${customerEmail}`)
      } catch (emailError: any) {
        console.error(`[Extraction API] Email failed:`, emailError)
      }
    }
    
    return NextResponse.json({
      success: true,
      followerCount: cleanFollowers.length,
      duration,
      changes: {
        newFollows: newFollows.length,
        unfollows: unfollows.length,
        netChange: newFollows.length - unfollows.length,
        newFollowersList: newFollows.slice(0, 10), // Show first 10
        unfollowsList: unfollows.slice(0, 10) // Show first 10
      },
      message: unfollows.length > 0 || newFollows.length > 0
        ? `Extracted ${cleanFollowers.length} followers (+${newFollows.length} new, -${unfollows.length} unfollowed) in ${duration}s`
        : `Extracted ${cleanFollowers.length} followers in ${duration}s`
    })
    
  } catch (error: any) {
    console.error('[Extraction API] Error:', error)
    return NextResponse.json({ 
      error: error.message,
      success: false
    }, { status: 500 })
  }
}
