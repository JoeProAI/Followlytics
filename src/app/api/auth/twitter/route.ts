import { NextRequest, NextResponse } from 'next/server'
import { TwitterAuth } from '@/lib/twitter-auth'
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

    // Get request token from Twitter
    const requestToken = await TwitterAuth.getRequestToken(callbackUrl)

    // Store request token temporarily (in a real app, use Redis or database)
    // For now, we'll return it to the client to handle
    const authUrl = TwitterAuth.getAuthorizationUrl(requestToken.oauth_token)

    return NextResponse.json({
      authUrl,
      oauth_token: requestToken.oauth_token,
      oauth_token_secret: requestToken.oauth_token_secret,
    })
  } catch (error) {
    console.error('Twitter OAuth initialization error:', error)
    return NextResponse.json(
      { error: 'Failed to initialize Twitter OAuth' },
      { status: 500 }
    )
  }
}
