import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const consumerKey = process.env.TWITTER_API_KEY || process.env.TWITTER_CLIENT_ID
  const consumerSecret = process.env.TWITTER_API_SECRET || process.env.TWITTER_CLIENT_SECRET
  // Use the current request origin to ensure cookie domain matches callback domain
  const origin = request.nextUrl.origin
  const callbackUrl = `${origin}/api/auth/twitter/callback`
  
  if (!consumerKey || !consumerSecret) {
    console.error('Missing Twitter credentials:', {
      hasConsumerKey: !!consumerKey,
      hasConsumerSecret: !!consumerSecret,
      keyPrefix: consumerKey?.substring(0, 10),
      env: process.env.NODE_ENV
    })
    return NextResponse.json({ 
      error: 'Twitter API credentials not configured',
      debug: {
        hasConsumerKey: !!consumerKey,
        hasConsumerSecret: !!consumerSecret
      }
    }, { status: 500 })
  }

  // OAuth 1.0a Request Token step
  const oauthTimestamp = Math.floor(Date.now() / 1000).toString()
  const oauthNonce = crypto.randomBytes(32).toString('hex')
  
  // OAuth 1.0a parameters
  const oauthParams = {
    oauth_callback: callbackUrl,
    oauth_consumer_key: consumerKey,
    oauth_nonce: oauthNonce,
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: oauthTimestamp,
    oauth_version: '1.0'
  }
  
  // Create parameter string for signature
  const paramString = Object.keys(oauthParams)
    .sort()
    .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(oauthParams[key as keyof typeof oauthParams])}`)
    .join('&')
  
  // Create signature base string
  const signatureBaseString = `POST&${encodeURIComponent('https://api.twitter.com/oauth/request_token')}&${encodeURIComponent(paramString)}`
  
  // Create signing key
  const signingKey = `${encodeURIComponent(consumerSecret)}&`
  
  // Generate signature
  const signature = crypto.createHmac('sha1', signingKey).update(signatureBaseString).digest('base64')
  
  // Add signature to parameters
  const authHeader = `OAuth oauth_callback="${encodeURIComponent(callbackUrl)}", oauth_consumer_key="${consumerKey}", oauth_nonce="${oauthNonce}", oauth_signature="${encodeURIComponent(signature)}", oauth_signature_method="HMAC-SHA1", oauth_timestamp="${oauthTimestamp}", oauth_version="1.0"`
  
  try {
    console.log('Initiating Twitter OAuth request with callback:', callbackUrl)
    console.log('Using consumer key:', consumerKey ? `${consumerKey.substring(0, 10)}...` : 'MISSING')
    
    // Request token from Twitter
    const response = await fetch('https://api.twitter.com/oauth/request_token', {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    })
    
    if (!response.ok) {
      const errorText = await response.text()
      console.error('Twitter API request token failed:', response.status, errorText)
      throw new Error(`Twitter API error: ${response.status} - ${errorText}`)
    }
    
    const responseText = await response.text()
    const params = new URLSearchParams(responseText)
    const oauthToken = params.get('oauth_token')
    const oauthTokenSecret = params.get('oauth_token_secret')
    
    if (!oauthToken || !oauthTokenSecret) {
      throw new Error('Invalid response from Twitter API')
    }
    
    // Store token secret for callback
    const redirectResponse = NextResponse.redirect(`https://api.twitter.com/oauth/authorize?oauth_token=${oauthToken}`)
    
    redirectResponse.cookies.set('twitter_oauth_token_secret', oauthTokenSecret, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 600 // 10 minutes
    })
    
    return redirectResponse
    
  } catch (error) {
    console.error('OAuth 1.0a error:', error)
    return NextResponse.json({ error: 'Failed to initiate Twitter authentication' }, { status: 500 })
  }
}
