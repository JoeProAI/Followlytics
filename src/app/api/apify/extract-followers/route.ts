import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase-admin'

export const maxDuration = 300 // 5 minutes

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const idToken = authHeader.split('Bearer ')[1]
    const decodedToken = await adminAuth.verifyIdToken(idToken)
    const userId = decodedToken.uid

    const { username, maxFollowers = 1000 } = await request.json()

    if (!username) {
      return NextResponse.json({ error: 'Username required' }, { status: 400 })
    }

    console.log(`[Apify] Extracting followers for @${username}, max: ${maxFollowers}`)

    // Initialize Apify client
    const APIFY_API_TOKEN = process.env.APIFY_API_TOKEN
    if (!APIFY_API_TOKEN) {
      return NextResponse.json({ error: 'Apify not configured' }, { status: 500 })
    }

    // Call Apify Actor
    const runInput = {
      user_names: [username],
      user_ids: [],
      maxFollowers: Math.max(maxFollowers, 200), // Minimum 200 required by API
      maxFollowings: 200, // Minimum 200 required by API (we won't use this data)
      getFollowers: true,
      getFollowing: false, // We won't use following data even though we have to set min 200
    }

    console.log('[Apify] Starting Actor run...')
    const startResponse = await fetch(
      `https://api.apify.com/v2/acts/kaitoeasyapi~premium-x-follower-scraper-following-data/runs?token=${APIFY_API_TOKEN}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(runInput)
      }
    )

    if (!startResponse.ok) {
      throw new Error(`Apify API error: ${startResponse.status}`)
    }

    const runData = await startResponse.json()
    const runId = runData.data.id
    const defaultDatasetId = runData.data.defaultDatasetId

    console.log(`[Apify] Actor run started: ${runId}`)

    // Wait for the run to finish (poll status)
    let status = 'RUNNING'
    let attempts = 0
    const maxAttempts = 60 // 5 minutes max (5s intervals)

    while (status === 'RUNNING' && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 5000)) // Wait 5 seconds
      
      const statusResponse = await fetch(
        `https://api.apify.com/v2/acts/kaitoeasyapi~premium-x-follower-scraper-following-data/runs/${runId}?token=${APIFY_API_TOKEN}`
      )

      const statusData = await statusResponse.json()
      status = statusData.data.status
      attempts++

      console.log(`[Apify] Status check ${attempts}: ${status}`)
    }

    if (status !== 'SUCCEEDED') {
      return NextResponse.json({ 
        error: `Extraction failed or timed out. Status: ${status}`,
        runId 
      }, { status: 500 })
    }

    // Fetch results from dataset
    console.log(`[Apify] Fetching results from dataset: ${defaultDatasetId}`)
    const datasetResponse = await fetch(
      `https://api.apify.com/v2/datasets/${defaultDatasetId}/items?token=${APIFY_API_TOKEN}`
    )

    const followers = await datasetResponse.json()

    console.log(`[Apify] Extracted ${followers.length} followers`)

    // Get existing followers to detect unfollows
    const existingFollowersSnapshot = await adminDb
      .collection('users')
      .doc(userId)
      .collection('followers')
      .get()

    const existingFollowers = new Map(
      existingFollowersSnapshot.docs.map(doc => [doc.id, doc.data()])
    )

    // Process and save to Firestore
    const processedFollowers = followers.map((follower: any) => ({
      username: follower.screen_name || follower.username,
      name: follower.name,
      bio: follower.description,
      followers_count: follower.followers_count,
      following_count: follower.friends_count,
      tweet_count: follower.statuses_count,
      verified: follower.verified || false,
      profile_image_url: follower.profile_image_url_https,
      location: follower.location,
      created_at: follower.created_at,
      url: follower.url,
      extracted_at: new Date().toISOString()
    }))

    // Track current follower usernames
    const currentFollowerUsernames = new Set(
      processedFollowers.map((f: any) => 
        f.username
          .replace(/^_+|_+$/g, '')
          .replace(/\//g, '_')
          .replace(/\./g, '_') || 'unknown_user'
      )
    )

    // Save to Firestore under user's data
    const batch = adminDb.batch()
    const followerCollectionRef = adminDb
      .collection('users')
      .doc(userId)
      .collection('followers')

    const now = new Date().toISOString()

    processedFollowers.forEach((follower: any) => {
      // Sanitize username for Firestore (no leading/trailing __, no /, etc)
      const sanitizedUsername = follower.username
        .replace(/^_+|_+$/g, '') // Remove leading/trailing underscores
        .replace(/\//g, '_') // Replace slashes with underscores
        .replace(/\./g, '_') // Replace dots with underscores
        || 'unknown_user' // Fallback if username becomes empty
      
      const docRef = followerCollectionRef.doc(sanitizedUsername)
      const existing = existingFollowers.get(sanitizedUsername)

      // If follower exists, update; if new, mark first_seen
      const followerData = {
        ...follower,
        last_seen: now,
        status: 'active',
        first_seen: existing?.first_seen || now
      }

      batch.set(docRef, followerData, { merge: true })
    })

    // Mark unfollowers (existed before but not in current extraction)
    existingFollowers.forEach((data, username) => {
      if (!currentFollowerUsernames.has(username) && data.status !== 'unfollowed') {
        const docRef = followerCollectionRef.doc(username)
        batch.update(docRef, {
          status: 'unfollowed',
          last_seen: now
        })
      }
    })

    await batch.commit()

    // Update user's metadata
    await adminDb.collection('users').doc(userId).update({
      last_follower_extraction: new Date().toISOString(),
      total_followers_extracted: processedFollowers.length,
      target_username: username
    })

    console.log(`[Apify] ✅ Saved ${processedFollowers.length} followers to Firestore`)

    // Calculate cost
    const cost = (processedFollowers.length / 1000) * 0.15

    // Calculate stats
    const verifiedCount = processedFollowers.filter((f: any) => f.verified).length
    const followersWithBio = processedFollowers.filter((f: any) => f.bio && f.bio.trim().length > 0).length
    const avgFollowers = processedFollowers.length > 0 
      ? Math.round(processedFollowers.reduce((sum: number, f: any) => sum + (f.followers_count || 0), 0) / processedFollowers.length)
      : 0

    const stats = {
      verified: verifiedCount,
      withBio: Math.round((followersWithBio / processedFollowers.length) * 100),
      avgFollowers: avgFollowers
    }

    // Return ALL followers (up to 1000) for display and export
    const sample = processedFollowers.slice(0, 1000).map((f: any) => ({
      username: f.username,
      name: f.name,
      bio: f.bio,
      verified: f.verified,
      followersCount: f.followers_count,
      profileImage: f.profile_image_url,
      location: f.location
    }))

    return NextResponse.json({
      success: true,
      count: processedFollowers.length,
      username: username,
      cost: cost.toFixed(4),
      stats: stats,
      sample: sample,
      runId: runId,
      datasetId: defaultDatasetId
    })

  } catch (error: any) {
    console.error('[Apify] Error:', error)
    console.error('[Apify] Error stack:', error.stack)
    return NextResponse.json({
      error: 'Failed to extract followers',
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}
