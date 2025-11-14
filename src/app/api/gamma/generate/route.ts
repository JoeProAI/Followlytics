// Generate custom presentation using Gamma AI + user's follower data
import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase-admin'
import { getGammaClient } from '@/lib/gamma-client'

export const maxDuration = 60 // Gamma can take time to generate

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
      prompt, 
      username, 
      type = 'presentation',
      theme,
      tone = 'professional',
      audience,
      includeFollowerData = true,
      imageModel = 'dalle3',
      language = 'English'
    } = await request.json()

    if (!prompt) {
      return NextResponse.json({ error: 'Prompt required' }, { status: 400 })
    }

    console.log(`[Gamma] Generating ${type} for user ${userId}: "${prompt}"`)

    // Get user's follower data if requested
    let followerContext = ''
    
    if (includeFollowerData && username) {
      const cleanUsername = username.replace('@', '').toLowerCase()
      
      // Get follower data from database
      const followerDoc = await adminDb.collection('follower_database').doc(cleanUsername).get()
      
      if (followerDoc.exists) {
        const data = followerDoc.data()!
        const followerCount = data.followerCount || 0
        
        // Get sample of followers for context
        const followersSnapshot = await adminDb
          .collection('follower_database')
          .doc(cleanUsername)
          .collection('followers')
          .limit(100) // Sample top 100 for context
          .get()
        
        if (!followersSnapshot.empty) {
          const followers = followersSnapshot.docs.map(doc => doc.data())
          
          // Calculate insights
          const totalFollowerCount = followers.reduce((sum, f) => sum + (f.followersCount || 0), 0)
          const avgFollowers = Math.round(totalFollowerCount / followers.length)
          const topFollowers = followers
            .sort((a, b) => (b.followersCount || 0) - (a.followersCount || 0))
            .slice(0, 10)
          
          // Build context for Gamma
          followerContext = `

FOLLOWER DATA CONTEXT:
- Account: @${cleanUsername}
- Total Followers: ${followerCount.toLocaleString()}
- Average follower count of your followers: ${avgFollowers.toLocaleString()}

TOP 10 MOST INFLUENTIAL FOLLOWERS:
${topFollowers.map((f, i) => `${i + 1}. @${f.username} (${f.name}) - ${(f.followersCount || 0).toLocaleString()} followers`).join('\n')}

FOLLOWER INSIGHTS:
- Most common locations: ${getMostCommonLocations(followers).join(', ') || 'Various'}
- Sample bios: ${getSampleBios(followers).slice(0, 3).join(' | ')}

Use this data to create compelling, data-driven insights in the presentation.
`
        }
      }
    }

    // Build the full prompt for Gamma
    const fullPrompt = `${prompt}${followerContext}`

    console.log(`[Gamma] Full prompt length: ${fullPrompt.length} characters`)

    // Generate with Gamma
    const gamma = getGammaClient()
    
    const result = await gamma.generate({
      text: fullPrompt,
      type: type as any,
      imageOptions: {
        model: imageModel
      },
      textOptions: {
        language: language,
        tone: tone as any,
        audience: audience,
        detailLevel: 'comprehensive'
      }
    })

    // Store generation in user's history
    await adminDb.collection('users').doc(userId).collection('gamma_generations').add({
      gammaId: result.gamma_id,
      prompt: prompt,
      type: type,
      username: username,
      createdAt: new Date(),
      status: result.status
    })

    console.log(`[Gamma] Generated successfully: ${result.gamma_id}`)

    return NextResponse.json({
      success: true,
      gammaId: result.gamma_id,
      status: result.status,
      message: 'Gamma is generating your presentation...',
      pollUrl: `/api/gamma/status/${result.gamma_id}`
    })

  } catch (error: any) {
    console.error('[Gamma] Generation error:', error)
    return NextResponse.json({
      error: 'Failed to generate presentation',
      details: error.message
    }, { status: 500 })
  }
}

// Helper functions
function getMostCommonLocations(followers: any[]): string[] {
  const locations: Record<string, number> = {}
  
  followers.forEach(f => {
    if (f.location && f.location.trim()) {
      const loc = f.location.trim()
      locations[loc] = (locations[loc] || 0) + 1
    }
  })
  
  return Object.entries(locations)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([loc]) => loc)
}

function getSampleBios(followers: any[]): string[] {
  return followers
    .filter(f => f.bio && f.bio.length > 20)
    .map(f => f.bio.substring(0, 100))
    .slice(0, 5)
}
