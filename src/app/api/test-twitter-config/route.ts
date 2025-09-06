import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const config = {
      TWITTER_API_KEY: process.env.TWITTER_API_KEY ? `${process.env.TWITTER_API_KEY.substring(0, 10)}...` : 'NOT_SET',
      TWITTER_API_SECRET: process.env.TWITTER_API_SECRET ? `${process.env.TWITTER_API_SECRET.substring(0, 10)}...` : 'NOT_SET',
      TWITTER_BEARER_TOKEN: process.env.TWITTER_BEARER_TOKEN ? `${process.env.TWITTER_BEARER_TOKEN.substring(0, 10)}...` : 'NOT_SET',
      TWITTER_CLIENT_ID: process.env.TWITTER_CLIENT_ID ? `${process.env.TWITTER_CLIENT_ID.substring(0, 10)}...` : 'NOT_SET',
      TWITTER_CLIENT_SECRET: process.env.TWITTER_CLIENT_SECRET ? `${process.env.TWITTER_CLIENT_SECRET.substring(0, 10)}...` : 'NOT_SET',
      TWITTER_ACCESS_TOKEN: process.env.TWITTER_ACCESS_TOKEN ? `${process.env.TWITTER_ACCESS_TOKEN.substring(0, 10)}...` : 'NOT_SET',
      TWITTER_ACCESS_TOKEN_SECRET: process.env.TWITTER_ACCESS_TOKEN_SECRET ? `${process.env.TWITTER_ACCESS_TOKEN_SECRET.substring(0, 10)}...` : 'NOT_SET'
    }

    // Test OAuth 2.0 Client Credentials flow
    const clientId = process.env.TWITTER_CLIENT_ID || 'VHdQbXktdml2QUMxdGx2Wm9lbWk6MTpjaQ'
    const clientSecret = process.env.TWITTER_CLIENT_SECRET || 'DbpYhM3ao8D3u7lNH01_pJXkJPT1gqW_UQFzBaHxU-vBU8ZzTo'
    
    let tokenTestResult = null
    try {
      const tokenUrl = 'https://api.twitter.com/oauth2/token'
      const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')
      
      const tokenResponse = await fetch(tokenUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${credentials}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: 'grant_type=client_credentials'
      })

      if (tokenResponse.ok) {
        const tokenData = await tokenResponse.json()
        tokenTestResult = {
          success: true,
          token_type: tokenData.token_type,
          token_preview: tokenData.access_token ? `${tokenData.access_token.substring(0, 20)}...` : 'NO_TOKEN'
        }
      } else {
        const errorText = await tokenResponse.text()
        tokenTestResult = {
          success: false,
          status: tokenResponse.status,
          error: errorText
        }
      }
    } catch (error) {
      tokenTestResult = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Twitter API configuration check',
      config,
      oauth2_test: tokenTestResult,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Config check error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to check configuration',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
