import { NextRequest, NextResponse } from 'next/server'
import { XAuth } from '@/lib/twitter-auth'
import { adminAuth } from '@/lib/firebase-admin'

export async function GET(request: NextRequest) {
  try {
    console.log('[OAuth GET] Starting OAuth flow...')
    
    // Check if there's a Firebase session (user might be logged in)
    const sessionCookie = request.cookies.get('__session')?.value
    let currentUserId: string | null = null
    
    if (sessionCookie && adminAuth) {
      try {
        const decodedToken = await adminAuth.verifySessionCookie(sessionCookie, true)
        currentUserId = decodedToken.uid
        console.log('[OAuth GET] Found logged-in user via session:', currentUserId)
      } catch (err) {
        console.log('[OAuth GET] No valid Firebase session found')
      }
    }
    
    // Get callback URL - add linking_user parameter if logged in
    let callbackUrl = `${process.env.NEXTAUTH_URL}/api/auth/twitter/callback`
    if (currentUserId) {
      callbackUrl += `?linking_user=${encodeURIComponent(currentUserId)}`
      console.log('[OAuth GET] Added linking_user to callback URL:', currentUserId)
    }
    
    const tokens = await XAuth.getRequestToken(callbackUrl)
    
    const authUrl = XAuth.getAuthorizationUrl(tokens.oauth_token)
    
    console.log('[OAuth GET] OAuth tokens generated, setting cookies...')

    // Store tokens in session/cookies for callback
    const response = NextResponse.redirect(authUrl)
    response.cookies.set('oauth_token', tokens.oauth_token, { 
      httpOnly: true, 
      secure: process.env.NODE_ENV === 'production',
      maxAge: 600, // 10 minutes
      sameSite: 'lax',
      path: '/'
    })
    response.cookies.set('oauth_token_secret', tokens.oauth_token_secret, { 
      httpOnly: true, 
      secure: process.env.NODE_ENV === 'production',
      maxAge: 600, // 10 minutes
      sameSite: 'lax',
      path: '/'
    })
    
    // If user is logged in, set linking cookie
    if (currentUserId) {
      console.log('[OAuth GET] Setting linking_user_id cookie for:', currentUserId)
      response.cookies.set('linking_user_id', currentUserId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 600,
        sameSite: 'lax',
        path: '/'
      })
    }

    return response
  } catch (error) {
    console.error('X OAuth initialization error:', error)
    return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/login?error=oauth_failed`)
  }
}

export async function POST(request: NextRequest) {
  try {
    // Verify user authentication
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const idToken = authHeader.split('Bearer ')[1]
    if (!adminAuth) {
      return NextResponse.json({ error: 'Firebase Admin not configured' }, { status: 500 })
    }

    const decodedToken = await adminAuth.verifyIdToken(idToken)
    const userId = decodedToken.uid

    // Get callback URL
    const callbackUrl = `${process.env.NEXTAUTH_URL}/api/auth/twitter/callback`
    const tokens = await XAuth.getRequestToken(callbackUrl)
    
    const authUrl = XAuth.getAuthorizationUrl(tokens.oauth_token)

    // Return tokens and SET COOKIES (needed for callback!)
    const response = NextResponse.json({
      authUrl,
      oauth_token: tokens.oauth_token,
      oauth_token_secret: tokens.oauth_token_secret,
    })
    
    // CRITICAL: Set OAuth cookies for callback to use
    response.cookies.set('oauth_token', tokens.oauth_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 600, // 10 minutes
      sameSite: 'lax'
    })
    
    response.cookies.set('oauth_token_secret', tokens.oauth_token_secret, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 600, // 10 minutes
      sameSite: 'lax'
    })
    
    // Store current user ID in cookie to link OAuth to this account
    response.cookies.set('linking_user_id', userId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 600, // 10 minutes
      sameSite: 'lax'
    })

    return response
  } catch (error) {
    console.error('X OAuth initialization error:', error)
    return NextResponse.json(
      { error: 'Failed to initialize X OAuth' },
      { status: 500 }
    )
  }
}
