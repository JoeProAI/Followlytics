import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase-admin'

export const maxDuration = 300 // 5 minutes

/**
 * Verify and enrich followers using apidojo/tweet-scraper
 * This actor provides reliable verification status + full profile data
 */
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const idToken = authHeader.split('Bearer ')[1]
    const decodedToken = await adminAuth.verifyIdToken(idToken)
    const userId = decodedToken.uid

    const { usernames } = await request.json()

    if (!usernames || !Array.isArray(usernames) || usernames.length === 0) {
      return NextResponse.json({ error: 'Please provide usernames array' }, { status: 400 })
    }

    const APIFY_API_TOKEN = process.env.APIFY_API_TOKEN
    if (!APIFY_API_TOKEN) {
      return NextResponse.json({ error: 'Apify API token not configured' }, { status: 500 })
    }

    console.log(`[Verify & Enrich] Checking ${usernames.length} users with apidojo/tweet-scraper`)

    // Start Apify actor - apidojo/tweet-scraper
    const actorInput = {
      twitterHandles: usernames,
      maxItems: usernames.length, // Get at least 1 tweet per user to get author data
      onlyVerifiedUsers: false // We want all users to check their verification status
    }

    console.log('[Verify & Enrich] Starting Apify actor...')
    const runResponse = await fetch(
      `https://api.apify.com/v2/acts/apidojo~tweet-scraper/runs?token=${APIFY_API_TOKEN}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(actorInput)
      }
    )

    if (!runResponse.ok) {
      const error = await runResponse.text()
      console.error('[Verify & Enrich] Failed to start actor:', error)
      return NextResponse.json({ error: 'Failed to start verification' }, { status: 500 })
    }

    const runData = await runResponse.json()
    const runId = runData.data.id
    const defaultDatasetId = runData.data.defaultDatasetId

    console.log(`[Verify & Enrich] Actor started, run ID: ${runId}`)

    // Wait for completion (poll every 3 seconds)
    let status = 'RUNNING'
    let attempts = 0
    const maxAttempts = 60 // 3 minutes max

    while (status === 'RUNNING' && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 3000))
      
      const statusResponse = await fetch(
        `https://api.apify.com/v2/acts/apidojo~tweet-scraper/runs/${runId}?token=${APIFY_API_TOKEN}`
      )
      const statusData = await statusResponse.json()
      status = statusData.data.status
      attempts++
      
      console.log(`[Verify & Enrich] Status: ${status}, Attempt: ${attempts}/${maxAttempts}`)
    }

    if (status !== 'SUCCEEDED') {
      console.error('[Verify & Enrich] Actor failed or timed out:', status)
      return NextResponse.json({ 
        error: 'Verification timed out or failed',
        status 
      }, { status: 500 })
    }

    // Fetch results
    console.log(`[Verify & Enrich] Fetching results from dataset: ${defaultDatasetId}`)
    const datasetResponse = await fetch(
      `https://api.apify.com/v2/datasets/${defaultDatasetId}/items?token=${APIFY_API_TOKEN}`
    )

    const tweets = await datasetResponse.json()
    console.log(`[Verify & Enrich] Got ${tweets.length} tweets from ${usernames.length} users`)

    // Log first tweet structure for debugging
    if (tweets.length > 0) {
      console.log('[Verify & Enrich] Sample tweet structure:', JSON.stringify(tweets[0], null, 2))
    }

    // Extract unique users from tweets (each tweet has author data)
    const userMap = new Map()
    
    for (const tweet of tweets) {
      const author = tweet.author
      if (!author || !author.userName) continue

      const username = author.userName.toLowerCase()
      
      // If we haven't seen this user yet, add them
      if (!userMap.has(username)) {
        userMap.set(username, {
          username: author.userName,
          name: author.name,
          verified: author.isVerified || false,
          is_blue_verified: author.isBlueVerified || false,
          followers_count: author.followers || 0,
          following_count: author.following || 0,
          tweet_count: author.statusesCount || 0,
          bio: author.description || '',
          location: author.location || '',
          profile_image_url: author.profileImageUrl || '',
          created_at: author.createdAt || '',
          url: author.url || '',
          verified_type: author.isVerified ? 'legacy' : (author.isBlueVerified ? 'blue' : null)
        })

        console.log(`[Verify & Enrich] User @${username}: verified=${author.isVerified}, blue=${author.isBlueVerified}`)
      }
    }

    console.log(`[Verify & Enrich] Extracted ${userMap.size} unique users`)

    // Update Firestore
    const batch = adminDb.batch()
    let checkedCount = 0
    let verifiedCount = 0
    let enrichedCount = 0

    for (const [username, userData] of userMap.entries()) {
      // Find follower document
      const followersSnapshot = await adminDb
        .collection('users')
        .doc(userId)
        .collection('followers')
        .where('username', '==', username)
        .limit(1)
        .get()

      if (followersSnapshot.empty) {
        console.log(`[Verify & Enrich] User @${username} not found in followers`)
        continue
      }

      const followerDoc = followersSnapshot.docs[0]
      const updates: any = {
        verified: userData.verified || userData.is_blue_verified,
        verified_type: userData.verified_type,
        is_blue_verified: userData.is_blue_verified,
        verified_checked_at: new Date().toISOString()
      }

      // Enrich with updated data
      if (userData.followers_count) updates.followers_count = userData.followers_count
      if (userData.following_count) updates.following_count = userData.following_count
      if (userData.tweet_count) updates.tweet_count = userData.tweet_count
      if (userData.bio) updates.bio = userData.bio
      if (userData.location) updates.location = userData.location
      if (userData.profile_image_url) updates.profile_image_url = userData.profile_image_url

      batch.update(followerDoc.ref, updates)
      
      checkedCount++
      enrichedCount++
      if (updates.verified) {
        verifiedCount++
        console.log(`[Verify & Enrich] ✓ VERIFIED: @${username} (${userData.verified_type})`)
      }
    }

    // Commit batch
    await batch.commit()
    console.log(`[Verify & Enrich] Updated ${checkedCount} users in Firestore`)

    return NextResponse.json({
      success: true,
      checked: checkedCount,
      verified: verifiedCount,
      enriched: enrichedCount,
      total_requested: usernames.length,
      message: `✅ Verified & enriched ${checkedCount} followers. ${verifiedCount} verified!`
    })

  } catch (error) {
    console.error('[Verify & Enrich] Error:', error)
    return NextResponse.json(
      { 
        error: 'Verification failed', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    )
  }
}
