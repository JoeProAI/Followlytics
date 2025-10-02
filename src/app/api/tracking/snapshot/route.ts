import { NextRequest, NextResponse } from 'next/server'
import { adminAuth as auth, adminDb as db } from '@/lib/firebase-admin'
import { TwitterApi } from 'twitter-api-v2'

/**
 * Take a snapshot of user's X metrics and store in Firestore
 * Called by cron job every 24 hours
 */
export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.split('Bearer ')[1]
    const decodedToken = await auth.verifyIdToken(token)
    
    if (!decodedToken) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const { username } = await request.json()
    
    if (!username) {
      return NextResponse.json({ error: 'Username is required' }, { status: 400 })
    }

    const cleanUsername = username.replace('@', '').trim()
    
    console.log(`[Snapshot] Taking snapshot for @${cleanUsername}`)

    // Initialize X API
    const client = new TwitterApi(process.env.X_BEARER_TOKEN!)

    // Get user data
    const userResponse = await client.v2.userByUsername(cleanUsername, {
      'user.fields': ['public_metrics', 'created_at', 'description']
    })

    if (!userResponse.data) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const user = userResponse.data

    // Get recent tweets (last 100)
    const tweetsResponse = await client.v2.userTimeline(user.id, {
      max_results: 100,
      exclude: ['retweets', 'replies'],
      'tweet.fields': ['public_metrics', 'created_at']
    })

    const tweets = tweetsResponse.data.data || []

    // Calculate engagement metrics
    const totalLikes = tweets.reduce((sum, t) => sum + (t.public_metrics?.like_count || 0), 0)
    const totalRetweets = tweets.reduce((sum, t) => sum + (t.public_metrics?.retweet_count || 0), 0)
    const totalReplies = tweets.reduce((sum, t) => sum + (t.public_metrics?.reply_count || 0), 0)
    
    const avgEngagement = tweets.length ? 
      Math.round((totalLikes + totalRetweets * 2 + totalReplies) / tweets.length) : 0

    // Create snapshot document
    const snapshot = {
      username: cleanUsername,
      userId: decodedToken.uid,
      timestamp: new Date().toISOString(),
      
      // User metrics
      followers: user.public_metrics?.followers_count || 0,
      following: user.public_metrics?.following_count || 0,
      tweet_count: user.public_metrics?.tweet_count || 0,
      listed_count: user.public_metrics?.listed_count || 0,
      
      // Engagement metrics
      avg_engagement: avgEngagement,
      total_likes: totalLikes,
      total_retweets: totalRetweets,
      total_replies: totalReplies,
      tweets_analyzed: tweets.length,
      
      // Calculated rates
      engagement_rate: user.public_metrics?.followers_count ? 
        ((totalLikes + totalRetweets) / tweets.length / user.public_metrics.followers_count * 100) : 0,
      
      // Store top 5 tweets for analysis
      top_tweets: tweets
        .sort((a, b) => {
          const aEng = (a.public_metrics?.like_count || 0) + (a.public_metrics?.retweet_count || 0) * 2
          const bEng = (b.public_metrics?.like_count || 0) + (b.public_metrics?.retweet_count || 0) * 2
          return bEng - aEng
        })
        .slice(0, 5)
        .map(t => ({
          id: t.id,
          text: t.text,
          likes: t.public_metrics?.like_count || 0,
          retweets: t.public_metrics?.retweet_count || 0,
          replies: t.public_metrics?.reply_count || 0,
          created_at: t.created_at
        }))
    }

    // Store in Firestore
    const snapshotRef = await db.collection('snapshots').add(snapshot)
    
    // Update user's tracking status
    await db.collection('tracking').doc(decodedToken.uid).set({
      username: cleanUsername,
      tracking_enabled: true,
      last_snapshot: new Date().toISOString(),
      snapshot_count: (await db.collection('snapshots')
        .where('userId', '==', decodedToken.uid)
        .where('username', '==', cleanUsername)
        .count()
        .get()).data().count,
      updated_at: new Date().toISOString()
    }, { merge: true })

    console.log(`[Snapshot] Stored snapshot: ${snapshotRef.id}`)

    return NextResponse.json({
      success: true,
      snapshot_id: snapshotRef.id,
      metrics: {
        followers: snapshot.followers,
        engagement: snapshot.avg_engagement,
        tweets_analyzed: snapshot.tweets_analyzed
      },
      message: 'Snapshot stored successfully'
    })

  } catch (error: any) {
    console.error('[Snapshot] Error:', error)
    return NextResponse.json({ 
      error: 'Failed to take snapshot',
      details: error.message 
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json({ 
    message: 'Historical Snapshot API',
    description: 'Take daily snapshots of X account metrics',
    usage: 'POST with { username: "elonmusk" }',
    features: [
      'Store follower growth over time',
      'Track engagement trends',
      'Monitor tweet performance',
      'Free with Firestore',
      'Real-time updates'
    ]
  })
}
