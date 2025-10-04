/**
 * Grok API Integration (xAI)
 * Uses Grok-2-latest (highest model) but only when AI analysis is needed
 */

interface GrokAnalysisResponse {
  performance_score: number
  why_it_worked: string[]
  success_factors: string[]
  improvements: string[]
  content_type: string
}

export class GrokAPI {
  private apiKey: string
  private baseURL: string

  constructor() {
    this.apiKey = process.env.XAI_API_KEY || process.env.GROK_API_KEY || ''
    if (!this.apiKey) {
      console.warn('⚠️ XAI_API_KEY not set - AI analysis will be disabled')
    }
    // Grok API is OpenAI-compatible, uses same endpoint structure
    this.baseURL = 'https://api.x.ai/v1'
  }

  /**
   * Analyze why a tweet performed well
   * Uses Grok-2-latest (highest model, better than GPT-4)
   */
  async analyzeTweetPerformance(
    tweetText: string,
    metrics: {
      likes: number
      retweets: number
      replies: number
      engagement_rate: string
      impressions: number
    }
  ): Promise<GrokAnalysisResponse | null> {
    if (!this.apiKey) {
      console.warn('Skipping AI analysis - no API key')
      return null
    }

    try {
      const response = await fetch(`${this.baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: 'grok-2-latest', // Highest Grok model
          messages: [
            {
              role: 'system',
              content: `You are Grok, an expert X/Twitter analyst. Analyze why this post performed well and provide actionable improvement suggestions. Be specific, data-driven, and witty.`
            },
            {
              role: 'user',
              content: `Analyze this X post:

TEXT: "${tweetText}"

METRICS:
- Likes: ${metrics.likes}
- Retweets: ${metrics.retweets}
- Replies: ${metrics.replies}
- Engagement Rate: ${metrics.engagement_rate}%
- Impressions (estimated): ${metrics.impressions}

Provide:
1. Why it performed well (2-3 specific reasons)
2. Key success factors (hook, content type, timing, etc.)
3. How to improve (2-3 actionable suggestions)

Return ONLY a JSON object (no markdown):
{
  "performance_score": 1-100,
  "why_it_worked": ["reason1", "reason2"],
  "success_factors": ["factor1", "factor2"],
  "improvements": ["suggestion1", "suggestion2"],
  "content_type": "educational|entertaining|promotional|thread|viral"
}`
            }
          ],
          temperature: 0.3,
          max_tokens: 600
        })
      })

      if (!response.ok) {
        const error = await response.text()
        console.error('Grok API error:', error)
        return null
      }

      const data = await response.json()
      const aiResponse = data.choices[0]?.message?.content

      if (!aiResponse) {
        return null
      }

      // Parse JSON response
      let parsedAnalysis
      try {
        parsedAnalysis = JSON.parse(aiResponse)
      } catch {
        // Try to extract JSON from markdown if Grok wrapped it
        const jsonMatch = aiResponse.match(/```json\n([\s\S]+?)\n```/) || 
                          aiResponse.match(/```\n([\s\S]+?)\n```/) ||
                          aiResponse.match(/\{[\s\S]+\}/)
        if (jsonMatch) {
          const jsonStr = jsonMatch[1] || jsonMatch[0]
          parsedAnalysis = JSON.parse(jsonStr)
        } else {
          console.error('Failed to parse Grok response:', aiResponse)
          return null
        }
      }

      return parsedAnalysis as GrokAnalysisResponse

    } catch (error) {
      console.error('Error calling Grok API:', error)
      return null
    }
  }

  /**
   * Analyze content strategy across multiple tweets
   * Only use when user explicitly requests deep analysis
   */
  async analyzeContentStrategy(
    tweets: Array<{ text: string; metrics: any }>,
    username: string
  ): Promise<any> {
    if (!this.apiKey) {
      return null
    }

    try {
      const tweetsSummary = tweets.slice(0, 10).map((t, i) => 
        `${i + 1}. "${t.text}" (${t.metrics.like_count} likes, ${t.metrics.repost_count} RTs)`
      ).join('\n')

      const response = await fetch(`${this.baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: 'grok-2-latest',
          messages: [
            {
              role: 'system',
              content: `You are Grok, an expert X/Twitter strategist. Analyze @${username}'s content strategy and provide actionable recommendations.`
            },
            {
              role: 'user',
              content: `Analyze these recent tweets from @${username}:

${tweetsSummary}

Provide strategic insights:
1. Content themes that work best
2. Posting patterns and timing
3. Engagement optimization tactics
4. 3 specific recommendations to improve performance

Return as JSON with keys: themes, patterns, tactics, recommendations`
            }
          ],
          temperature: 0.4,
          max_tokens: 800
        })
      })

      if (!response.ok) {
        return null
      }

      const data = await response.json()
      const aiResponse = data.choices[0]?.message?.content

      try {
        return JSON.parse(aiResponse)
      } catch {
        const jsonMatch = aiResponse.match(/\{[\s\S]+\}/)
        return jsonMatch ? JSON.parse(jsonMatch[0]) : null
      }

    } catch (error) {
      console.error('Error analyzing content strategy:', error)
      return null
    }
  }
}

export default GrokAPI
