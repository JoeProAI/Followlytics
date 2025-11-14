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
    
    // Check if Gamma requires payment (free tier: under 500 followers)
    const isFreeTier = followerCount < 500
    
    if (isFreeTier) {
      // Check if user has already paid for this export
      const sessionDoc = sessionId ? await adminDb.collection('payment_sessions').doc(sessionId).get() : null
      const hasPaidForExport = sessionDoc?.exists && sessionDoc.data()?.status === 'complete'
      
      if (!hasPaidForExport) {
        // Free tier user needs to pay $5 for Gamma
        console.log(`[Auto-Gamma] Free tier user (@${cleanUsername}, ${followerCount} followers) - requires $5 Gamma payment`)
        
        return NextResponse.json({ 
          error: 'Payment required',
          message: 'Gamma AI presentations require a $5 upgrade for accounts under 500 followers',
          requiresPayment: true,
          amount: 5,
          followerCount,
          upgradeUrl: '/gamma/upgrade'
        }, { status: 402 })
      }
      
      console.log(`[Auto-Gamma] Free tier but already paid for export - including Gamma!`)
    } else {
      console.log(`[Auto-Gamma] ${followerCount} followers - Gamma included for free!`)
    }
    
    // Get ALL followers for comprehensive analysis (not just 50!)
    const followersSnapshot = await adminDb
      .collection('follower_database')
      .doc(cleanUsername)
      .collection('followers')
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
    
    // Use models available on standard Gamma plan (exact names from API)
    const availableModels = [
      'dall-e-3',              // OpenAI
      'flux-1-pro',            // Flux Pro
      'ideogram-v3',           // Ideogram v3
      'recraft-v3'             // Recraft v3
    ]
    
    // Pick random model for variety
    const selectedModel = availableModels[Math.floor(Math.random() * availableModels.length)]
    console.log(`[Auto-Gamma] Selected image model: ${selectedModel}`)
    
    // Use ALL 50 real Gamma theme IDs (fetched from API)
    const gammaThemes = [
      'alien', 'ash', 'ashrose', 'atacama', 'atmosphere', 'aurora', 'aurum',
      'default-dark', 'default-light', 'bee-happy', 'blueberry', 'blues',
      'blue-steel', 'bonan-hale', 'borealis', 'breeze', 'bubble-gum',
      'canaveral', 'chimney-dust', 'chimney-smoke', 'chisel', 'chocolate',
      'cigar', 'clementa', 'coal', 'commons', 'consultant', 'coral-glow',
      'cornfield', 'cornflower', 'creme', 'daktilo', 'dawn', 'daydream',
      'dialogue', 'dune', 'editoria', 'electric', 'elysia', 'finesse',
      'ag4mc9ggtxi8iyi', 'flax', 'fluo', 'founder', 'gamma', 'gamma-dark',
      'gleam', 'gold-leaf', 'howlite', 'icebreaker'
    ]
    
    const selectedTheme = gammaThemes[Math.floor(Math.random() * gammaThemes.length)]
    console.log(`[Auto-Gamma] Selected theme: ${selectedTheme}`)
    
    const result = await gamma.generate({
      text: aiPrompt,
      type: 'presentation',
      themeId: selectedTheme,  // Use real Gamma theme ID
      imageOptions: {
        model: selectedModel
      },
      textOptions: {
        language: 'en'
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
      theme: selectedTheme,      // Track which theme was used
      imageModel: selectedModel,  // Track which image model was used
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
  
  // Data-driven, specific prompt tied to user's custom instructions
  let prompt = `Create a professional, data-driven audience intelligence presentation for @${username}.

📊 REAL DATA - AUDIENCE ANALYSIS:
• Total Twitter Followers: ${followerCount.toLocaleString()}
• Analyzed Accounts: ${extractedCount.toLocaleString()}
• Average Follower Influence: ${insights.avgFollowers.toLocaleString()} followers each
• Combined Network Reach: ${insights.totalInfluence.toLocaleString()} people

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

  // PRIORITIZE user's custom instructions - this is what they care about!
  if (customInstructions && customInstructions.trim()) {
    prompt += `🎯 PRIMARY FOCUS (CRITICAL - Build entire presentation around this):
${customInstructions}

Analyze the follower list specifically for people/accounts related to this topic. Highlight relevant influencers, experts, and connections in this niche. Show how @${username}'s audience aligns with or relates to this focus area.

`
  }

  // Clear, actionable presentation requirements
  prompt += `📋 PRESENTATION REQUIREMENTS:

1. OPENING: Start with the most impressive stat tied to the custom focus
2. AUDIENCE BREAKDOWN: Show who follows @${username} with real data and percentages
3. TOP INFLUENCERS: Highlight the 10 most influential followers WITH their specific relevance to the custom focus
4. GEOGRAPHIC INSIGHTS: Map showing where the audience is located
5. OPPORTUNITY ANALYSIS: Based on the follower data, what opportunities exist related to "${customInstructions}"?
6. ACTIONABLE NEXT STEPS: Specific recommendations for leveraging this audience

🎨 DESIGN:
- Clean, professional, modern aesthetic
- Data visualizations (charts, graphs, maps)
- Easy to read and understand
- Suitable for sharing with partners, brands, or investors

⚠️ CRITICAL: Every insight must be backed by the actual follower data provided. No generic statements. Use specific numbers, names, and facts from the analysis above.`

  return prompt
}
