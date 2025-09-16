import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase-admin'

export async function GET(request: NextRequest) {
  try {
    // Verify user authentication
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const idToken = authHeader.split('Bearer ')[1]
    const decodedToken = await adminAuth.verifyIdToken(idToken)
    const userId = decodedToken.uid

    // Check if user has X connected
    const userDoc = await adminDb.collection('users').doc(userId).get()
    
    if (!userDoc.exists) {
      return NextResponse.json({ 
        authorized: false,
        message: 'User not found' 
      })
    }

    const userData = userDoc.data()
    const xConnected = userData?.xConnected || false
    const hasXTokens = !!(userData?.xAccessToken && userData?.xAccessTokenSecret)

    return NextResponse.json({
      authorized: xConnected && hasXTokens,
      xConnected,
      hasXTokens,
      xUsername: userData?.xUsername || null
    })

  } catch (error) {
    console.error('X authorization status check error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to check authorization status',
        authorized: false 
      },
      { status: 500 }
    )
  }
}
