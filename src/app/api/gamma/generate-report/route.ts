import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase-admin'

/**
 * Generate a beautiful Gamma presentation from follower analysis
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

    const { analysisId } = await request.json()

    if (!analysisId) {
      return NextResponse.json({ error: 'Analysis ID required' }, { status: 400 })
    }

    // Get the analysis data
    const analysisDoc = await adminDb
      .collection('users')
      .doc(userId)
      .collection('follower_analyses')
      .doc(analysisId)
      .get()

    if (!analysisDoc.exists) {
      return NextResponse.json({ error: 'Analysis not found' }, { status: 404 })
    }

    const analysisData = analysisDoc.data()
    const analysis = analysisData?.analysis

    // Build Gamma presentation prompt
    const gammaPrompt = buildGammaPrompt(analysisData, analysis)

    // Call Gamma API
    const gammaResponse = await fetch('https://api.gamma.app/api/v1/generate', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GAMMA_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        text: gammaPrompt,
        mode: 'paste',
        options: {
          textOptions: {
            language: 'en'
          },
          imageOptions: {
            model: 'dall-e-3',
            generate: true
          }
        }
      })
    })

    if (!gammaResponse.ok) {
      const error = await gammaResponse.text()
      console.error('[Gamma] API Error:', error)
      throw new Error(`Gamma API failed: ${gammaResponse.status}`)
    }

    const gammaData = await gammaResponse.json()

    // Store Gamma URL in analysis document
    await adminDb
      .collection('users')
      .doc(userId)
      .collection('follower_analyses')
      .doc(analysisId)
      .update({
        gamma_report: {
          url: gammaData.url,
          id: gammaData.id,
          created_at: new Date().toISOString()
        }
      })

    return NextResponse.json({
      success: true,
      gamma: {
        url: gammaData.url,
        id: gammaData.id
      }
    })

  } catch (error: any) {
    console.error('[Gamma] Generation error:', error)
    return NextResponse.json({
      error: 'Failed to generate Gamma report',
      details: error.message
    }, { status: 500 })
  }
}

function buildGammaPrompt(analysisData: any, analysis: any): string {
  const target = analysisData.target_username ? `@${analysisData.target_username}` : 'Account'
  const followerCount = analysisData.follower_count
  const score = analysis.overallScore

  // Build comprehensive prompt for Gamma
  let prompt = `# 🤖 AI Follower Analysis Report: ${target}

## Executive Summary
${analysis.summary}

**Overall Score:** ${score}/100 - ${score >= 80 ? 'Excellent' : score >= 60 ? 'Good' : score >= 40 ? 'Average' : 'Needs Improvement'}

**Analyzed:** ${followerCount} followers
**Date:** ${new Date(analysisData.created_at).toLocaleDateString()}

---

## 📊 Audience Composition
`

  // Add aggregate or legacy audience composition
  const audienceComp = analysis.aggregateAnalysis?.audienceComposition || analysis.audienceComposition
  if (audienceComp) {
    prompt += `**Types of Followers:**\n`
    audienceComp.types.forEach((type: string) => {
      prompt += `- ${type}\n`
    })
    prompt += `\n${audienceComp.summary}\n\n`
  }

  prompt += `---

## ⭐ Influence Analysis
`

  const influenceLevel = analysis.aggregateAnalysis?.influenceLevel || analysis.influenceLevel
  if (influenceLevel) {
    prompt += `**Influence Score:** ${influenceLevel.score}/10

${influenceLevel.summary}

`
  }

  // Add individual follower highlights if available
  if (analysis.individualAnalyses && analysis.individualAnalyses.length > 0) {
    const highPriority = analysis.individualAnalyses.filter((f: any) => f.priority === 'HIGH').slice(0, 5)
    
    if (highPriority.length > 0) {
      prompt += `---

## 🌟 Top Priority Followers

`
      highPriority.forEach((follower: any) => {
        prompt += `### @${follower.username} - ${follower.category}
**Influence Score:** ${follower.influenceScore}/10
**Engagement Value:** ${follower.engagementValue}

**Why They Matter:**
${follower.strategicValue}

**Recommended Action:**
${follower.actionRecommendation}

`
      })
    }
  }

  prompt += `---

## 🎯 Industry Patterns
`

  const industryPatterns = analysis.aggregateAnalysis?.industryPatterns || analysis.industryPatterns
  if (industryPatterns) {
    prompt += `**Key Themes:**\n`
    industryPatterns.themes.forEach((theme: string) => {
      prompt += `- ${theme}\n`
    })
    prompt += `\n${industryPatterns.summary}\n\n`
  }

  prompt += `---

## 🚀 Engagement Potential
`

  const engagementPotential = analysis.aggregateAnalysis?.engagementPotential || analysis.engagementPotential
  if (engagementPotential) {
    prompt += `**Engagement Score:** ${engagementPotential.score}/10

${engagementPotential.summary}

`
  }

  prompt += `---

## 💡 Strategic Recommendations
`

  const recommendations = analysis.aggregateAnalysis?.recommendations || analysis.recommendations
  if (recommendations && Array.isArray(recommendations)) {
    recommendations.forEach((rec: string, i: number) => {
      prompt += `${i + 1}. ${rec}\n`
    })
  }

  // Add red flags if any
  const redFlags = analysis.aggregateAnalysis?.redFlags || analysis.redFlags
  if (redFlags && redFlags.concerns && redFlags.concerns.length > 0) {
    prompt += `

---

## ⚠️ Red Flags & Concerns
`
    redFlags.concerns.forEach((concern: string) => {
      prompt += `- ${concern}\n`
    })
    prompt += `\n${redFlags.summary}\n`
  }

  prompt += `

---

## 📈 Data Breakdown

**Total Followers Analyzed:** ${followerCount}
**Analysis Model:** GPT-4o
**Report Generated:** ${new Date().toLocaleString()}

This report provides AI-powered insights into your follower base to help you make strategic decisions about engagement, content, and growth.
`

  return prompt
}
