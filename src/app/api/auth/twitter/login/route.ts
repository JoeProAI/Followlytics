import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'

export async function GET(request: NextRequest) {
  const twitterClientId = process.env.TWITTER_CLIENT_ID
  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/auth/twitter/callback`
  
  if (!twitterClientId) {
    return NextResponse.json({ error: 'Twitter client ID not configured' }, { status: 500 })
  }

  // Generate state parameter for security
  const state = crypto.randomBytes(32).toString('hex')
  
  // Generate PKCE code verifier and challenge
  const codeVerifier = crypto.randomBytes(32).toString('base64url')
  const codeChallenge = crypto.createHash('sha256').update(codeVerifier).digest('base64url')
  
  // Store state and code verifier in session/cookie for verification
  const response = NextResponse.redirect(
    `https://twitter.com/i/oauth2/authorize?` +
    `response_type=code&` +
    `client_id=${twitterClientId}&` +
    `redirect_uri=${encodeURIComponent(redirectUri)}&` +
    `scope=tweet.read%20users.read%20follows.read&` +
    `state=${state}&` +
    `code_challenge=${codeChallenge}&` +
    `code_challenge_method=S256`
  )
  
  response.cookies.set('twitter_oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 600 // 10 minutes
  })
  
  response.cookies.set('twitter_code_verifier', codeVerifier, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 600 // 10 minutes
  })
  
  return response
}
