import { NextRequest, NextResponse } from 'next/server'
import { adminAuth as auth } from '@/lib/firebase-admin'
import { getUserSubscription, trackAPICall } from '@/lib/subscription'

/**
 * Grok-Powered Competitor Intelligence (ENTERPRISE Feature)
 * Uses XAI's Grok model for deep competitive analysis
 * This is the PREMIUM feature that justifies $199/month
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

    // Check subscription tier (ENTERPRISE only)
    const subscription = await getUserSubscription(userId)
    
    if (subscription.tier !== 'enterprise') {
      return NextResponse.json({
        error: 'Competitor intelligence is an ENTERPRISE feature',
        upgrade_url: '/pricing',
        current_tier: subscription.tier,
        required_tier: 'enterprise'
      }, { status: 403 })
    }

    const { competitors } = await request.json()
    
    if (!competitors || !Array.isArray(competitors) || competitors.length === 0) {
      return NextResponse.json({ 
        error: 'Competitors array is required' 
      }, { status: 400 })
    }

    console.log(`[Grok Intelligence] Analyzing ${competitors.length} competitors`)

    // Use Grok via XAI API
    const response = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.XAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'grok-beta',
        messages: [
          {
            role: 'system',
            content: 'You are a competitive intelligence analyst for X (Twitter). Provide strategic insights for outperforming competitors.'
          },
          {
            role: 'user',
            content: `Analyze these X competitors and provide strategic intelligence:

${competitors.map((c: any, i: number) => `
Competitor ${i + 1}: @${c.username}
Followers: ${c.followers?.toLocaleString()}
Avg Engagement: ${c.avg_engagement}
Recent Content: ${c.recent_tweets?.map((t: any) => t.text).join(' | ')}
`).join('\n')}

Provide competitive intelligence in JSON format:
{
  "market_position": "where they stand in the market",
  "their_strengths": ["strength 1", "strength 2", "strength 3"],
  "their_weaknesses": ["weakness 1", "weakness 2"],
  "opportunities_to_exploit": [
    {"opportunity": "what to do", "why": "why it works", "how": "specific tactics"}
  ],
  "content_gaps": ["gap 1 they're missing", "gap 2 they're missing"],
  "audience_insights": "who follows them and why",
  "differentiation_strategy": {
    "positioning": "how to position differently",
    "unique_angles": ["angle 1", "angle 2"],
    "content_tactics": ["tactic 1", "tactic 2"]
  },
  "competitive_advantages": ["your advantage 1", "your advantage 2"],
  "battle_plan": {
    "immediate_actions": ["action 1", "action 2", "action 3"],
    "30_day_strategy": "month 1 strategy",
    "90_day_strategy": "quarter strategy"
  },
  "threat_level": "low/medium/high with explanation"
}`
          }
        ],
        temperature: 0.8,
        response_format: { type: 'json_object' }
      })
    })

    const data = await response.json()
    
    if (!response.ok) {
      throw new Error(data.error?.message || 'Grok API error')
    }

    const intelligence = JSON.parse(data.choices[0].message.content || '{}')

    // Track API call
    await trackAPICall(userId, 'competitor-intelligence')

    console.log(`[Grok Intelligence] Complete`)

    return NextResponse.json({
      success: true,
      intelligence,
      competitors_analyzed: competitors.length,
      ai_model: 'grok-beta',
      powered_by: 'XAI',
      timestamp: new Date().toISOString()
    })

  } catch (error: any) {
    console.error('[Grok Intelligence] Error:', error)
    
    // Fallback to OpenAI if Grok fails
    if (error.message?.includes('Grok')) {
      console.log('[Grok Intelligence] Falling back to GPT-4')
      // You could implement OpenAI fallback here
    }
    
    return NextResponse.json({
      error: 'Failed to generate competitive intelligence',
      details: error.message
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json({
    message: 'Competitor Intelligence API',
    description: 'Grok-powered deep competitive analysis',
    features: [
      'Market positioning analysis',
      'Competitive gap identification',
      'Strategic battle plans',
      'Differentiation strategies',
      'Real-time threat assessment'
    ],
    pricing: 'Requires ENTERPRISE subscription ($199/mo)',
    powered_by: 'XAI Grok Beta'
  })
}
