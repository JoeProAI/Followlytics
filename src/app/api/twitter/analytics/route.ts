import { NextRequest, NextResponse } from 'next/server'
import * as admin from 'firebase-admin'

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  const privateKey = process.env.FIREBASE_ADMIN_SDK_KEY?.replace(/\\n/g, '\n')
  
  if (!privateKey) {
    throw new Error('Firebase Admin SDK private key is not configured')
  }

  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "followlytics-cd4e1",
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL || "firebase-adminsdk-fbsvc@followlytics-cd4e1.iam.gserviceaccount.com",
      privateKey: privateKey,
    }),
  })
}

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const days = parseInt(searchParams.get('days') || '30')

    // Get user from Firebase token
    const token = request.cookies.get('firebase_token')?.value
    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const decodedToken = await admin.auth().verifyIdToken(token)
    const userId = decodedToken.uid

    // Get user data from Firestore
    const db = admin.firestore()
    const userDoc = await db.collection('users').doc(userId).get()
    
    if (!userDoc.exists) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const userData = userDoc.data()
    const twitterUserId = userData?.twitter_id

    if (!twitterUserId) {
      return NextResponse.json({ error: 'Twitter user ID not found' }, { status: 400 })
    }

    // Calculate date range
    const endDate = new Date()
    const startDate = new Date(endDate.getTime() - (days * 24 * 60 * 60 * 1000))

    // Get follower snapshots for the date range
    const snapshotsQuery = await db
      .collection('follower_snapshots')
      .where('user_id', '==', userId)
      .where('twitter_user_id', '==', twitterUserId)
      .where('timestamp', '>=', admin.firestore.Timestamp.fromDate(startDate))
      .where('timestamp', '<=', admin.firestore.Timestamp.fromDate(endDate))
      .orderBy('timestamp', 'asc')
      .get()

    // Get unfollower events for the date range
    const unfollowersQuery = await db
      .collection('unfollower_events')
      .where('user_id', '==', userId)
      .where('twitter_user_id', '==', twitterUserId)
      .where('detected_at', '>=', admin.firestore.Timestamp.fromDate(startDate))
      .where('detected_at', '<=', admin.firestore.Timestamp.fromDate(endDate))
      .orderBy('detected_at', 'desc')
      .get()

    // Process follower count over time
    const followerHistory = snapshotsQuery.docs.map(doc => {
      const data = doc.data()
      return {
        date: data.timestamp?.toDate?.()?.toISOString()?.split('T')[0],
        followers: data.follower_count || 0,
        timestamp: data.timestamp?.toDate?.()?.toISOString()
      }
    })

    // Process unfollower events
    const unfollowerEvents = unfollowersQuery.docs.map(doc => {
      const data = doc.data()
      return {
        id: data.unfollower_id,
        username: data.unfollower_username,
        name: data.unfollower_name,
        profile_image_url: data.unfollower_profile_image,
        unfollowed_at: data.unfollowed_at?.toDate?.()?.toISOString(),
        detected_at: data.detected_at?.toDate?.()?.toISOString()
      }
    })

    // Calculate daily unfollower counts
    const dailyUnfollowers: Record<string, number> = {}
    unfollowerEvents.forEach(event => {
      if (event.detected_at) {
        const date = event.detected_at.split('T')[0]
        dailyUnfollowers[date] = (dailyUnfollowers[date] || 0) + 1
      }
    })

    // Calculate analytics
    const currentFollowers = followerHistory.length > 0 ? followerHistory[followerHistory.length - 1].followers : 0
    const previousFollowers = followerHistory.length > 1 ? followerHistory[0].followers : currentFollowers
    const totalUnfollowers = unfollowerEvents.length
    const netGrowth = currentFollowers - previousFollowers
    const growthRate = previousFollowers > 0 ? ((netGrowth / previousFollowers) * 100) : 0

    // Get recent unfollowers (last 7 days)
    const sevenDaysAgo = new Date(Date.now() - (7 * 24 * 60 * 60 * 1000))
    const recentUnfollowers = unfollowerEvents.filter(event => 
      event.detected_at && new Date(event.detected_at) >= sevenDaysAgo
    )

    return NextResponse.json({
      summary: {
        current_followers: currentFollowers,
        total_unfollowers: totalUnfollowers,
        net_growth: netGrowth,
        growth_rate: Math.round(growthRate * 100) / 100,
        period_days: days
      },
      follower_history: followerHistory,
      daily_unfollowers: Object.entries(dailyUnfollowers).map(([date, count]) => ({
        date,
        unfollowers: count
      })),
      recent_unfollowers: recentUnfollowers.slice(0, 10), // Last 10 recent unfollowers
      trends: {
        avg_daily_unfollowers: Math.round((totalUnfollowers / days) * 100) / 100,
        peak_unfollower_day: Object.entries(dailyUnfollowers).reduce(
          (max, [date, count]) => count > max.count ? { date, count } : max,
          { date: '', count: 0 }
        )
      }
    })

  } catch (error) {
    console.error('Analytics API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
