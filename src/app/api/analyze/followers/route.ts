import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { followers, target_username, analysis_type = 'overview' } = body

    if (!followers || !Array.isArray(followers)) {
      return NextResponse.json({ 
        error: 'Followers data is required' 
      }, { status: 400 })
    }

    const xaiApiKey = process.env.XAI_API_KEY
    if (!xaiApiKey) {
      return NextResponse.json({ 
        error: 'xAI API key not configured' 
      }, { status: 503 })
    }

    console.log(`Analyzing ${followers.length} followers for @${target_username}`)

    // Prepare follower data for analysis
    const followerSample = followers.slice(0, 50) // Analyze first 50 for insights
    const followerProfiles = followerSample.map(f => ({
      username: f.username,
      display_name: f.display_name,
      bio: f.bio,
      followers_count: f.followers_count,
      following_count: f.following_count
    }))

    // Create analysis prompt based on type
    let analysisPrompt = ''
    
    if (analysis_type === 'overview') {
      analysisPrompt = `Analyze this follower data for @${target_username} and provide insights:

Follower Sample (${followerSample.length} of ${followers.length} total):
${JSON.stringify(followerProfiles, null, 2)}

Please provide:
1. Audience Demographics: What types of people follow this account?
2. Engagement Patterns: Based on follower counts, what's the engagement potential?
3. Content Interests: What topics/industries are represented?
4. Growth Opportunities: How can @${target_username} better serve this audience?
5. Risk Factors: Any patterns that might lead to unfollows?

Format as JSON with these keys: demographics, engagement_potential, content_interests, growth_opportunities, risk_factors`
    }

    // Call xAI Grok API
    const grokResponse = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${xaiApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messages: [
          {
            role: 'system',
            content: 'You are an expert social media analyst specializing in Twitter/X follower behavior and audience insights. Provide actionable, data-driven analysis.'
          },
          {
            role: 'user',
            content: analysisPrompt
          }
        ],
        model: 'grok-beta',
        stream: false,
        temperature: 0.3
      })
    })

    if (!grokResponse.ok) {
      const errorText = await grokResponse.text()
      console.error('xAI API error:', errorText)
      return NextResponse.json({ 
        error: 'Failed to analyze followers with xAI',
        details: errorText
      }, { status: 500 })
    }

    const grokData = await grokResponse.json()
    const analysisText = grokData.choices[0]?.message?.content

    if (!analysisText) {
      return NextResponse.json({ 
        error: 'No analysis received from xAI' 
      }, { status: 500 })
    }

    // Try to parse JSON response, fallback to text
    let parsedAnalysis
    try {
      parsedAnalysis = JSON.parse(analysisText)
    } catch {
      parsedAnalysis = {
        raw_analysis: analysisText,
        summary: analysisText.substring(0, 500) + '...'
      }
    }

    // Calculate additional metrics
    const totalFollowers = followers.length
    const avgFollowerCount = followers.reduce((sum, f) => sum + (f.followers_count || 0), 0) / totalFollowers
    const avgFollowingCount = followers.reduce((sum, f) => sum + (f.following_count || 0), 0) / totalFollowers
    const verifiedCount = followers.filter(f => f.verified).length
    const withBioCount = followers.filter(f => f.bio && f.bio.trim().length > 0).length

    const metrics = {
      total_followers: totalFollowers,
      avg_follower_count: Math.round(avgFollowerCount),
      avg_following_count: Math.round(avgFollowingCount),
      verified_percentage: Math.round((verifiedCount / totalFollowers) * 100),
      bio_completion_rate: Math.round((withBioCount / totalFollowers) * 100),
      engagement_score: Math.min(100, Math.round((avgFollowerCount / 1000) * 10)) // Simple engagement score
    }

    return NextResponse.json({
      success: true,
      target_username,
      analysis_type,
      total_followers: totalFollowers,
      analyzed_sample: followerSample.length,
      metrics,
      ai_analysis: parsedAnalysis,
      analyzed_at: new Date().toISOString(),
      api_usage: {
        tokens_used: grokData.usage?.total_tokens || 0,
        model: 'grok-beta'
      }
    })

  } catch (error) {
    console.error('Follower analysis error:', error)
    return NextResponse.json({ 
      error: 'Internal server error during analysis',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
