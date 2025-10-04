import { NextRequest, NextResponse } from 'next/server'
import { adminAuth as auth } from '@/lib/firebase-admin'
import { getUserSubscription, trackAPICall, checkUsageLimits } from '@/lib/subscription'

/**
 * AI-Powered Content Analysis (STARTER+ Feature)
 * Uses Grok AI to analyze tweets and provide actionable insights
 * Available for Starter, Pro, and Enterprise tiers
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

    const userId = decodedToken.uid

    // Check subscription tier
    const subscription = await getUserSubscription(userId)
    
    if (!subscription.limits.ai_analysis) {
      return NextResponse.json({
        error: 'AI analysis is a PRO feature',
        upgrade_url: '/pricing',
        current_tier: subscription.tier
      }, { status: 403 })
    }

    // Check usage limits
    const usageCheck = await checkUsageLimits(userId, 'ai-analysis')
    if (!usageCheck.allowed) {
      return NextResponse.json({
        error: usageCheck.reason,
        upgrade_url: '/pricing'
      }, { status: 429 })
    }

    const { tweets, username } = await request.json()
    
    if (!tweets || !Array.isArray(tweets) || tweets.length === 0) {
      return NextResponse.json({ 
        error: 'Tweets array is required' 
      }, { status: 400 })
    }

    console.log(`[AI Analysis] Analyzing ${tweets.length} tweets for @${username}`)

    // Prepare tweet data for AI
    const tweetData = tweets.map((t, i) => ({
      num: i + 1,
      text: t.text,
      likes: t.public_metrics?.like_count || 0,
      retweets: t.public_metrics?.retweet_count || 0,
      replies: t.public_metrics?.reply_count || 0,
      engagement: (t.public_metrics?.like_count || 0) + 
                 (t.public_metrics?.retweet_count || 0) * 2 +
                 (t.public_metrics?.reply_count || 0)
    }))

    // Sort by engagement
    tweetData.sort((a, b) => b.engagement - a.engagement)
    const topTweets = tweetData.slice(0, 10)

    // AI Analysis using Grok
    const apiKey = process.env.XAI_API_KEY || process.env.GROK_API_KEY || ''
    
    if (!apiKey) {
      return NextResponse.json({
        error: 'AI analysis temporarily unavailable',
        details: 'Grok API key not configured'
      }, { status: 503 })
    }

    const response = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'grok-2-latest',
        messages: [
          {
            role: 'system',
            content: `You are Grok, an expert X (Twitter) growth strategist. Analyze tweets and provide actionable insights to increase engagement and followers. Be specific, data-driven, witty, and direct.`
          },
          {
            role: 'user',
            content: `Analyze these top 10 tweets from @${username} and provide insights:

${topTweets.map(t => `Tweet ${t.num}: "${t.text}"
Likes: ${t.likes}, Retweets: ${t.retweets}, Replies: ${t.replies}
`).join('\n')}

Provide analysis in this JSON format (no markdown, just JSON):
{
  "summary": "2-sentence overview of their content strategy",
  "top_patterns": ["pattern 1", "pattern 2", "pattern 3"],
  "best_performing_style": "description of what works best",
  "optimal_length": "tweet length recommendation with reasoning",
  "hashtag_strategy": "hashtag usage analysis and recommendations",
  "engagement_drivers": ["driver 1", "driver 2", "driver 3"],
  "actionable_tips": [
    {"tip": "specific action", "why": "why it works", "example": "how to do it"},
    {"tip": "specific action", "why": "why it works", "example": "how to do it"},
    {"tip": "specific action", "why": "why it works", "example": "how to do it"}
  ],
  "avoid": ["what not to do 1", "what not to do 2"],
  "next_tweet_suggestion": "specific tweet idea based on what works"
}`
          }
        ],
        temperature: 0.7
      })
    })

    if (!response.ok) {
      throw new Error(`Grok API error: ${response.statusText}`)
    }

    const completion = await response.json()
    const content = completion.choices[0]?.message?.content || '{}'
    
    // Parse JSON (handle potential markdown wrapping)
    let analysis
    try {
      analysis = JSON.parse(content)
    } catch {
      const jsonMatch = content.match(/```json\n([\s\S]+?)\n```/) || content.match(/\{[\s\S]+\}/)
      analysis = jsonMatch ? JSON.parse(jsonMatch[1] || jsonMatch[0]) : {}
    }

    // Track API call
    await trackAPICall(userId, 'ai-analysis')

    console.log(`[AI Analysis] Complete for @${username}`)

    return NextResponse.json({
      success: true,
      analysis,
      tweets_analyzed: tweets.length,
      ai_model: 'grok-2-latest',
      timestamp: new Date().toISOString()
    })

  } catch (error: any) {
    console.error('[AI Analysis] Error:', error)
    return NextResponse.json({
      error: 'Failed to generate AI analysis',
      details: error.message
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json({
    message: 'AI Content Analysis API',
    description: 'Grok AI powered tweet analysis for Starter+ users',
    features: [
      'Pattern recognition',
      'Engagement optimization',
      'Content strategy insights',
      'Personalized recommendations'
    ],
    pricing: 'Requires Starter subscription ($29/mo) or higher'
  })
}
