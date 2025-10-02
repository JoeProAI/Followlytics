import { NextRequest, NextResponse } from 'next/server'
import { adminDb as db } from '@/lib/firebase-admin'
import { TwitterApi } from 'twitter-api-v2'

/**
 * Vercel Cron Job - Runs daily to take snapshots for all tracked users
 * Configure in vercel.json: "schedule": "0 0 * * *" (midnight UTC)
 */
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret (security)
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('[Cron] Starting daily snapshots...')

    // Get all users with tracking enabled
    const trackingQuery = await db.collection('tracking')
      .where('tracking_enabled', '==', true)
      .get()

    if (trackingQuery.empty) {
      console.log('[Cron] No users to track')
      return NextResponse.json({ 
        success: true,
        message: 'No users tracking enabled',
        snapshots_taken: 0
      })
    }

    const client = new TwitterApi(process.env.X_BEARER_TOKEN!)
    let successCount = 0
    let errorCount = 0
    const results = []

    // Process each tracked user
    for (const doc of trackingQuery.docs) {
      const tracking = doc.data()
      const { username, userId } = tracking

      try {
        console.log(`[Cron] Taking snapshot for @${username}`)

        // Get user data
        const userResponse = await client.v2.userByUsername(username, {
          'user.fields': ['public_metrics', 'created_at']
        })

        if (!userResponse.data) {
          throw new Error('User not found')
        }

        const user = userResponse.data

        // Get recent tweets
        const tweetsResponse = await client.v2.userTimeline(user.id, {
          max_results: 100,
          exclude: ['retweets', 'replies'],
          'tweet.fields': ['public_metrics', 'created_at']
        })

        const tweets = tweetsResponse.data.data || []

        // Calculate metrics
        const totalLikes = tweets.reduce((sum, t) => sum + (t.public_metrics?.like_count || 0), 0)
        const totalRetweets = tweets.reduce((sum, t) => sum + (t.public_metrics?.retweet_count || 0), 0)
        const totalReplies = tweets.reduce((sum, t) => sum + (t.public_metrics?.reply_count || 0), 0)
        const avgEngagement = tweets.length ? 
          Math.round((totalLikes + totalRetweets * 2 + totalReplies) / tweets.length) : 0

        // Create snapshot
        const snapshot = {
          username,
          userId,
          timestamp: new Date().toISOString(),
          followers: user.public_metrics?.followers_count || 0,
          following: user.public_metrics?.following_count || 0,
          tweet_count: user.public_metrics?.tweet_count || 0,
          listed_count: user.public_metrics?.listed_count || 0,
          avg_engagement: avgEngagement,
          total_likes: totalLikes,
          total_retweets: totalRetweets,
          total_replies: totalReplies,
          tweets_analyzed: tweets.length,
          engagement_rate: user.public_metrics?.followers_count ? 
            ((totalLikes + totalRetweets) / tweets.length / user.public_metrics.followers_count * 100) : 0,
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
              created_at: t.created_at
            }))
        }

        // Store snapshot
        await db.collection('snapshots').add(snapshot)

        // Update tracking doc
        await db.collection('tracking').doc(userId).update({
          last_snapshot: new Date().toISOString(),
          last_snapshot_success: true
        })

        successCount++
        results.push({
          username,
          status: 'success',
          followers: snapshot.followers,
          engagement: snapshot.avg_engagement
        })

        console.log(`[Cron] ✓ Snapshot taken for @${username}`)

        // Rate limiting - wait between users
        await new Promise(resolve => setTimeout(resolve, 1000))

      } catch (error: any) {
        console.error(`[Cron] ✗ Error for @${username}:`, error.message)
        errorCount++
        results.push({
          username,
          status: 'error',
          error: error.message
        })

        // Update tracking doc with error
        await db.collection('tracking').doc(userId).update({
          last_snapshot_error: error.message,
          last_snapshot_success: false
        })
      }
    }

    console.log(`[Cron] Complete: ${successCount} success, ${errorCount} errors`)

    return NextResponse.json({
      success: true,
      message: `Daily snapshots complete`,
      total_users: trackingQuery.size,
      snapshots_taken: successCount,
      errors: errorCount,
      results,
      timestamp: new Date().toISOString()
    })

  } catch (error: any) {
    console.error('[Cron] Fatal error:', error)
    return NextResponse.json({ 
      error: 'Cron job failed',
      details: error.message 
    }, { status: 500 })
  }
}
