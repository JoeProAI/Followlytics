import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const bearerToken = process.env.X_BEARER_TOKEN
    const apiKey = process.env.X_API_KEY
    const apiSecret = process.env.X_API_SECRET

    console.log('[Test] Checking X API credentials...')
    console.log('[Test] Bearer Token exists:', !!bearerToken)
    console.log('[Test] API Key exists:', !!apiKey)
    console.log('[Test] API Secret exists:', !!apiSecret)

    // Test 1: Try with Bearer Token
    if (bearerToken) {
      console.log('[Test] Testing Bearer Token...')
      
      let token = bearerToken
      if (token.includes('%')) {
        token = decodeURIComponent(token)
      }
      
      const response = await fetch('https://api.twitter.com/2/users/by/username/twitter?user.fields=public_metrics', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        return NextResponse.json({
          success: true,
          method: 'Bearer Token',
          followerCount: data.data.public_metrics.followers_count,
          message: '✅ Bearer Token works!'
        })
      } else {
        const error = await response.text()
        console.log('[Test] Bearer Token failed:', response.status, error)
      }
    }

    // Test 2: Try generating token from API Key/Secret
    if (apiKey && apiSecret) {
      console.log('[Test] Testing OAuth 2.0 with API credentials...')
      
      const credentials = Buffer.from(`${apiKey}:${apiSecret}`).toString('base64')
      
      const tokenResponse = await fetch('https://api.twitter.com/oauth2/token', {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${credentials}`,
          'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8'
        },
        body: 'grant_type=client_credentials'
      })

      if (tokenResponse.ok) {
        const tokenData = await tokenResponse.json()
        const freshToken = tokenData.access_token

        // Try using the fresh token
        const profileResponse = await fetch('https://api.twitter.com/2/users/by/username/twitter?user.fields=public_metrics', {
          headers: {
            'Authorization': `Bearer ${freshToken}`
          }
        })

        if (profileResponse.ok) {
          const data = await profileResponse.json()
          return NextResponse.json({
            success: true,
            method: 'OAuth 2.0 (API Key + Secret)',
            followerCount: data.data.public_metrics.followers_count,
            message: '✅ OAuth 2.0 works! Fresh token generated.'
          })
        } else {
          const error = await profileResponse.text()
          console.log('[Test] Fresh token failed:', profileResponse.status, error)
          return NextResponse.json({
            success: false,
            error: 'OAuth token generated but API call failed',
            details: error
          }, { status: 401 })
        }
      } else {
        const error = await tokenResponse.text()
        console.log('[Test] OAuth token generation failed:', tokenResponse.status, error)
        return NextResponse.json({
          success: false,
          error: 'Failed to generate OAuth token',
          status: tokenResponse.status,
          details: error
        }, { status: 403 })
      }
    }

    return NextResponse.json({
      success: false,
      error: 'No valid credentials found',
      message: 'Please set X_BEARER_TOKEN or (X_API_KEY + X_API_SECRET)'
    }, { status: 500 })

  } catch (error: any) {
    console.error('[Test] Error:', error)
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}
