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

    const { query, maxResults = 100 } = await request.json()
    
    if (!query) {
      return NextResponse.json({ error: 'Search query is required' }, { status: 400 })
    }

    console.log(`[Search Intelligence] Searching: "${query}"...`)

    // Initialize X API
    const client = new TwitterApi(process.env.X_BEARER_TOKEN!)

    // Search recent tweets
    const searchResponse = await client.v2.search(query, {
      max_results: Math.min(maxResults, 100),
      'tweet.fields': ['public_metrics', 'created_at', 'author_id'],
      'user.fields': ['username', 'name', 'public_metrics'],
      expansions: ['author_id']
    })

    const tweets = searchResponse.data.data || []
    const users = searchResponse.data.includes?.users || []

    // Create user lookup
    const userMap = new Map(users.map(u => [u.id, u]))

    // Analyze results
    const tweetData = tweets.map(tweet => {
      const author = userMap.get(tweet.author_id!)
      return {
        id: tweet.id,
        text: tweet.text,
        author: author ? {
          username: author.username,
          name: author.name,
          followers: author.public_metrics?.followers_count
        } : null,
        metrics: tweet.public_metrics,
        engagement: (tweet.public_metrics?.like_count || 0) + 
                   (tweet.public_metrics?.retweet_count || 0) * 2,
        created_at: tweet.created_at
      }
    })

    // Sort by engagement
    tweetData.sort((a, b) => b.engagement - a.engagement)

    // Calculate stats
    const totalEngagement = tweetData.reduce((sum, t) => sum + t.engagement, 0)
    const avgEngagement = tweetData.length ? Math.round(totalEngagement / tweetData.length) : 0
    
    const totalLikes = tweetData.reduce((sum, t) => sum + (t.metrics?.like_count || 0), 0)
    const totalRetweets = tweetData.reduce((sum, t) => sum + (t.metrics?.retweet_count || 0), 0)

    // Find top authors
    const authorEngagement = new Map()
    tweetData.forEach(tweet => {
      if (tweet.author) {
        const current = authorEngagement.get(tweet.author.username) || { count: 0, engagement: 0, name: tweet.author.name, followers: tweet.author.followers }
        current.count++
        current.engagement += tweet.engagement
        authorEngagement.set(tweet.author.username, current)
      }
    })

    const topAuthors = Array.from(authorEngagement.entries())
      .map(([username, data]) => ({
        username,
        name: data.name,
        followers: data.followers,
        tweet_count: data.count,
        total_engagement: data.engagement,
        avg_engagement: Math.round(data.engagement / data.count)
      }))
      .sort((a, b) => b.total_engagement - a.total_engagement)
      .slice(0, 10)

    console.log(`[Search Intelligence] Found ${tweets.length} tweets`)

    return NextResponse.json({
      success: true,
      query,
      results: {
        total_found: tweets.length,
        total_engagement: totalEngagement,
        avg_engagement: avgEngagement,
        total_likes: totalLikes,
        total_retweets: totalRetweets
      },
      top_tweets: tweetData.slice(0, 20),
      top_authors: topAuthors,
      timestamp: new Date().toISOString()
    })

  } catch (error: any) {
    console.error('[Search Intelligence] Error:', error)
    return NextResponse.json({ 
      error: 'Failed to search tweets',
      details: error.message 
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json({ 
    message: 'Search Intelligence API',
    description: 'Search X for tweets and analyze engagement patterns',
    usage: 'POST with { query: "AI OR artificial intelligence", maxResults: 100 }',
    features: [
      'Search recent tweets (last 7 days)',
      'Engagement analysis',
      'Top performing tweets',
      'Top authors by engagement',
      'Real-time insights'
    ]
  })
}
