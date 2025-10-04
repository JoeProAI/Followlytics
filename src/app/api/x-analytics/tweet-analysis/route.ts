import { NextRequest, NextResponse } from 'next/server'
import XAPIService from '@/lib/xapi'
import { withPaymentGate, isPaymentGateError } from '@/lib/paymentGate'

export async function POST(request: NextRequest) {
  try {
    // Payment gate: requires Starter tier for tweet analysis
    const gateResult = await withPaymentGate(request, {
      requireTier: 'starter',
      trackUsage: true,
      endpoint: '/api/x-analytics/tweet-analysis'
    })

    if (isPaymentGateError(gateResult)) {
      return gateResult
    }

    const { userId } = gateResult
    const { tweetId } = await request.json()
    
    if (!tweetId) {
      return NextResponse.json({ error: 'Tweet ID is required' }, { status: 400 })
    }

    // Initialize X API service
    const xapi = new XAPIService()
    
    // Get single tweet with all available metrics
    // Note: likedBy, retweetedBy require OAuth 2.0 user context (not available with bearer token)
    // We'll use the tweet's public metrics instead
    const tweet = await xapi.getTweetById(tweetId)
    
    if (!tweet) {
      return NextResponse.json({
        error: 'Tweet not found',
        details: 'The tweet may have been deleted or is private'
      }, { status: 404 })
    }

    const metrics = tweet.public_metrics || {}
    
    return NextResponse.json({
      success: true,
      data: {
        tweetId,
        tweet: {
          text: tweet.text,
          created_at: tweet.created_at,
          author_id: tweet.author_id,
          lang: tweet.lang
        },
        engagement: {
          likes: metrics.like_count || 0,
          retweets: metrics.retweet_count || 0,
          replies: metrics.reply_count || 0,
          quotes: metrics.quote_count || 0,
          impressions: metrics.impression_count || null,
          total: (metrics.like_count || 0) + 
                 (metrics.retweet_count || 0) + 
                 (metrics.reply_count || 0) + 
                 (metrics.quote_count || 0)
        },
        engagement_rate: tweet.author_followers ? 
          ((metrics.like_count + metrics.retweet_count + metrics.reply_count) / tweet.author_followers * 100).toFixed(2) : null,
        note: 'Detailed user lists (who liked/retweeted) require OAuth 2.0 user authentication'
      },
      timestamp: new Date().toISOString()
    })

  } catch (error: any) {
    console.error('Tweet Analysis API Error:', error)
    return NextResponse.json({ 
      error: 'Failed to analyze tweet',
      details: error.message 
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json({ 
    message: 'Deep Tweet Analysis API',
    usage: 'POST with { tweetId: "1234567890" }',
    note: 'Returns comprehensive engagement analysis including likes, retweets, quotes, and demographics'
  })
}
