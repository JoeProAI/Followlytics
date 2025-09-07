import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    // Test a simple user lookup endpoint with OAuth 1.0a
    const consumerKey = process.env.TWITTER_API_KEY
    const consumerSecret = process.env.TWITTER_API_SECRET
    
    if (!consumerKey || !consumerSecret) {
      return NextResponse.json({ error: 'Twitter credentials not configured' }, { status: 500 })
    }

    // Test with a public user lookup (doesn't require user context)
    const bearerToken = process.env.TWITTER_BEARER_TOKEN
    
    if (!bearerToken) {
      return NextResponse.json({ error: 'Bearer token not configured' }, { status: 500 })
    }

    // Try a simple public endpoint that should work with Bearer token
    const response = await fetch('https://api.twitter.com/2/users/by/username/elonmusk', {
      headers: {
        'Authorization': `Bearer ${bearerToken}`,
        'Content-Type': 'application/json'
      }
    })

    const data = await response.json()
    
    return NextResponse.json({
      success: response.ok,
      status: response.status,
      bearer_token_prefix: bearerToken.substring(0, 30) + '...',
      endpoint_tested: 'users/by/username/elonmusk',
      response: data,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    })
  }
}
