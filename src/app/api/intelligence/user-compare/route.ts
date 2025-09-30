import { NextRequest, NextResponse } from 'next/server'
import { TwitterApi } from 'twitter-api-v2'
import { adminAuth as auth } from '@/lib/firebase-admin'

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

    const { usernames } = await request.json()
    
    if (!usernames || !Array.isArray(usernames) || usernames.length < 2) {
      return NextResponse.json({ error: 'At least 2 usernames required' }, { status: 400 })
    }

    if (usernames.length > 5) {
      return NextResponse.json({ error: 'Maximum 5 usernames allowed' }, { status: 400 })
    }

    console.log(`[User Compare] Comparing: ${usernames.join(', ')}`)

    // Initialize X API
    const client = new TwitterApi(process.env.X_BEARER_TOKEN!)

    // Fetch data for all users
    const userDataPromises = usernames.map(async (username) => {
      try {
        const cleanUsername = username.replace('@', '').trim()
        
        // Get user info
        const userResponse = await client.v2.userByUsername(cleanUsername, {
          'user.fields': ['public_metrics', 'created_at', 'description']
        })

        if (!userResponse.data) {
          return null
        }

        const user = userResponse.data

        // Get recent tweets
        const tweetsResponse = await client.v2.userTimeline(user.id, {
          max_results: 20,
          exclude: ['retweets', 'replies'],
          'tweet.fields': ['public_metrics', 'created_at']
        })

        const tweets = tweetsResponse.data.data || []

        // Calculate engagement
        const totalLikes = tweets.reduce((sum, t) => sum + (t.public_metrics?.like_count || 0), 0)
        const totalRetweets = tweets.reduce((sum, t) => sum + (t.public_metrics?.retweet_count || 0), 0)
        const totalReplies = tweets.reduce((sum, t) => sum + (t.public_metrics?.reply_count || 0), 0)

        const avgEngagement = tweets.length ? 
          Math.round((totalLikes + totalRetweets * 2 + totalReplies) / tweets.length) : 0

        const engagementRate = user.public_metrics?.followers_count ? 
          ((totalLikes + totalRetweets) / tweets.length / user.public_metrics.followers_count * 100).toFixed(3) : '0'

        // Calculate posting frequency (tweets per day)
        const accountAge = new Date().getTime() - new Date(user.created_at!).getTime()
        const daysOld = accountAge / (1000 * 60 * 60 * 24)
        const tweetsPerDay = user.public_metrics ? 
          (user.public_metrics.tweet_count / daysOld).toFixed(1) : '0'

        return {
          username: user.username,
          name: user.name,
          followers: user.public_metrics?.followers_count || 0,
          following: user.public_metrics?.following_count || 0,
          total_tweets: user.public_metrics?.tweet_count || 0,
          bio: user.description,
          created_at: user.created_at,
          recent_tweets_analyzed: tweets.length,
          engagement: {
            avg_per_tweet: avgEngagement,
            engagement_rate: parseFloat(engagementRate),
            total_likes: totalLikes,
            total_retweets: totalRetweets,
            total_replies: totalReplies
          },
          activity: {
            tweets_per_day: parseFloat(tweetsPerDay),
            account_age_days: Math.round(daysOld)
          }
        }
      } catch (error) {
        console.error(`Error fetching data for ${username}:`, error)
        return null
      }
    })

    const usersData = (await Promise.all(userDataPromises)).filter(u => u !== null)

    if (usersData.length < 2) {
      return NextResponse.json({ 
        error: 'Could not fetch data for at least 2 users' 
      }, { status: 400 })
    }

    // Calculate rankings
    const rankings = {
      followers: [...usersData].sort((a, b) => b.followers - a.followers),
      engagement: [...usersData].sort((a, b) => b.engagement.avg_per_tweet - a.engagement.avg_per_tweet),
      engagement_rate: [...usersData].sort((a, b) => b.engagement.engagement_rate - a.engagement.engagement_rate),
      activity: [...usersData].sort((a, b) => b.activity.tweets_per_day - a.activity.tweets_per_day)
    }

    // Calculate averages
    const avgFollowers = Math.round(usersData.reduce((sum, u) => sum + u.followers, 0) / usersData.length)
    const avgEngagement = Math.round(usersData.reduce((sum, u) => sum + u.engagement.avg_per_tweet, 0) / usersData.length)
    const avgEngagementRate = (usersData.reduce((sum, u) => sum + u.engagement.engagement_rate, 0) / usersData.length).toFixed(3)

    console.log(`[User Compare] Successfully compared ${usersData.length} users`)

    return NextResponse.json({
      success: true,
      users: usersData,
      rankings: {
        by_followers: rankings.followers.map(u => ({ username: u.username, value: u.followers })),
        by_engagement: rankings.engagement.map(u => ({ username: u.username, value: u.engagement.avg_per_tweet })),
        by_engagement_rate: rankings.engagement_rate.map(u => ({ username: u.username, value: u.engagement.engagement_rate })),
        by_activity: rankings.activity.map(u => ({ username: u.username, value: u.activity.tweets_per_day }))
      },
      averages: {
        followers: avgFollowers,
        engagement_per_tweet: avgEngagement,
        engagement_rate: parseFloat(avgEngagementRate)
      },
      insights: [
        `Highest followers: @${rankings.followers[0].username} (${rankings.followers[0].followers.toLocaleString()})`,
        `Best engagement: @${rankings.engagement[0].username} (${rankings.engagement[0].engagement.avg_per_tweet} per tweet)`,
        `Most active: @${rankings.activity[0].username} (${rankings.activity[0].activity.tweets_per_day} tweets/day)`
      ],
      timestamp: new Date().toISOString()
    })

  } catch (error: any) {
    console.error('[User Compare] Error:', error)
    return NextResponse.json({ 
      error: 'Failed to compare users',
      details: error.message 
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json({ 
    message: 'User Comparison API',
    description: 'Compare multiple X accounts side-by-side',
    usage: 'POST with { usernames: ["elonmusk", "billgates", "naval"] }',
    features: [
      'Compare 2-5 accounts',
      'Follower metrics',
      'Engagement analysis',
      'Activity patterns',
      'Rankings and insights'
    ]
  })
}
