import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase-admin'

/**
 * Unfollower Intelligence API
 * Tracks all unfollows, re-follows, and patterns
 */
export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const idToken = authHeader.split('Bearer ')[1]
    const decodedToken = await adminAuth.verifyIdToken(idToken)
    const userId = decodedToken.uid

    console.log(`[Unfollowers] Loading analytics for user: ${userId}`)

    // Get user's tracked account (their own username)
    const userDoc = await adminDb.collection('users').doc(userId).get()
    const userData = userDoc.data()
    const targetUsername = userData?.target_username?.toLowerCase() || null

    if (!targetUsername) {
      return NextResponse.json({
        success: true,
        stats: {
          totalUnfollows: 0,
          totalRefollows: 0,
          netLoss: 0,
          currentUnfollowers: 0,
          serialUnfollowers: 0,
          unfollowsLast24h: 0,
          unfollowsLast7d: 0,
          unfollowsLast30d: 0
        },
        currentUnfollowers: [],
        recentUnfollows: [],
        recentRefollows: [],
        patterns: {
          serialUnfollowers: [],
          loyalRefollowers: [],
          quickUnfollowers: []
        },
        allEvents: [],
        message: 'No follower data yet. Extract followers first to start tracking unfollows.'
      })
    }

    // Get all unfollower events for this target account
    const eventsSnapshot = await adminDb
      .collection('users')
      .doc(userId)
      .collection('unfollower_events')
      .where('target_username', '==', targetUsername)
      .orderBy('timestamp', 'desc')
      .limit(1000)
      .get()

    const events = eventsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }))

    // Get current unfollowers (status = 'unfollowed') for this target account
    const currentUnfollowersSnapshot = await adminDb
      .collection('users')
      .doc(userId)
      .collection('followers')
      .where('target_username', '==', targetUsername)
      .where('status', '==', 'unfollowed')
      .get()

    const currentUnfollowers = currentUnfollowersSnapshot.docs.map(doc => ({
      username: doc.id,
      ...doc.data()
    }))

    // Analyze patterns
    const unfollowPatterns = analyzeUnfollowPatterns(events)
    const recentUnfollows = events.filter((e: any) => e.event_type === 'unfollowed').slice(0, 50)
    const recentRefollows = events.filter((e: any) => e.event_type === 'refollowed').slice(0, 50)

    // Calculate metrics
    const totalUnfollows = events.filter((e: any) => e.event_type === 'unfollowed').length
    const totalRefollows = events.filter((e: any) => e.event_type === 'refollowed').length
    const serialUnfollowers = unfollowPatterns.serialUnfollowers.length
    const netLoss = totalUnfollows - totalRefollows

    // Time-based analysis
    const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const last7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    const last30d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

    const unfollowsLast24h = events.filter((e: any) => 
      e.event_type === 'unfollowed' && e.timestamp >= last24h
    ).length

    const unfollowsLast7d = events.filter((e: any) => 
      e.event_type === 'unfollowed' && e.timestamp >= last7d
    ).length

    const unfollowsLast30d = events.filter((e: any) => 
      e.event_type === 'unfollowed' && e.timestamp >= last30d
    ).length

    return NextResponse.json({
      success: true,
      targetUsername,
      stats: {
        totalUnfollows,
        totalRefollows,
        netLoss,
        currentUnfollowers: currentUnfollowers.length,
        serialUnfollowers,
        unfollowsLast24h,
        unfollowsLast7d,
        unfollowsLast30d
      },
      currentUnfollowers: currentUnfollowers.map((u: any) => ({
        username: u.username,
        name: u.name,
        profileImage: u.profile_image_url,
        followersCount: u.followers_count,
        verified: u.verified,
        unfollowedAt: u.last_seen,
        bio: u.bio
      })),
      recentUnfollows: recentUnfollows.map((e: any) => ({
        username: e.username,
        name: e.name,
        profileImage: e.profile_image_url,
        followersCount: e.followers_count,
        verified: e.verified,
        timestamp: e.timestamp,
        bio: e.bio
      })),
      recentRefollows: recentRefollows.map((e: any) => ({
        username: e.username,
        name: e.name,
        profileImage: e.profile_image_url,
        followersCount: e.followers_count,
        verified: e.verified,
        timestamp: e.timestamp,
        previousUnfollowDate: e.previous_unfollow_date
      })),
      patterns: unfollowPatterns,
      allEvents: events.slice(0, 100) // Last 100 events for timeline
    })

  } catch (error: any) {
    console.error('[Unfollowers] Error:', error)
    return NextResponse.json({
      error: 'Failed to load unfollower analytics',
      details: error.message
    }, { status: 500 })
  }
}

/**
 * Analyze unfollow/refollow patterns
 */
function analyzeUnfollowPatterns(events: any[]) {
  const userEvents = new Map<string, any[]>()
  
  // Group events by username
  events.forEach(event => {
    const username = event.username
    if (!userEvents.has(username)) {
      userEvents.set(username, [])
    }
    userEvents.get(username)!.push(event)
  })

  // Find serial unfollowers (unfollowed 2+ times)
  const serialUnfollowers: any[] = []
  const loyalRefollowers: any[] = []
  const quickUnfollowers: any[] = []

  userEvents.forEach((userEventList, username) => {
    const unfollowEvents = userEventList.filter((e: any) => e.event_type === 'unfollowed')
    const refollowEvents = userEventList.filter((e: any) => e.event_type === 'refollowed')

    // Serial unfollower: unfollowed multiple times
    if (unfollowEvents.length >= 2) {
      serialUnfollowers.push({
        username,
        unfollowCount: unfollowEvents.length,
        refollowCount: refollowEvents.length,
        lastUnfollow: unfollowEvents[0]?.timestamp,
        events: userEventList
      })
    }

    // Loyal refollower: refollowed after unfollowing
    if (refollowEvents.length > 0) {
      loyalRefollowers.push({
        username,
        refollowCount: refollowEvents.length,
        lastRefollow: refollowEvents[0]?.timestamp
      })
    }

    // Quick unfollower: unfollowed within 7 days of following
    if (unfollowEvents.length > 0 && refollowEvents.length > 0) {
      const latestRefollow = new Date(refollowEvents[0]?.timestamp).getTime()
      const latestUnfollow = new Date(unfollowEvents[0]?.timestamp).getTime()
      const daysBetween = (latestUnfollow - latestRefollow) / (1000 * 60 * 60 * 24)
      
      if (daysBetween <= 7 && daysBetween >= 0) {
        quickUnfollowers.push({
          username,
          daysBetweenFollowAndUnfollow: Math.round(daysBetween * 10) / 10,
          refollowDate: refollowEvents[0]?.timestamp,
          unfollowDate: unfollowEvents[0]?.timestamp
        })
      }
    }
  })

  return {
    serialUnfollowers: serialUnfollowers.sort((a, b) => b.unfollowCount - a.unfollowCount),
    loyalRefollowers: loyalRefollowers.slice(0, 20),
    quickUnfollowers: quickUnfollowers.sort((a, b) => a.daysBetweenFollowAndUnfollow - b.daysBetweenFollowAndUnfollow).slice(0, 20)
  }
}
