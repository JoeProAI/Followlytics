import { NextRequest, NextResponse } from 'next/server'
import { XAuth } from '@/lib/twitter-auth'
import { adminAuth } from '@/lib/firebase-admin'

export async function POST(request: NextRequest) {
  try {
    // Verify user authentication
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const idToken = authHeader.split('Bearer ')[1]
    const decodedToken = await adminAuth.verifyIdToken(idToken)
    const userId = decodedToken.uid

    // Get callback URL
    const callbackUrl = `${process.env.NEXTAUTH_URL}/api/auth/twitter/callback`
    const tokens = await XAuth.getRequestToken(callbackUrl)
    
    const authUrl = XAuth.getAuthorizationUrl(tokens.oauth_token)

    // Store request token temporarily (in a real app, use Redis or database)
    // For now, we'll return it to the client to handle

    return NextResponse.json({
      authUrl,
      oauth_token: tokens.oauth_token,
      oauth_token_secret: tokens.oauth_token_secret,
    })
  } catch (error) {
    console.error('Twitter OAuth initialization error:', error)
    return NextResponse.json(
      { error: 'Failed to initialize Twitter OAuth' },
      { status: 500 }
    )
  }
}
