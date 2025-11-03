import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase-admin'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.split('Bearer ')[1]
    const decodedToken = await adminAuth.verifyIdToken(token)
    const userId = decodedToken.uid

    const body = await request.json()
    const { follower, analysisId } = body

    if (!follower || !follower.username) {
      return NextResponse.json({ 
        error: 'Missing follower data' 
      }, { status: 400 })
    }

    // Create Gamma report content for individual follower
    const gammaContent = {
      title: `📊 ${follower.name || follower.username} - Follower Analysis`,
      sections: [
        {
          type: 'header',
          content: {
            name: follower.name || follower.username,
            username: `@${follower.username}`,
            influenceScore: follower.influenceScore,
            category: follower.category,
            priority: follower.priority,
            engagement: follower.engagementValue
          }
        },
        {
          type: 'metrics',
          title: '📊 Key Metrics',
          content: {
            'Influence Score': `${follower.influenceScore}/10`,
            'Category': follower.category,
            'Priority Level': follower.priority,
            'Engagement Value': follower.engagementValue
          }
        },
        {
          type: 'insight',
          title: '💡 Why They Matter',
          content: follower.strategicValue
        },
        {
          type: 'action',
          title: '✨ Recommended Action',
          content: follower.actionRecommendation
        }
      ]
    }

    // Store Gamma generation request
    const generationId = `gamma_follower_${Date.now()}_${Math.random().toString(36).substring(7)}`
    
    await adminDb.collection('gamma_reports').doc(generationId).set({
      userId,
      analysisId: analysisId || null,
      followerUsername: follower.username,
      content: gammaContent,
      status: 'pending',
      createdAt: new Date(),
      type: 'individual_follower'
    })

    // In a real implementation, you would call Gamma API here
    // For now, simulate by marking as completed with a mock URL
    setTimeout(async () => {
      try {
        await adminDb.collection('gamma_reports').doc(generationId).update({
          status: 'completed',
          url: `https://gamma.app/docs/follower-analysis-${follower.username.toLowerCase()}-${generationId}`,
          completedAt: new Date()
        })
      } catch (error) {
        console.error('Failed to update Gamma status:', error)
      }
    }, 5000) // Simulate 5 second generation

    return NextResponse.json({
      success: true,
      generationId,
      message: 'Gamma generation started'
    })

  } catch (error: any) {
    console.error('Generate follower Gamma error:', error)
    return NextResponse.json({ 
      error: 'Failed to generate Gamma',
      details: error.message 
    }, { status: 500 })
  }
}
