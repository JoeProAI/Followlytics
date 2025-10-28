import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase-admin'
import { getUserSubscription } from '@/lib/subscription'
import { getFollowerLimitForTier } from '@/lib/follower-usage'

const MAX_REQUEST_FOLLOWERS = 200_000
const MIN_REQUEST_FOLLOWERS = 1

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

    const body = await request.json()
    const username = (body.username || '').toString().trim()
    const rawMaxFollowers = Number(body.maxFollowers ?? 1000)
    const requestedFollowers = Math.max(
      MIN_REQUEST_FOLLOWERS,
      Math.min(Number.isNaN(rawMaxFollowers) ? 1000 : Math.floor(rawMaxFollowers), MAX_REQUEST_FOLLOWERS)
    )

    if (!username) {
      return NextResponse.json({ error: 'Username required' }, { status: 400 })
    }

    console.log(`[Apify] Extracting followers for @${username}, requested: ${requestedFollowers}`)

    // Initialize Apify client
    const APIFY_API_TOKEN = process.env.APIFY_API_TOKEN
    if (!APIFY_API_TOKEN) {
      return NextResponse.json({ error: 'Apify not configured' }, { status: 500 })
    }

    const subscription = await getUserSubscription(userId)
    const { tierKey: tier, limit: limitForTier } = getFollowerLimitForTier(subscription.tier)
    const limitIsUnlimited = limitForTier === null

    const now = new Date()
    const month = now.getMonth() + 1
    const year = now.getFullYear()

    const usageRef = adminDb
      .collection('users')
      .doc(userId)
      .collection('usage')
      .doc('current_month')

    const usageSnapshot = await usageRef.get()
    let usageData = usageSnapshot.exists ? usageSnapshot.data() : null

    if (!usageData || usageData.month !== month || usageData.year !== year) {
      usageData = {
        month,
        year,
        followers_extracted: 0,
        extractions_count: 0,
        last_reset: now.toISOString(),
        last_extraction: null,
        tier
      }
    } else {
      usageData = {
        ...usageData,
        tier
      }
    }

    const usedThisMonth = usageData.followers_extracted || 0
    const remainingFollowers = limitIsUnlimited
      ? Number.POSITIVE_INFINITY
      : Math.max((limitForTier || 0) - usedThisMonth, 0)

    if (!limitIsUnlimited && remainingFollowers <= 0) {
      await usageRef.set(usageData, { merge: true })
      return NextResponse.json({
        error: 'Monthly follower limit reached. Upgrade your plan to extract more followers.',
        usage: {
          ...usageData,
          followers_extracted: usedThisMonth,
          limit: limitForTier,
          remaining: 0
        }
      }, { status: 429 })
    }

    if (!limitIsUnlimited && requestedFollowers > remainingFollowers) {
      await usageRef.set(usageData, { merge: true })
      return NextResponse.json({
        error: `Request exceeds monthly limit. You can extract ${remainingFollowers.toLocaleString()} more followers this month.`,
        usage: {
          ...usageData,
          followers_extracted: usedThisMonth,
          limit: limitForTier,
          remaining: remainingFollowers
        }
      }, { status: 429 })
    }

    // Call Apify Actor
    const runInput = {
      user_names: [username],
      user_ids: [],
      maxFollowers: Math.max(requestedFollowers, 200), // Minimum 200 required by API
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

    const followersToPersist = processedFollowers.slice(
      0,
      Math.min(processedFollowers.length, requestedFollowers)
    )
    const truncatedResults = followersToPersist.length < processedFollowers.length

    // Track current follower usernames
    const currentFollowerUsernames = new Set(
      followersToPersist.map((f: any) => 
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

    const nowIso = now.toISOString()

    followersToPersist.forEach((follower: any) => {
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
        last_seen: nowIso,
        status: 'active',
        first_seen: existing?.first_seen || nowIso
      }

      batch.set(docRef, followerData, { merge: true })
    })

    // Mark unfollowers (existed before but not in current extraction)
    // IMPORTANT: Only detect unfollows if we extracted a SIGNIFICANT portion of followers
    // Otherwise we get false positives (people who are still following but weren't in this extraction)
    const totalStoredFollowers = existingFollowers.size
    const extractionCoverage = totalStoredFollowers > 0 
      ? (followersToPersist.length / totalStoredFollowers) 
      : 1
    
    // Only mark unfollowers if we extracted at least 80% of known followers
    // This prevents false positives from partial extractions
    const shouldDetectUnfollows = !truncatedResults && extractionCoverage >= 0.8
    
    if (shouldDetectUnfollows) {
      console.log(`[Apify] Unfollower detection enabled (${Math.round(extractionCoverage * 100)}% coverage)`)
      existingFollowers.forEach((data, username) => {
        if (!currentFollowerUsernames.has(username) && data.status !== 'unfollowed') {
          const docRef = followerCollectionRef.doc(username)
          batch.update(docRef, {
            status: 'unfollowed',
            last_seen: nowIso
          })
        }
      })
    } else {
      console.log(`[Apify] Unfollower detection skipped (${Math.round(extractionCoverage * 100)}% coverage, need 80%+)`)
    }

    await batch.commit()

    // Update user's metadata
    const isFirstExtraction = existingFollowers.size === 0
    const updateData: any = {
      last_follower_extraction: new Date().toISOString(),
      total_followers_extracted: followersToPersist.length,
      target_username: username
    }
    
    // Track first extraction date for analytics
    if (isFirstExtraction) {
      updateData.first_follower_extraction = new Date().toISOString()
    }
    
    await adminDb.collection('users').doc(userId).update(updateData)

    console.log(`[Apify] Saved ${followersToPersist.length} followers to Firestore`)

    // Calculate cost
    const cost = (followersToPersist.length / 1000) * 0.15

    // Calculate stats
    const verifiedCount = followersToPersist.filter((f: any) => f.verified).length
    const followersWithBio = followersToPersist.filter((f: any) => f.bio && f.bio.trim().length > 0).length
    const avgFollowers = followersToPersist.length > 0 
      ? Math.round(followersToPersist.reduce((sum: number, f: any) => sum + (f.followers_count || 0), 0) / followersToPersist.length)
      : 0

    const stats = {
      verified: verifiedCount,
      withBio: followersToPersist.length > 0 ? Math.round((followersWithBio / followersToPersist.length) * 100) : 0,
      avgFollowers: avgFollowers
    }

    // Return ALL followers (up to 1000) for display and export
    const sample = followersToPersist.slice(0, 1000).map((f: any) => ({
      username: f.username,
      name: f.name,
      bio: f.bio,
      verified: f.verified,
      followersCount: f.followers_count,
      profileImage: f.profile_image_url,
      location: f.location
    }))

    const usageSummary = await adminDb.runTransaction(async transaction => {
      const snapshot = await transaction.get(usageRef)
      const existingUsage: any = snapshot.exists ? snapshot.data() : {}
      let followersExtracted = existingUsage?.followers_extracted || 0
      let extractionsCount = existingUsage?.extractions_count || 0
      let lastReset = existingUsage?.last_reset as string | undefined

      if (!snapshot.exists || existingUsage?.month !== month || existingUsage?.year !== year) {
        followersExtracted = 0
        extractionsCount = 0
        lastReset = nowIso
      }

      followersExtracted += followersToPersist.length
      extractionsCount += 1

      const updatedUsage = {
        month,
        year,
        tier,
        followers_extracted: followersExtracted,
        extractions_count: extractionsCount,
        last_reset: lastReset || nowIso,
        last_extraction: nowIso
      }

      transaction.set(usageRef, updatedUsage, { merge: true })

      return {
        ...updatedUsage,
        limit: limitIsUnlimited ? null : limitForTier,
        remaining: limitIsUnlimited
          ? null
          : Math.max((limitForTier || 0) - followersExtracted, 0)
      }
    })

    return NextResponse.json({
      success: true,
      count: followersToPersist.length,
      username: username,
      cost: cost.toFixed(4),
      stats: stats,
      sample: sample,
      runId: runId,
      datasetId: defaultDatasetId,
      usage: usageSummary
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

