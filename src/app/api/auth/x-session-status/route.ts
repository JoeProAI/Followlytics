import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase-admin'

export async function GET(request: NextRequest) {
  try {
    // Get the authorization header
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'No authorization token provided' }, { status: 401 })
    }

    const token = authHeader.split(' ')[1]
    
    // Verify the Firebase token
    const decodedToken = await adminAuth.verifyIdToken(token)
    const userId = decodedToken.uid

    // Check if user has a valid X session
    const sessionDoc = await adminDb.collection('x_sessions').doc(userId).get()
    
    let hasValidSession = false
    let sessionInfo = null

    if (sessionDoc.exists) {
      const session = sessionDoc.data()
      if (session) {
        const capturedAt = session.capturedAt?.toDate()
        const isRecent = capturedAt && (Date.now() - capturedAt.getTime()) < 24 * 60 * 60 * 1000 // 24 hours
        
        hasValidSession = isRecent && session.isValid && session.cookies && Object.keys(session.cookies).length > 0
        
        if (hasValidSession) {
          sessionInfo = {
            capturedAt: capturedAt?.toISOString(),
            cookieCount: Object.keys(session.cookies).length,
            hasLocalStorage: Object.keys(session.localStorage || {}).length > 0,
            capturedUrl: session.capturedUrl || 'unknown'
          }
        }
      }
    }

    return NextResponse.json({
      hasValidSession,
      sessionInfo,
      userId
    })

  } catch (error) {
    console.error('Error checking X session status:', error)
    return NextResponse.json({
      error: 'Failed to check session status',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
