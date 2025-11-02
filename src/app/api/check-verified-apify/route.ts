import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase-admin'

export const maxDuration = 300

/**
 * Check verified status using Apify Twitter scraper
 * No Twitter API needed - scrapes public profiles!
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

    const body = await request.json()
    const { usernames } = body

    if (!usernames || !Array.isArray(usernames)) {
      return NextResponse.json({ error: 'Missing usernames array' }, { status: 400 })
    }

    const APIFY_API_TOKEN = process.env.APIFY_API_TOKEN
    if (!APIFY_API_TOKEN) {
      return NextResponse.json({ error: 'Apify not configured' }, { status: 500 })
    }

    // Process 100 at a time (Apify can handle batches)
    const MAX_PER_REQUEST = 100
    const usernamesToCheck = usernames.slice(0, MAX_PER_REQUEST)
    
    console.log(`[Apify Verify] Checking ${usernamesToCheck.length} of ${usernames.length} users`)

    // Start Apify Actor run
    console.log('[Apify Verify] Starting Apify Actor run...')
    const actorInput = {
      handles: usernamesToCheck,
      tweetsDesired: 0, // Only get profile info, no tweets (FAST!)
      storeUserIfNoTweets: true, // Store user data even without tweets
      includeUserInfo: true,
      proxyConfig: {
        useApifyProxy: true,
        apifyProxyGroups: ['RESIDENTIAL']
      }
    }

    // Run Actor synchronously and get results
    const runResponse = await fetch(
      `https://api.apify.com/v2/acts/web.harvester~twitter-scraper/run-sync-get-dataset-items?token=${APIFY_API_TOKEN}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(actorInput)
      }
    )

    if (!runResponse.ok) {
      const errorText = await runResponse.text()
      console.error('[Apify Verify] Actor run failed:', runResponse.status, errorText)
      throw new Error(`Apify Actor failed: ${runResponse.status}`)
    }

    const profiles = await runResponse.json()
    console.log(`[Apify Verify] Got ${profiles.length} profiles from Apify`)

    // Process results
    const results = []
    let checkedCount = 0
    let verifiedCount = 0

    for (const profile of profiles) {
      // Apify returns user data with verified badge info
      const username = profile.username || profile.handle
      const isVerified = profile.isBlueVerified || profile.verified || false
      
      results.push({
        username,
        verified: isVerified,
        checked: true
      })
      
      checkedCount++
      if (isVerified) verifiedCount++
      
      console.log(`[Apify Verify] @${username}: ${isVerified ? 'VERIFIED ✓' : 'not verified'}`)
    }

    // Add any usernames that weren't returned (failed to scrape)
    const scrapedUsernames = new Set(profiles.map((p: any) => p.username || p.handle))
    for (const username of usernamesToCheck) {
      if (!scrapedUsernames.has(username)) {
        console.log(`[Apify Verify] @${username}: NOT FOUND (suspended/deleted?)`)
        results.push({
          username,
          verified: false,
          checked: false,
          error: 'Profile not found or inaccessible'
        })
      }
    }

    // Update Firestore with verified status
    console.log(`[Apify Verify] Updating Firestore with ${results.length} results`)
    const batch = adminDb.batch()
    const followersRef = adminDb.collection('users').doc(userId).collection('followers')
    
    results.forEach(result => {
      if (result.checked) {
        const sanitizedUsername = result.username
          .replace(/^_+|_+$/g, '')
          .replace(/\//g, '_')
          .replace(/\./g, '_') || 'unknown_user'
        
        const docRef = followersRef.doc(sanitizedUsername)
        batch.set(docRef, {
          verified: result.verified,
          verified_checked_at: new Date().toISOString(),
          verified_method: 'apify_scraper'
        }, { merge: true })
      }
    })

    await batch.commit()

    console.log(`[Apify Verify] ✅ Complete! ${verifiedCount} verified out of ${checkedCount} checked`)

    const hasMore = usernames.length > MAX_PER_REQUEST
    const remaining = usernames.length - MAX_PER_REQUEST

    return NextResponse.json({
      success: true,
      total: results.length,
      checked: checkedCount,
      verified: verifiedCount,
      failed: results.length - checkedCount,
      hasMore,
      remaining: hasMore ? remaining : 0,
      message: hasMore 
        ? `✅ Checked ${checkedCount}/${usernames.length} followers. ${verifiedCount} verified! (${remaining} remaining - click again)`
        : `✅ Checked all ${checkedCount} followers. ${verifiedCount} verified!`
    })

  } catch (error) {
    console.error('[Apify Verify] Error:', error)
    return NextResponse.json(
      { 
        error: 'Verification failed', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    )
  }
}
