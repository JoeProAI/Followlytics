import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase-admin'

/**
 * Get user's AI usage statistics
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

    // Get AI usage stats
    const statsDoc = await adminDb
      .collection('users')
      .doc(userId)
      .collection('stats')
      .doc('ai_usage')
      .get()

    if (!statsDoc.exists) {
      return NextResponse.json({
        success: true,
        usage: {
          total_analyses: 0,
          total_followers_analyzed: 0,
          total_cost: 0,
          total_tokens: 0,
          last_analysis: null
        }
      })
    }

    const usage = statsDoc.data()

    return NextResponse.json({
      success: true,
      usage: {
        total_analyses: usage?.total_analyses || 0,
        total_followers_analyzed: usage?.total_followers_analyzed || 0,
        total_cost: usage?.total_cost || 0,
        total_tokens: usage?.total_tokens || 0,
        last_analysis: usage?.last_analysis || null
      }
    })

  } catch (error: any) {
    console.error('[AI Usage] Error:', error)
    return NextResponse.json({
      error: 'Failed to fetch AI usage',
      details: error.message
    }, { status: 500 })
  }
}
