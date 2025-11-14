// Auto-generate Gamma presentation after payment
// AI creates smart prompt based on follower data + user instructions
import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase-admin'
import { getGammaClient } from '@/lib/gamma-client'

export const maxDuration = 60

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const idToken = authHeader.split('Bearer ')[1]
    const decodedToken = await adminAuth.verifyIdToken(idToken)
    const userId = decodedToken.uid

    const { 
      username, 
      customInstructions = '',
      gammaStyle = 'professional',
      sessionId
    } = await request.json()

    if (!username) {
      return NextResponse.json({ error: 'Username required' }, { status: 400 })
    }

    const cleanUsername = username.replace('@', '').toLowerCase()
    
    console.log(`[Auto-Gamma] Starting AI presentation for @${cleanUsername}`)

    // Get follower data snapshot for context
    const followerDoc = await adminDb.collection('follower_database').doc(cleanUsername).get()
    
    if (!followerDoc.exists) {
      return NextResponse.json({ error: 'No follower data found' }, { status: 404 })
    }

    const data = followerDoc.data()!
    const followerCount = data.apiFollowerCount || data.followerCount || 0
    const extractedCount = data.followerCount || 0
    
    // Get sample of top followers for AI context
    const followersSnapshot = await adminDb
      .collection('follower_database')
      .doc(cleanUsername)
      .collection('followers')
      .limit(50)
      .get()
    
    let topFollowers: any[] = []
    let insights = {
      avgFollowers: 0,
      topLocations: [] as string[],
      totalInfluence: 0
    }
    
    if (!followersSnapshot.empty) {
      topFollowers = followersSnapshot.docs
        .map(doc => doc.data())
        .sort((a, b) => (b.followersCount || 0) - (a.followersCount || 0))
        .slice(0, 10)
      
      const allFollowers = followersSnapshot.docs.map(doc => doc.data())
      
      // Calculate insights
      insights.totalInfluence = allFollowers.reduce((sum, f) => sum + (f.followersCount || 0), 0)
      insights.avgFollowers = Math.round(insights.totalInfluence / allFollowers.length)
      
      // Get top locations
      const locations: Record<string, number> = {}
      allFollowers.forEach(f => {
        if (f.location && f.location.trim()) {
          locations[f.location.trim()] = (locations[f.location.trim()] || 0) + 1
        }
      })
      insights.topLocations = Object.entries(locations)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([loc]) => loc)
    }

    // AI-GENERATED PROMPT based on data + user instructions
    const aiPrompt = generateSmartPrompt({
      username: cleanUsername,
      followerCount,
      extractedCount,
      topFollowers,
      insights,
      customInstructions,
      gammaStyle
    })

    console.log(`[Auto-Gamma] AI generated prompt (${aiPrompt.length} chars)`)

    // Check if Gamma API key is set
    if (!process.env.GAMMA_API_KEY) {
      console.error('[Auto-Gamma] GAMMA_API_KEY not set in environment')
      return NextResponse.json({
        error: 'Gamma API not configured',
        details: 'GAMMA_API_KEY environment variable missing'
      }, { status: 500 })
    }

    // Generate with Gamma AI
    console.log('[Auto-Gamma] Initializing Gamma client...')
    const gamma = getGammaClient()
    console.log('[Auto-Gamma] Gamma client initialized')
    
    const result = await gamma.generate({
      text: aiPrompt,
      type: 'presentation',
      imageOptions: {
        model: 'dalle3'
      },
      textOptions: {
        language: 'English',
        tone: gammaStyle === 'clean' ? 'professional' : gammaStyle as any,
        detailLevel: 'comprehensive'
      }
    })

    // Store in user's history
    await adminDb.collection('users').doc(userId).collection('gamma_generations').add({
      gammaId: result.gamma_id,
      username: cleanUsername,
      sessionId: sessionId,
      prompt: aiPrompt.substring(0, 500), // Store first 500 chars
      customInstructions,
      gammaStyle,
      followerCount,
      createdAt: new Date(),
      status: 'processing'
    })

    // Also store reference in follower_database for easy lookup
    await adminDb.collection('follower_database').doc(cleanUsername).set({
      gammaGeneration: {
        gammaId: result.gamma_id,
        status: 'processing',
        createdAt: new Date(),
        sessionId: sessionId
      }
    }, { merge: true })

    console.log(`[Auto-Gamma] Generated successfully: ${result.gamma_id}`)

    return NextResponse.json({
      success: true,
      gammaId: result.gamma_id,
      status: result.status,
      message: 'AI presentation is being generated...'
    })

  } catch (error: any) {
    console.error('[Auto-Gamma] Error:', error)
    return NextResponse.json({
      error: 'Failed to generate presentation',
      details: error.message
    }, { status: 500 })
  }
}

// AI generates smart prompt based on follower data
function generateSmartPrompt(params: {
  username: string
  followerCount: number
  extractedCount: number
  topFollowers: any[]
  insights: any
  customInstructions: string
  gammaStyle: string
}): string {
  const { username, followerCount, extractedCount, topFollowers, insights, customInstructions } = params
  
  // Base analysis
  let prompt = `Create a professional follower analysis presentation for @${username}

AUDIENCE OVERVIEW:
- Total Followers: ${followerCount.toLocaleString()}
- Accessible Accounts: ${extractedCount.toLocaleString()}
- Average Follower Influence: ${insights.avgFollowers.toLocaleString()} followers each
- Total Network Reach: ${insights.totalInfluence.toLocaleString()} people

`

  // Add top influencers
  if (topFollowers.length > 0) {
    prompt += `TOP 10 MOST INFLUENTIAL FOLLOWERS:
${topFollowers.map((f, i) => `${i + 1}. @${f.username} - ${(f.followersCount || 0).toLocaleString()} followers${f.name ? ` (${f.name})` : ''}`).join('\n')}

`
  }

  // Add geographic insights
  if (insights.topLocations.length > 0) {
    prompt += `GEOGRAPHIC DISTRIBUTION:
Top Locations: ${insights.topLocations.join(', ')}

`
  }

  // Add user's custom instructions
  if (customInstructions && customInstructions.trim()) {
    prompt += `CUSTOM FOCUS:
${customInstructions}

`
  }

  // Add presentation guidelines
  prompt += `PRESENTATION REQUIREMENTS:
- Create a visually stunning, data-driven presentation
- Include charts showing follower influence distribution
- Highlight key insights about the audience composition
- Show growth potential and engagement opportunities
- Use professional design with modern aesthetics
- Include actionable recommendations
- Make it suitable for sharing with brands, investors, or stakeholders

Focus on making this presentation impressive, shareable, and valuable for understanding the audience and its potential.`

  return prompt
}
