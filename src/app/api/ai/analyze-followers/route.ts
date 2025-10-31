import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase-admin'
import OpenAI from 'openai'

/**
 * AI-powered follower analysis
 * Analyzes selected followers to provide insights about audience composition,
 * influence, and strategic recommendations
 */
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const idToken = authHeader.split('Bearer ')[1]
    const decodedToken = await adminAuth.verifyIdToken(idToken)
    const userId = decodedToken.uid

    const { followers, targetUsername } = await request.json()

    if (!followers || !Array.isArray(followers) || followers.length === 0) {
      return NextResponse.json({ error: 'Followers array required' }, { status: 400 })
    }

    console.log(`[AI Analysis] Analyzing ${followers.length} followers for user ${userId}`)

    // Initialize OpenAI at runtime
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    })

    // Prepare follower data for analysis
    const followerSummary = followers.map(f => ({
      username: f.username,
      name: f.name,
      bio: f.bio?.substring(0, 200) || 'No bio',
      followers: f.followersCount || f.followers_count || 0,
      verified: f.verified || false
    }))

    // Create AI analysis prompt
    const prompt = `Analyze these ${followers.length} followers and provide strategic insights:

${JSON.stringify(followerSummary, null, 2)}

Provide a comprehensive analysis covering:
1. **Audience Composition**: What types of people follow this account? (professionals, enthusiasts, brands, etc.)
2. **Influence Level**: Overall influence and reach based on follower counts
3. **Key Influencers**: Top 5 most influential followers and why they matter
4. **Industry Patterns**: Common themes, industries, or interests
5. **Engagement Potential**: Which followers are most likely to engage and amplify content
6. **Strategic Recommendations**: How to leverage this audience for growth
7. **Red Flags**: Any bot accounts, inactive users, or quality concerns

Format as JSON with these keys:
{
  "audienceComposition": { "types": ["type1", "type2"], "summary": "..." },
  "influenceLevel": { "score": 1-10, "summary": "..." },
  "keyInfluencers": [{ "username": "...", "reason": "..." }],
  "industryPatterns": { "themes": ["theme1", "theme2"], "summary": "..." },
  "engagementPotential": { "score": 1-10, "highPotential": ["username1"], "summary": "..." },
  "recommendations": ["rec1", "rec2", "rec3"],
  "redFlags": { "concerns": ["concern1"], "summary": "..." },
  "overallScore": 1-100,
  "summary": "One paragraph executive summary"
}`

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'You are an expert social media analyst specializing in audience intelligence and growth strategy. Analyze follower data to provide actionable insights.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      response_format: { type: 'json_object' }
    })

    const analysisText = completion.choices[0]?.message?.content
    if (!analysisText) {
      throw new Error('No analysis generated')
    }

    const analysis = JSON.parse(analysisText)

    // Store analysis in Firestore
    const analysisRef = await adminDb
      .collection('users')
      .doc(userId)
      .collection('follower_analyses')
      .add({
        target_username: targetUsername?.toLowerCase() || null,
        follower_count: followers.length,
        analysis,
        analyzed_followers: followers.map(f => f.username),
        created_at: new Date().toISOString(),
        model: 'gpt-4o'
      })

    console.log(`[AI Analysis] Saved analysis: ${analysisRef.id}`)

    return NextResponse.json({
      success: true,
      analysisId: analysisRef.id,
      analysis,
      followerCount: followers.length,
      targetUsername
    })

  } catch (error: any) {
    console.error('[AI Analysis] Error:', error)
    return NextResponse.json({
      error: 'Failed to analyze followers',
      details: error.message
    }, { status: 500 })
  }
}

/**
 * Get all follower analyses for a user
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const idToken = authHeader.split('Bearer ')[1]
    const decodedToken = await adminAuth.verifyIdToken(idToken)
    const userId = decodedToken.uid

    const { searchParams } = new URL(request.url)
    const targetUsername = searchParams.get('target')

    // Get analyses, optionally filtered by target
    let query = adminDb
      .collection('users')
      .doc(userId)
      .collection('follower_analyses')
      .orderBy('created_at', 'desc')
      .limit(20)

    if (targetUsername) {
      query = query.where('target_username', '==', targetUsername.toLowerCase()) as any
    }

    const snapshot = await query.get()

    const analyses = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }))

    return NextResponse.json({
      success: true,
      analyses,
      count: analyses.length
    })

  } catch (error: any) {
    console.error('[AI Analysis] Get error:', error)
    return NextResponse.json({
      error: 'Failed to load analyses',
      details: error.message
    }, { status: 500 })
  }
}
