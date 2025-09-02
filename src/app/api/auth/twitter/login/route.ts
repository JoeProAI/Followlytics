import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const twitterClientId = process.env.TWITTER_CLIENT_ID
  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/auth/twitter/callback`
  
  if (!twitterClientId) {
    return NextResponse.json({ error: 'Twitter client ID not configured' }, { status: 500 })
  }

  // Generate state parameter for security
  const state = Math.random().toString(36).substring(2, 15)
  
  // Store state in session/cookie for verification
  const response = NextResponse.redirect(
    `https://twitter.com/i/oauth2/authorize?` +
    `response_type=code&` +
    `client_id=${twitterClientId}&` +
    `redirect_uri=${encodeURIComponent(redirectUri)}&` +
    `scope=tweet.read%20users.read%20follows.read&` +
    `state=${state}&` +
    `code_challenge=challenge&` +
    `code_challenge_method=plain`
  )
  
  response.cookies.set('twitter_oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 600 // 10 minutes
  })
  
  return response
}
