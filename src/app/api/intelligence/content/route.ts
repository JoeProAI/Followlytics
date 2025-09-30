import { NextRequest, NextResponse } from 'next/server'
import { TwitterApi } from 'twitter-api-v2'
import { adminAuth as auth } from '@/lib/firebase-admin'

interface TweetMetrics {
  like_count: number
  retweet_count: number
  reply_count: number
  quote_count: number
  impression_count?: number
}

interface AnalyzedTweet {
  id: string
  text: string
  created_at: string
  public_metrics: TweetMetrics
}

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

    // Clean username: remove @, trim whitespace
    const cleanUsername = username.replace('@', '').trim()
    
    if (!cleanUsername) {
      return NextResponse.json({ error: 'Invalid username' }, { status: 400 })
    }

    console.log(`[Content Intelligence] Analyzing @${cleanUsername}...`)

    // Initialize X API
    const client = new TwitterApi(process.env.X_BEARER_TOKEN!)

    // Get user
    const userResponse = await client.v2.userByUsername(cleanUsername, {
      'user.fields': ['public_metrics', 'created_at']
    })

    if (!userResponse.data) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const user = userResponse.data

    // Fetch ALL tweets (up to 3200) - paginate through them
    const allTweets: AnalyzedTweet[] = []
    let paginationToken: string | undefined = undefined
    
    console.log('[Content Intelligence] Fetching tweets...')
    
    // Fetch up to 500 tweets (5 pages of 100) for analysis
    for (let page = 0; page < 5; page++) {
      try {
        const tweetsResponse = await client.v2.userTimeline(user.id, {
          max_results: 100,
          exclude: ['retweets', 'replies'],
          'tweet.fields': ['public_metrics', 'created_at'],
          pagination_token: paginationToken
        })

        if (!tweetsResponse.data?.data || tweetsResponse.data.data.length === 0) {
          break
        }

        allTweets.push(...tweetsResponse.data.data as any)

        // Check if there's more
        if (!tweetsResponse.data.meta?.next_token) {
          break
        }

        paginationToken = tweetsResponse.data.meta.next_token
        
      } catch (error) {
        console.error(`Error fetching page ${page}:`, error)
        break
      }
    }

    console.log(`[Content Intelligence] Fetched ${allTweets.length} tweets`)

    if (allTweets.length === 0) {
      return NextResponse.json({ 
        error: 'No tweets found for analysis',
        username 
      }, { status: 404 })
    }

    // ANALYSIS ALGORITHMS

    // 1. Length Analysis
    const lengthBuckets: Record<number, number[]> = {}
    
    allTweets.forEach(tweet => {
      const length = tweet.text.length
      const bucket = Math.floor(length / 50) * 50 // 0-50, 50-100, 100-150, etc.
      const engagement = tweet.public_metrics.like_count + (tweet.public_metrics.retweet_count * 2)
      
      if (!lengthBuckets[bucket]) {
        lengthBuckets[bucket] = []
      }
      lengthBuckets[bucket].push(engagement)
    })

    const avgByLength = Object.entries(lengthBuckets)
      .filter(([_, engs]) => engs.length >= 3) // At least 3 tweets
      .map(([bucket, engs]) => ({
        range: `${bucket}-${parseInt(bucket) + 50}`,
        avgEngagement: Math.round(engs.reduce((a, b) => a + b, 0) / engs.length),
        count: engs.length
      }))
      .sort((a, b) => b.avgEngagement - a.avgEngagement)

    // 2. Timing Analysis
    const hourBuckets: Record<number, number[]> = {}
    
    allTweets.forEach(tweet => {
      const date = new Date(tweet.created_at)
      const hour = date.getUTCHours()
      const engagement = tweet.public_metrics.like_count + (tweet.public_metrics.retweet_count * 2)
      
      if (!hourBuckets[hour]) {
        hourBuckets[hour] = []
      }
      hourBuckets[hour].push(engagement)
    })

    const avgByHour = Object.entries(hourBuckets)
      .filter(([_, engs]) => engs.length >= 2)
      .map(([hour, engs]) => ({
        hour: parseInt(hour),
        avgEngagement: Math.round(engs.reduce((a, b) => a + b, 0) / engs.length),
        count: engs.length
      }))
      .sort((a, b) => b.avgEngagement - a.avgEngagement)

    // 3. Hashtag Analysis
    const hashtagPerformance: Record<string, { total: number; count: number }> = {}
    
    allTweets.forEach(tweet => {
      const hashtags = tweet.text.match(/#\w+/g) || []
      const engagement = tweet.public_metrics.like_count + (tweet.public_metrics.retweet_count * 2)
      
      hashtags.forEach(tag => {
        const normalized = tag.toLowerCase()
        if (!hashtagPerformance[normalized]) {
          hashtagPerformance[normalized] = { total: 0, count: 0 }
        }
        hashtagPerformance[normalized].total += engagement
        hashtagPerformance[normalized].count += 1
      })
    })

    const topHashtags = Object.entries(hashtagPerformance)
      .map(([tag, data]) => ({
        hashtag: tag,
        avgEngagement: Math.round(data.total / data.count),
        uses: data.count
      }))
      .sort((a, b) => b.avgEngagement - a.avgEngagement)
      .slice(0, 10)

    // 4. Top Performing Tweets
    const topTweets = [...allTweets]
      .sort((a, b) => {
        const aEng = a.public_metrics.like_count + (a.public_metrics.retweet_count * 2)
        const bEng = b.public_metrics.like_count + (b.public_metrics.retweet_count * 2)
        return bEng - aEng
      })
      .slice(0, 5)
      .map(tweet => ({
        text: tweet.text.substring(0, 100) + (tweet.text.length > 100 ? '...' : ''),
        likes: tweet.public_metrics.like_count,
        retweets: tweet.public_metrics.retweet_count,
        engagement: tweet.public_metrics.like_count + (tweet.public_metrics.retweet_count * 2)
      }))

    // 5. Overall Stats
    const totalLikes = allTweets.reduce((sum, t) => sum + t.public_metrics.like_count, 0)
    const totalRetweets = allTweets.reduce((sum, t) => sum + t.public_metrics.retweet_count, 0)
    const avgLikes = Math.round(totalLikes / allTweets.length)
    const avgRetweets = Math.round(totalRetweets / allTweets.length)

    // 6. Recommendations
    const recommendations = []
    
    if (avgByLength.length > 0) {
      recommendations.push({
        type: 'length',
        insight: `Your ${avgByLength[0].range} character tweets get ${avgByLength[0].avgEngagement} avg engagement (${avgByLength[0].count} tweets analyzed)`,
        action: `Try keeping tweets in the ${avgByLength[0].range} character range`
      })
    }
    
    if (avgByHour.length > 0) {
      const bestHour = avgByHour[0]
      recommendations.push({
        type: 'timing',
        insight: `Posting at ${bestHour.hour}:00 UTC gets ${bestHour.avgEngagement} avg engagement (${bestHour.count} tweets)`,
        action: `Schedule your most important tweets around ${bestHour.hour}:00 UTC`
      })
    }
    
    if (topHashtags.length > 0) {
      recommendations.push({
        type: 'hashtags',
        insight: `${topHashtags[0].hashtag} averages ${topHashtags[0].avgEngagement} engagement across ${topHashtags[0].uses} uses`,
        action: `Continue using ${topHashtags[0].hashtag} - it performs well`
      })
    }

    // Engagement rate insight
    const followersCount = user.public_metrics?.followers_count || 1
    const engagementRate = ((totalLikes + totalRetweets) / allTweets.length / followersCount * 100).toFixed(2)
    recommendations.push({
      type: 'engagement',
      insight: `Your engagement rate is ${engagementRate}% (industry average is 0.5-1%)`,
      action: engagementRate > '1' ? 'Great! Keep up the engagement' : 'Focus on creating more engaging content'
    })

    console.log('[Content Intelligence] Analysis complete')

    return NextResponse.json({
      success: true,
      username,
      analysis: {
        tweets_analyzed: allTweets.length,
        date_range: {
          oldest: allTweets[allTweets.length - 1]?.created_at,
          newest: allTweets[0]?.created_at
        },
        length_analysis: {
          optimal_range: avgByLength[0]?.range || 'N/A',
          best_performing_lengths: avgByLength.slice(0, 3)
        },
        timing_analysis: {
          best_hours_utc: avgByHour.slice(0, 3)
        },
        hashtag_performance: topHashtags,
        top_performing_tweets: topTweets,
        engagement_stats: {
          total_likes: totalLikes,
          total_retweets: totalRetweets,
          avg_likes_per_tweet: avgLikes,
          avg_retweets_per_tweet: avgRetweets,
          engagement_rate: parseFloat(engagementRate)
        },
        recommendations
      },
      timestamp: new Date().toISOString()
    })

  } catch (error: any) {
    console.error('[Content Intelligence] Error:', error)
    return NextResponse.json({ 
      error: 'Failed to analyze content',
      details: error.message 
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json({ 
    message: 'Content Intelligence API',
    description: 'Deep analysis of tweet patterns, timing, and performance',
    usage: 'POST with { username: "elonmusk" }',
    features: [
      'Optimal tweet length analysis',
      'Best posting times (UTC)',
      'Hashtag performance tracking',
      'Top performing content identification',
      'Engagement statistics',
      'Actionable recommendations'
    ],
    note: 'Analyzes up to 500 recent tweets for patterns'
  })
}
