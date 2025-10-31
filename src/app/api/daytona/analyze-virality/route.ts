import { NextRequest, NextResponse } from 'next/server'
import { withPaymentGate, isPaymentGateError } from '@/lib/paymentGate'
import OpenAI from 'openai'

export const maxDuration = 30

export async function POST(request: NextRequest) {
  // Initialize OpenAI at runtime (not build time)
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
  })
  try {
    // Payment gate: requires Pro tier + AI analysis feature
    const gateResult = await withPaymentGate(request, {
      requireTier: 'pro',
      requireFeature: 'ai_analysis',
      trackUsage: true,
      endpoint: '/api/daytona/analyze-virality'
    })

    if (isPaymentGateError(gateResult)) {
      return gateResult
    }

    const { userId } = gateResult
    const { content } = await request.json()

    if (!content) {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 })
    }

    console.log(`📊 Analyzing viral potential for user: ${userId}`)

    // Use GPT-4 to analyze viral potential
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are an expert in viral social media content analysis. Analyze the given tweet content and predict its viral potential.

Return ONLY a JSON object with this structure:
{
  "viralScore": 1-100,
  "estimatedReach": "1K|10K|100K|1M|10M",
  "strengths": ["strength1", "strength2", "strength3"],
  "weaknesses": ["weakness1", "weakness2"],
  "improvements": ["suggestion1", "suggestion2", "suggestion3"],
  "sentiment": "positive|neutral|negative",
  "tone": "professional|casual|humorous|provocative|inspiring",
  "hashtagSuggestions": ["#tag1", "#tag2", "#tag3"],
  "bestTimeToPost": "morning|afternoon|evening|night",
  "targetAudience": "who this resonates with"
}`
        },
        {
          role: "user",
          content: `Analyze this tweet content for viral potential: ${content}`
        }
      ],
      temperature: 0.3,
      max_tokens: 800
    })

    const responseText = completion.choices[0]?.message?.content
    if (!responseText) {
      throw new Error('No response from AI')
    }

    // Parse the JSON response
    let analysis
    try {
      analysis = JSON.parse(responseText)
    } catch (parseError) {
      // If parsing fails, try to extract JSON from markdown code blocks
      const jsonMatch = responseText.match(/```json\n([\s\S]+?)\n```/) || responseText.match(/```\n([\s\S]+?)\n```/)
      if (jsonMatch) {
        analysis = JSON.parse(jsonMatch[1])
      } else {
        throw new Error('Failed to parse AI response')
      }
    }

    console.log(`✅ Viral score: ${analysis.viralScore}/100`)

    return NextResponse.json({
      success: true,
      ...analysis,
      metadata: {
        analyzed_at: new Date().toISOString(),
        user_id: userId,
        content_length: content.length,
        model: 'gpt-4o-mini'
      }
    })

  } catch (error: any) {
    console.error('Virality analysis error:', error)
    return NextResponse.json({
      error: 'Failed to analyze viral potential',
      details: error.message
    }, { status: 500 })
  }
}
