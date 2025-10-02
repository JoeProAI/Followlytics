import { NextRequest, NextResponse } from 'next/server'
import { adminAuth as auth } from '@/lib/firebase-admin'
import { getUserSubscription } from '@/lib/subscription'

export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.split('Bearer ')[1]
    const decodedToken = await auth.verifyIdToken(token)
    
    if (!decodedToken) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const userId = decodedToken.uid

    // Get subscription
    const subscription = await getUserSubscription(userId)

    return NextResponse.json({
      success: true,
      subscription
    })

  } catch (error: any) {
    console.error('Get subscription error:', error)
    return NextResponse.json({
      error: 'Failed to get subscription',
      details: error.message
    }, { status: 500 })
  }
}
