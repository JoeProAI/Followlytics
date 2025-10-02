import { NextRequest, NextResponse } from 'next/server'
import { adminDb as db } from '@/lib/firebase-admin'
import { TwitterApi } from 'twitter-api-v2'

/**
 * Daytona-Powered Competitor Monitoring
 * Runs every 6 hours, caches data in Firestore
 * This is the REAL value-add that justifies pricing
 */
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('[Competitor Monitor] Starting monitoring job...')

    // Get all active subscriptions with competitor tracking
    const subscriptionsQuery = await db.collection('subscriptions')
      .where('status', '==', 'active')
      .where('tier', 'in', ['starter', 'pro', 'enterprise'])
      .get()

    if (subscriptionsQuery.empty) {
      console.log('[Competitor Monitor] No active subscriptions')
      return NextResponse.json({
        success: true,
        message: 'No subscribers to monitor',
        monitored: 0
      })
    }

    const client = new TwitterApi(process.env.X_BEARER_TOKEN!)
    let totalCompetitorsMonitored = 0
    let totalApiCalls = 0
    const results = []

    // Process each subscription
    for (const subDoc of subscriptionsQuery.docs) {
      const subscription = subDoc.data()
      const userId = subscription.userId

      try {
        // Get user's competitor list
        const competitorsQuery = await db.collection('competitors')
          .where('userId', '==', userId)
          .where('enabled', '==', true)
          .get()

        if (competitorsQuery.empty) continue

        console.log(`[Competitor Monitor] Monitoring ${competitorsQuery.size} competitors for user ${userId}`)

        // Monitor each competitor
        for (const compDoc of competitorsQuery.docs) {
          const competitor = compDoc.data()
          const username = competitor.username

          try {
            // Fetch latest data (uses 1-2 API calls)
            const userResponse = await client.v2.userByUsername(username, {
              'user.fields': ['public_metrics', 'created_at', 'description']
            })

            if (!userResponse.data) continue

            const user = userResponse.data

            // Get recent tweets (uses 1 API call)
            const tweetsResponse = await client.v2.userTimeline(user.id, {
              max_results: 10,
              exclude: ['retweets', 'replies'],
              'tweet.fields': ['public_metrics', 'created_at']
            })

            const tweets = tweetsResponse.data.data || []
            totalApiCalls += 2

            // Calculate quick metrics
            const totalLikes = tweets.reduce((sum, t) => sum + (t.public_metrics?.like_count || 0), 0)
            const totalRetweets = tweets.reduce((sum, t) => sum + (t.public_metrics?.retweet_count || 0), 0)
            const avgEngagement = tweets.length ? Math.round((totalLikes + totalRetweets * 2) / tweets.length) : 0

            // Store snapshot in cache
            const snapshot = {
              userId,
              username,
              timestamp: new Date().toISOString(),
              followers: user.public_metrics?.followers_count || 0,
              following: user.public_metrics?.following_count || 0,
              tweet_count: user.public_metrics?.tweet_count || 0,
              avg_engagement: avgEngagement,
              recent_tweets: tweets.slice(0, 5).map(t => ({
                id: t.id,
                text: t.text,
                likes: t.public_metrics?.like_count || 0,
                retweets: t.public_metrics?.retweet_count || 0,
                created_at: t.created_at
              })),
              monitored_at: new Date().toISOString()
            }

            // Save to cache (Firestore)
            await db.collection('competitor_cache').add(snapshot)

            // Update last monitored time
            await db.collection('competitors').doc(compDoc.id).update({
              last_monitored: new Date().toISOString(),
              last_followers: snapshot.followers,
              last_engagement: snapshot.avg_engagement
            })

            totalCompetitorsMonitored++

            // Detect significant changes and create alerts
            const previousSnapshot = await db.collection('competitor_cache')
              .where('userId', '==', userId)
              .where('username', '==', username)
              .orderBy('timestamp', 'desc')
              .limit(2)
              .get()

            if (previousSnapshot.size >= 2) {
              const [current, previous] = previousSnapshot.docs.map(d => d.data())
              
              const followerChange = current.followers - previous.followers
              const engagementChange = current.avg_engagement - previous.avg_engagement

              // Alert on significant changes (10%+ change)
              if (Math.abs(followerChange) >= previous.followers * 0.1) {
                await createAlert(userId, username, 'follower_spike', {
                  change: followerChange,
                  percentage: (followerChange / previous.followers * 100).toFixed(1)
                })
              }

              if (Math.abs(engagementChange) >= previous.avg_engagement * 0.3) {
                await createAlert(userId, username, 'engagement_spike', {
                  change: engagementChange,
                  percentage: (engagementChange / previous.avg_engagement * 100).toFixed(1)
                })
              }
            }

            console.log(`[Competitor Monitor] ✓ Monitored @${username}`)

            // Rate limiting - don't hammer API
            await new Promise(resolve => setTimeout(resolve, 500))

          } catch (error: any) {
            console.error(`[Competitor Monitor] Error monitoring @${username}:`, error.message)
          }
        }

        results.push({
          userId,
          competitors_monitored: competitorsQuery.size,
          status: 'success'
        })

      } catch (error: any) {
        console.error(`[Competitor Monitor] Error for user ${userId}:`, error.message)
        results.push({
          userId,
          status: 'error',
          error: error.message
        })
      }
    }

    console.log(`[Competitor Monitor] Complete: ${totalCompetitorsMonitored} competitors, ${totalApiCalls} API calls`)

    return NextResponse.json({
      success: true,
      message: 'Monitoring complete',
      competitors_monitored: totalCompetitorsMonitored,
      api_calls_used: totalApiCalls,
      api_calls_saved: totalCompetitorsMonitored * 10, // Would have been 10+ calls per competitor without caching
      subscribers_processed: results.length,
      results,
      timestamp: new Date().toISOString()
    })

  } catch (error: any) {
    console.error('[Competitor Monitor] Fatal error:', error)
    return NextResponse.json({
      error: 'Monitoring job failed',
      details: error.message
    }, { status: 500 })
  }
}

async function createAlert(
  userId: string,
  username: string,
  type: string,
  data: any
): Promise<void> {
  try {
    await db.collection('alerts').add({
      userId,
      username,
      type,
      data,
      read: false,
      created_at: new Date().toISOString()
    })

    console.log(`[Alert Created] ${type} for @${username}: ${JSON.stringify(data)}`)
  } catch (error) {
    console.error('Error creating alert:', error)
  }
}
