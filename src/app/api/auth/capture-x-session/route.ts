import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase-admin'

export async function POST(request: NextRequest) {
  try {
    // Get the authorization header
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'No authorization token provided' }, { status: 401 })
    }

    const token = authHeader.split(' ')[1]
    const { sessionData } = await request.json()
    
    // Verify the Firebase token
    const decodedToken = await adminAuth.verifyIdToken(token)
    const userId = decodedToken.uid

    console.log('🔐 Capturing X session data for user:', userId)

    // Validate session data
    if (!sessionData || !sessionData.cookies || !sessionData.localStorage) {
      return NextResponse.json({ 
        error: 'Invalid session data. Need cookies and localStorage from X.com',
        required: ['cookies', 'localStorage', 'sessionStorage']
      }, { status: 400 })
    }

    // Store the captured X session data
    await adminDb.collection('x_sessions').doc(userId).set({
      cookies: sessionData.cookies,
      localStorage: sessionData.localStorage,
      sessionStorage: sessionData.sessionStorage || {},
      userAgent: sessionData.userAgent || '',
      capturedAt: new Date(),
      capturedUrl: sessionData.url || 'x.com',
      isValid: true
    })

    console.log('✅ X session data captured and stored')

    return NextResponse.json({
      success: true,
      message: 'X session captured successfully',
      sessionInfo: {
        cookieCount: Object.keys(sessionData.cookies).length,
        localStorageKeys: Object.keys(sessionData.localStorage).length,
        sessionStorageKeys: Object.keys(sessionData.sessionStorage || {}).length,
        capturedAt: new Date().toISOString()
      }
    })

  } catch (error) {
    console.error('❌ Error capturing X session:', error)
    return NextResponse.json({
      error: 'Failed to capture X session',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
