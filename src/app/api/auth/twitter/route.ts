import { NextRequest, NextResponse } from 'next/server'
import { XAuth } from '@/lib/twitter-auth'
import { adminAuth } from '@/lib/firebase-admin'

export async function GET(request: NextRequest) {
  try {
    // Get callback URL
    const callbackUrl = `${process.env.NEXTAUTH_URL}/api/auth/twitter/callback`
    const tokens = await XAuth.getRequestToken(callbackUrl)
    
    const authUrl = XAuth.getAuthorizationUrl(tokens.oauth_token)

    // Store tokens in session/cookies for callback
    const response = NextResponse.redirect(authUrl)
    response.cookies.set('oauth_token', tokens.oauth_token, { 
      httpOnly: true, 
      secure: process.env.NODE_ENV === 'production',
      maxAge: 600 // 10 minutes
    })
    response.cookies.set('oauth_token_secret', tokens.oauth_token_secret, { 
      httpOnly: true, 
      secure: process.env.NODE_ENV === 'production',
      maxAge: 600 // 10 minutes
    })

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

    // Return tokens and also set a cookie to track that this OAuth is from a logged-in user
    const response = NextResponse.json({
      authUrl,
      oauth_token: tokens.oauth_token,
      oauth_token_secret: tokens.oauth_token_secret,
    })
    
    // Store current user ID in cookie to link OAuth to this account
    response.cookies.set('linking_user_id', userId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 600 // 10 minutes
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
