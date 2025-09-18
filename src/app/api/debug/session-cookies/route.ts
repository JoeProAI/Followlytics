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

    // Check for session cookies
    const sessionCookiesDoc = await adminDb.collection('x_session_cookies').doc(userId).get()
    
    if (!sessionCookiesDoc.exists) {
      return NextResponse.json({
        hasCookies: false,
        message: 'No session cookies found. Please re-authorize Twitter access to capture session cookies.',
        userId: userId
      })
    }

    const cookieData = sessionCookiesDoc.data()
    
    return NextResponse.json({
      hasCookies: true,
      cookies: {
        hasAuthToken: !!cookieData?.auth_token,
        hasCt0: !!cookieData?.ct0,
        hasTwid: !!cookieData?.twid,
        capturedAt: cookieData?.capturedAt,
        authTokenLength: cookieData?.auth_token?.length || 0,
        ct0Length: cookieData?.ct0?.length || 0,
        twidLength: cookieData?.twid?.length || 0
      },
      message: 'Session cookies found! Ready for cookie-based authentication.',
      userId: userId
    })

  } catch (error) {
    console.error('Session cookie check error:', error)
    return NextResponse.json(
      { error: 'Failed to check session cookies' },
      { status: 500 }
    )
  }
}
