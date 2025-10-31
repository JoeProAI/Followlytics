import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase-admin'
import { FieldValue } from 'firebase-admin/firestore'
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

    // Create AI analysis prompt with both individual AND aggregate analysis
    const prompt = `Analyze these ${followers.length} followers. Provide BOTH individual analysis for each follower AND aggregate insights about the group.

FOLLOWERS TO ANALYZE:
${JSON.stringify(followerSummary, null, 2)}

Provide a comprehensive analysis with:

1. **INDIVIDUAL FOLLOWER ANALYSIS** - For EACH follower, provide:
   - Category: (e.g., "Tech Influencer", "Entrepreneur", "Content Creator", "Brand", "Investor", etc.)
   - Influence Score: 1-10 based on follower count and verification
   - Engagement Value: HIGH/MEDIUM/LOW - likelihood to engage/amplify
   - Strategic Value: Why this follower matters to you
   - Action: One specific recommendation for engaging with them
   - Priority: HIGH/MEDIUM/LOW for outreach

2. **AGGREGATE ANALYSIS** - Overall insights about the group:
   - Audience Composition: What types of people follow this account
   - Overall Influence Level: Score 1-10
   - Key Themes: Common industries/interests
   - Engagement Potential: Score 1-10
   - Strategic Recommendations: How to leverage this audience
   - Red Flags: Any concerns

Format as JSON:
{
  "individualAnalyses": [
    {
      "username": "...",
      "name": "...",
      "category": "...",
      "influenceScore": 1-10,
      "engagementValue": "HIGH/MEDIUM/LOW",
      "strategicValue": "...",
      "actionRecommendation": "...",
      "priority": "HIGH/MEDIUM/LOW"
    }
  ],
  "aggregateAnalysis": {
    "audienceComposition": { "types": ["type1"], "summary": "..." },
    "influenceLevel": { "score": 1-10, "summary": "..." },
    "industryPatterns": { "themes": ["theme1"], "summary": "..." },
    "engagementPotential": { "score": 1-10, "summary": "..." },
    "recommendations": ["rec1", "rec2"],
    "redFlags": { "concerns": ["concern1"], "summary": "..." }
  },
  "overallScore": 1-100,
  "summary": "Executive summary"
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

    // Calculate AI cost
    const usage = completion.usage
    const inputTokens = usage?.prompt_tokens || 0
    const outputTokens = usage?.completion_tokens || 0
    
    // GPT-4o pricing: $2.50 per 1M input tokens, $10.00 per 1M output tokens
    const inputCost = (inputTokens / 1_000_000) * 2.50
    const outputCost = (outputTokens / 1_000_000) * 10.00
    const totalCost = inputCost + outputCost

    console.log(`[AI Analysis] Cost: $${totalCost.toFixed(4)} (${inputTokens} input + ${outputTokens} output tokens)`)

    // Store analysis in Firestore with cost tracking
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
        model: 'gpt-4o',
        cost: {
          input_tokens: inputTokens,
          output_tokens: outputTokens,
          total_tokens: inputTokens + outputTokens,
          input_cost: inputCost,
          output_cost: outputCost,
          total_cost: totalCost,
          currency: 'USD'
        }
      })

    // Update user's total AI cost
    const userStatsRef = adminDb.collection('users').doc(userId).collection('stats').doc('ai_usage')
    await userStatsRef.set({
      total_analyses: FieldValue.increment(1),
      total_followers_analyzed: FieldValue.increment(followers.length),
      total_cost: FieldValue.increment(totalCost),
      total_tokens: FieldValue.increment(inputTokens + outputTokens),
      last_analysis: new Date().toISOString()
    }, { merge: true })

    // Also update individual follower documents with AI insights
    if (analysis.individualAnalyses && Array.isArray(analysis.individualAnalyses)) {
      const batch = adminDb.batch()
      
      for (const individualAnalysis of analysis.individualAnalyses) {
        // Find follower document
        const followerSnapshot = await adminDb
          .collection('users')
          .doc(userId)
          .collection('followers')
          .where('username', '==', individualAnalysis.username)
          .where('target_username', '==', targetUsername?.toLowerCase() || null)
          .limit(1)
          .get()
        
        if (!followerSnapshot.empty) {
          const followerDoc = followerSnapshot.docs[0]
          batch.update(followerDoc.ref, {
            ai_analysis: {
              category: individualAnalysis.category,
              influenceScore: individualAnalysis.influenceScore,
              engagementValue: individualAnalysis.engagementValue,
              strategicValue: individualAnalysis.strategicValue,
              actionRecommendation: individualAnalysis.actionRecommendation,
              priority: individualAnalysis.priority,
              analyzed_at: new Date().toISOString()
            }
          })
        }
      }
      
      await batch.commit()
      console.log(`[AI Analysis] Updated ${analysis.individualAnalyses.length} follower documents with AI insights`)
    }

    console.log(`[AI Analysis] Saved analysis: ${analysisRef.id}`)

    return NextResponse.json({
      success: true,
      analysisId: analysisRef.id,
      analysis,
      followerCount: followers.length,
      targetUsername,
      cost: {
        total_cost: totalCost,
        input_tokens: inputTokens,
        output_tokens: outputTokens,
        model: 'gpt-4o'
      }
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
