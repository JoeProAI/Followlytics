import { NextRequest, NextResponse } from 'next/server'
import { adminAuth as auth } from '@/lib/firebase-admin'
import OpenAI from 'openai'

export const maxDuration = 60

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.split('Bearer ')[1]
    const decodedToken = await auth.verifyIdToken(token)
    const userId = decodedToken.uid

    const { idea, variations = 10 } = await request.json()

    if (!idea) {
      return NextResponse.json({ error: 'Idea is required' }, { status: 400 })
    }

    console.log(`🤖 Generating ${variations} tweet variations for user: ${userId}`)

    // Use GPT-4 to generate multiple tweet variations
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are an expert social media strategist who creates viral tweets. Generate ${variations} different tweet variations about the given topic. Each tweet should:
- Be 280 characters or less
- Use different tones (professional, casual, humorous, provocative, inspiring)
- Include relevant emojis where appropriate
- Be designed for maximum engagement
- Have clear hooks and calls to action

Return ONLY a JSON array of objects with this structure:
[
  {
    "text": "the tweet text",
    "tone": "professional|casual|humorous|provocative|inspiring",
    "viralScore": 1-100,
    "estimatedReach": "1K|10K|100K|1M",
    "sentiment": "positive|neutral|negative",
    "hooks": ["hook1", "hook2"]
  }
]`
        },
        {
          role: "user",
          content: `Generate ${variations} viral tweet variations about: ${idea}`
        }
      ],
      temperature: 0.9,
      max_tokens: 2000
    })

    const responseText = completion.choices[0]?.message?.content
    if (!responseText) {
      throw new Error('No response from AI')
    }

    // Parse the JSON response
    let tweets
    try {
      tweets = JSON.parse(responseText)
    } catch (parseError) {
      // If parsing fails, try to extract JSON from markdown code blocks
      const jsonMatch = responseText.match(/```json\n([\s\S]+?)\n```/) || responseText.match(/```\n([\s\S]+?)\n```/)
      if (jsonMatch) {
        tweets = JSON.parse(jsonMatch[1])
      } else {
        throw new Error('Failed to parse AI response')
      }
    }

    // Enhance each tweet with additional metrics
    const enhancedTweets = tweets.map((tweet: any, index: number) => ({
      ...tweet,
      length: tweet.text.length,
      rank: index + 1,
      id: `tweet_${Date.now()}_${index}`
    }))

    // Sort by viral score
    enhancedTweets.sort((a: any, b: any) => b.viralScore - a.viralScore)

    console.log(`✅ Generated ${enhancedTweets.length} tweets successfully`)

    return NextResponse.json({
      success: true,
      tweets: enhancedTweets,
      metadata: {
        generated_at: new Date().toISOString(),
        user_id: userId,
        original_idea: idea,
        model: 'gpt-4o-mini'
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
