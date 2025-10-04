import { NextRequest, NextResponse } from 'next/server'
import { withPaymentGate, isPaymentGateError } from '@/lib/paymentGate'
import OpenAI from 'openai'

export const maxDuration = 60

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

export async function POST(request: NextRequest) {
  try {
    // Payment gate: requires Starter tier minimum
    const gateResult = await withPaymentGate(request, {
      requireTier: 'starter',
      trackUsage: true,
      endpoint: '/api/daytona/generate-tweets'
    })

    if (isPaymentGateError(gateResult)) {
      return gateResult
    }

    const { userId, subscription } = gateResult
    const { idea, variations = 10, voice = 'viral' } = await request.json()

    if (!idea) {
      return NextResponse.json({ error: 'Idea is required' }, { status: 400 })
    }

    console.log(`🤖 Generating ${variations} ${voice} tweet variations for user: ${userId}`)

    // Get viral tweet patterns from X API if available
    let viralContext = ''
    try {
      const bearerToken = process.env.X_BEARER_TOKEN
      if (bearerToken) {
        const response = await fetch(
          `https://api.twitter.com/2/tweets/search/recent?query=${encodeURIComponent(idea)}&max_results=10&tweet.fields=public_metrics,created_at&sort_order=relevancy`,
          {
            headers: { 'Authorization': `Bearer ${bearerToken}` }
          }
        )
        if (response.ok) {
          const data = await response.json()
          const topTweets = data.data?.slice(0, 3) || []
          if (topTweets.length > 0) {
            viralContext = `\n\nHere are some high-performing tweets on this topic for reference (DON'T copy them, use them to understand what resonates):\n${topTweets.map((t: any) => `"${t.text}" (${t.public_metrics.like_count} likes)`).join('\n')}`
          }
        }
      }
    } catch (error) {
      console.log('Could not fetch viral context, continuing without it')
    }

    // Voice-specific instructions
    const voicePrompts: Record<string, string> = {
      viral: `You're a master of viral content. Study what goes viral:
- Controversial hot takes that make people react
- Pattern interrupts that stop scrolling
- Personal stories that feel authentic
- Specific numbers and bold claims
- Questions that spark debate
- Call-outs to specific groups`,
      
      founder: `You're a successful founder sharing real insights:
- No fluffy startup clichés
- Raw, unfiltered truths about building
- Specific tactics that worked/failed
- Contrarian takes on common advice
- Personal failures turned into lessons`,
      
      shitpost: `You're creating S-tier shitposts:
- Absurd but relatable scenarios
- Self-deprecating humor
- Pop culture references
- Ironic takes on serious topics
- Meme-worthy one-liners`,
      
      thread: `You're writing thread starters that demand attention:
- Strong controversial claim upfront
- Promise specific value
- Create curiosity gap
- Use pattern: "Here's what they won't tell you about..."
- Start with "I spent $X/Yrs learning..."`,
      
      data: `You're sharing data-driven insights:
- Lead with the shocking stat
- Compare unexpected things
- "X is Y times more than you think"
- Make numbers feel personal`

    }

    const voiceInstruction = voicePrompts[voice] || voicePrompts.viral

    // Helper: fetch with timeout
    const withTimeout = async <T>(p: Promise<T>, ms = 30000) => {
      return Promise.race([
        p,
        new Promise<T>((_, reject) => setTimeout(() => reject(new Error('AI timeout')), ms))
      ])
    }

    // Build messages once
    const messages = [
      { role: 'system' as const, content: `You write high-signal posts that spread on X. Output must read human—precise, specific, confident. No filler.

NEVER USE:
- Phrases like "Unlocking the power of...", "In today's digital landscape", "Let's dive in", "Here's the thing about"
- Generic motivational quotes or corporate tone
- Hedging or AI disclaimers (no "As an AI")

ALWAYS USE:
- A concrete hook in the first 5 words
- One sharp point per post
- Specific numbers and stakes; verbs over adjectives
- Pattern interrupt or tension that invites replies
- Natural line breaks for emphasis (no hashtags unless they truly fit)

Style guidance:
${voiceInstruction}

Generate ${variations} variations for the topic below.${viralContext}

Rules:
- Max 280 characters
- No emojis
- No hashtags unless essential
- Do not mention "Twitter"; say "X" only when necessary

Return ONLY a JSON array:
[
  {
    "text": "the post (<=280 chars)",
    "tone": "controversial|funny|inspiring|data-driven|personal",
    "viralScore": 1-100,
    "estimatedReach": "1K|10K|100K|1M",
    "sentiment": "positive|neutral|negative",
    "hooks": ["pattern interrupt used", "emotional trigger"],
    "why": "1-sentence reason this could spread"
  }
]` },
      { role: 'user' as const, content: `Topic: ${idea}\n\nVoice: ${voice}\n\nGenerate ${variations} BANGER tweets that people will actually want to share. No generic AI slop.` }
    ]

    // xAI first
    let responseText: string | undefined
    let usedProvider: 'xai' | 'openai' | undefined
    const xaiApiKey = process.env.XAI_API_KEY
    const xaiModel = process.env.XAI_MODEL || 'grok-2-latest'
    if (xaiApiKey) {
      const tryXai = async () => {
        const res = await withTimeout(fetch('https://api.x.ai/v1/chat/completions', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${xaiApiKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ model: xaiModel, messages, temperature: 0.95, max_tokens: 2500 })
        })) as Response
        if (!res.ok) throw new Error(`xAI error ${res.status}`)
        const data = await res.json()
        return data?.choices?.[0]?.message?.content as string | undefined
      }
      try {
        responseText = await tryXai()
        usedProvider = 'xai'
      } catch {
        await new Promise(r => setTimeout(r, 500 + Math.random() * 500))
        try {
          responseText = await tryXai()
          usedProvider = 'xai'
        } catch {
          // fall back to OpenAI
        }
      }
    }

    // OpenAI fallback
    if (!responseText) {
      if (!process.env.OPENAI_API_KEY) {
        return NextResponse.json({ error: 'All AI providers unavailable', hint: 'Set XAI_API_KEY or OPENAI_API_KEY' }, { status: 503 })
      }
      const completion = await withTimeout(openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages,
        temperature: 0.95,
        max_tokens: 2500
      }))
      responseText = completion.choices[0]?.message?.content ?? undefined
      usedProvider = 'openai'
    }

    if (!responseText) {
      return NextResponse.json({ error: 'No response from AI providers' }, { status: 502 })
    }

    // Parse and enhance
    let tweets: any[]
    try {
      tweets = JSON.parse(responseText)
    } catch (parseError) {
      const jsonMatch = responseText.match(/```json\n([\s\S]+?)\n```/) || responseText.match(/```\n([\s\S]+?)\n```/)
      if (jsonMatch) {
        tweets = JSON.parse(jsonMatch[1])
      } else {
        throw new Error('Failed to parse AI response')
      }
    }

    const enhancedTweets = tweets.map((tweet: any, index: number) => ({
      ...tweet,
      length: tweet.text?.length || 0,
      rank: index + 1,
      id: `tweet_${Date.now()}_${index}`,
      provider: usedProvider || 'unknown'
    }))

    enhancedTweets.sort((a: any, b: any) => (b.viralScore || 0) - (a.viralScore || 0))

    return NextResponse.json({
      success: true,
      tweets: enhancedTweets,
      metadata: {
        generated_at: new Date().toISOString(),
        user_id: userId,
        original_idea: idea,
        provider: usedProvider
      }
    })

  } catch (error: any) {
    console.error('Tweet generation error:', error)
    return NextResponse.json({
      error: 'Failed to generate tweets',
      details: error.message
    }, { status: 500 })
  }
}
