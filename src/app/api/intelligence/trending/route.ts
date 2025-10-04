import { NextRequest, NextResponse } from 'next/server'
import { TwitterApi } from 'twitter-api-v2'
import { withPaymentGate, isPaymentGateError } from '@/lib/paymentGate'

export async function POST(request: NextRequest) {
  try {
    // Payment gate: requires Pro tier for trending analysis
    const gateResult = await withPaymentGate(request, {
      requireTier: 'pro',
      trackUsage: true,
      endpoint: '/api/intelligence/trending'
    })

    if (isPaymentGateError(gateResult)) {
      return gateResult
    }

    const { userId } = gateResult
    const { topic, minEngagement = 100 } = await request.json()
    
    if (!topic) {
      return NextResponse.json({ error: 'Topic is required' }, { status: 400 })
    }

    console.log(`[Trending Analysis] Finding trending content for: "${topic}"`)

    // Initialize X API
    const client = new TwitterApi(process.env.X_BEARER_TOKEN!)

    // Search for topic
    const searchResponse = await client.v2.search(topic, {
      max_results: 100,
      'tweet.fields': ['public_metrics', 'created_at', 'author_id'],
      'user.fields': ['username', 'name', 'public_metrics', 'verified'],
      expansions: ['author_id'],
      sort_order: 'relevancy'
    })

    const tweets = searchResponse.data.data || []
    const users = searchResponse.data.includes?.users || []

    if (tweets.length === 0) {
      return NextResponse.json({
        success: true,
        topic,
        message: 'No tweets found for this topic',
        trending_tweets: [],
        insights: []
      })
    }

    // Create user lookup
    const userMap = new Map(users.map(u => [u.id, u]))

    // Calculate engagement and filter
    const tweetData = tweets
      .map(tweet => {
        const author = userMap.get(tweet.author_id!)
        const engagement = (tweet.public_metrics?.like_count || 0) + 
                          (tweet.public_metrics?.retweet_count || 0) * 2 +
                          (tweet.public_metrics?.reply_count || 0)
        
        return {
          id: tweet.id,
          text: tweet.text,
          author: author ? {
            username: author.username,
            name: author.name,
            followers: author.public_metrics?.followers_count,
            verified: author.verified
          } : null,
          metrics: {
            likes: tweet.public_metrics?.like_count || 0,
            retweets: tweet.public_metrics?.retweet_count || 0,
            replies: tweet.public_metrics?.reply_count || 0,
            quotes: tweet.public_metrics?.quote_count || 0
          },
          engagement,
          created_at: tweet.created_at,
          url: `https://twitter.com/${author?.username}/status/${tweet.id}`
        }
      })
      .filter(t => t.engagement >= minEngagement)
      .sort((a, b) => b.engagement - a.engagement)

    // Analyze patterns
    const totalEngagement = tweetData.reduce((sum, t) => sum + t.engagement, 0)
    const avgEngagement = tweetData.length ? Math.round(totalEngagement / tweetData.length) : 0

    // Extract common patterns
    const hashtags = new Map<string, number>()
    const mentions = new Map<string, number>()
    
    tweetData.forEach(tweet => {
      // Find hashtags
      const foundHashtags = tweet.text.match(/#\w+/g) || []
      foundHashtags.forEach(tag => {
        hashtags.set(tag.toLowerCase(), (hashtags.get(tag.toLowerCase()) || 0) + 1)
      })
      
      // Find mentions
      const foundMentions = tweet.text.match(/@\w+/g) || []
      foundMentions.forEach(mention => {
        mentions.set(mention.toLowerCase(), (mentions.get(mention.toLowerCase()) || 0) + 1)
      })
    })

    const topHashtags = Array.from(hashtags.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([tag, count]) => ({ tag, count }))

    const topMentions = Array.from(mentions.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([mention, count]) => ({ mention, count }))

    // Top influencers in this topic
    const influencers = tweetData
      .filter(t => t.author && t.author.followers && t.author.followers > 1000)
      .slice(0, 10)
      .map(t => ({
        username: t.author!.username,
        name: t.author!.name,
        followers: t.author!.followers,
        engagement: t.engagement,
        verified: t.author!.verified
      }))

    // Generate insights
    const insights = []
    if (tweetData.length > 0) {
      insights.push(`Found ${tweetData.length} trending tweets about "${topic}"`)
      insights.push(`Average engagement: ${avgEngagement}`)
      if (topHashtags.length > 0) {
        insights.push(`Most used hashtag: ${topHashtags[0].tag} (${topHashtags[0].count} times)`)
      }
      if (influencers.length > 0) {
        insights.push(`Top influencer: @${influencers[0].username} (${influencers[0].followers.toLocaleString()} followers)`)
      }
    }

    console.log(`[Trending Analysis] Found ${tweetData.length} trending tweets`)

    return NextResponse.json({
      success: true,
      topic,
      summary: {
        total_tweets: tweetData.length,
        total_engagement: totalEngagement,
        avg_engagement: avgEngagement,
        min_engagement_filter: minEngagement
      },
      trending_tweets: tweetData.slice(0, 20),
      patterns: {
        top_hashtags: topHashtags,
        top_mentions: topMentions
      },
      influencers,
      insights,
      timestamp: new Date().toISOString()
    })

  } catch (error: any) {
    console.error('[Trending Analysis] Error:', error)
    return NextResponse.json({ 
      error: 'Failed to analyze trending content',
      details: error.message 
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json({ 
    message: 'Trending Analysis API',
    description: 'Find and analyze trending content for any topic',
    usage: 'POST with { topic: "AI", minEngagement: 100 }',
    features: [
      'Find high-engagement tweets',
      'Pattern detection (hashtags, mentions)',
      'Identify key influencers',
      'Engagement analysis',
      'Actionable insights'
    ]
  })
}
