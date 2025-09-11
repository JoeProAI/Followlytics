import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'

// Twitter OAuth 1.0a configuration
const TWITTER_API_KEY = process.env.TWITTER_API_KEY
const TWITTER_API_SECRET = process.env.TWITTER_API_SECRET
const CALLBACK_URL = 'https://followlytics.vercel.app/api/auth/twitter/callback'

// OAuth 1.0a signature generation
function generateOAuthSignature(
  method: string,
  url: string,
  params: Record<string, string>,
  consumerSecret: string,
  tokenSecret: string = ''
) {
  // Sort parameters
  const sortedParams = Object.keys(params)
    .sort()
    .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
    .join('&')

  // Create signature base string
  const signatureBaseString = [
    method.toUpperCase(),
    encodeURIComponent(url),
    encodeURIComponent(sortedParams)
  ].join('&')

  // Create signing key
  const signingKey = `${encodeURIComponent(consumerSecret)}&${encodeURIComponent(tokenSecret)}`

  // Generate signature
  const signature = crypto
    .createHmac('sha1', signingKey)
    .update(signatureBaseString)
    .digest('base64')

  return signature
}

// Generate OAuth authorization header
function generateAuthHeader(params: Record<string, string>) {
  const authParams = Object.keys(params)
    .sort()
    .map(key => `${encodeURIComponent(key)}="${encodeURIComponent(params[key])}"`)
    .join(', ')

  return `OAuth ${authParams}`
}

export async function POST(request: NextRequest) {
  try {
    console.log('🔐 Starting Twitter OAuth authorization flow...')

    // Check required environment variables
    if (!TWITTER_API_KEY || !TWITTER_API_SECRET) {
      console.error('❌ Missing Twitter API credentials')
      return NextResponse.json(
        { error: 'Twitter API credentials not configured' },
        { status: 500 }
      )
    }

    // Generate OAuth parameters
    const oauthParams = {
      oauth_callback: CALLBACK_URL,
      oauth_consumer_key: TWITTER_API_KEY,
      oauth_nonce: crypto.randomBytes(16).toString('hex'),
      oauth_signature_method: 'HMAC-SHA1',
      oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
      oauth_version: '1.0'
    }

    // Generate signature
    const signature = generateOAuthSignature(
      'POST',
      'https://api.twitter.com/oauth/request_token',
      oauthParams,
      TWITTER_API_SECRET
    )

    const paramsWithSignature = { ...oauthParams, oauth_signature: signature }

    // Generate authorization header
    const authHeader = generateAuthHeader(paramsWithSignature)

    console.log('📡 Requesting OAuth token from Twitter...')

    // Request OAuth token from Twitter
    const response = await fetch('https://api.twitter.com/oauth/request_token', {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('❌ Twitter OAuth request failed:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText
      })
      throw new Error(`Twitter OAuth request failed: ${response.status} ${errorText}`)
    }

    const responseText = await response.text()
    console.log('✅ Twitter OAuth response:', responseText)

    // Parse response
    const params = new URLSearchParams(responseText)
    const oauthToken = params.get('oauth_token')
    const oauthTokenSecret = params.get('oauth_token_secret')
    const oauthCallbackConfirmed = params.get('oauth_callback_confirmed')

    if (!oauthToken || !oauthTokenSecret || oauthCallbackConfirmed !== 'true') {
      console.error('❌ Invalid OAuth response:', { oauthToken, oauthTokenSecret, oauthCallbackConfirmed })
      throw new Error('Invalid OAuth response from Twitter')
    }

    // Store token secret in session/database (for production, use proper session storage)
    // For now, we'll pass it as a query parameter (not secure for production)
    const authUrl = `https://api.twitter.com/oauth/authorize?oauth_token=${oauthToken}&oauth_token_secret=${oauthTokenSecret}`

    console.log('🔗 Generated Twitter authorization URL:', authUrl)

    return NextResponse.json({
      success: true,
      authorization_url: authUrl,
      oauth_token: oauthToken,
      oauth_token_secret: oauthTokenSecret
    })

  } catch (error) {
    console.error('❌ Twitter OAuth initialization failed:', error)
    return NextResponse.json(
      { 
        error: 'Failed to initialize Twitter OAuth',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
