import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  // Test the Bearer token from your .env.local (new regenerated one)
  const bearerToken = process.env.TWITTER_BEARER_TOKEN
  
  if (!bearerToken) {
    return NextResponse.json({ error: 'No Bearer token found' }, { status: 500 })
  }

  try {
    // Simple API call to verify Bearer token works
    const response = await fetch('https://api.twitter.com/2/users/me', {
      headers: {
        'Authorization': `Bearer ${bearerToken}`,
        'Content-Type': 'application/json'
      }
    })

    const data = await response.json()
    
    return NextResponse.json({
      success: response.ok,
      status: response.status,
      bearer_token_prefix: bearerToken.substring(0, 20) + '...',
      response: data,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      bearer_token_prefix: bearerToken.substring(0, 20) + '...',
      timestamp: new Date().toISOString()
    })
  }
}
