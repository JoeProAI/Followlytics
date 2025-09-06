import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const consumerKey = process.env.TWITTER_API_KEY || process.env.TWITTER_CLIENT_ID
    const consumerSecret = process.env.TWITTER_API_SECRET || process.env.TWITTER_CLIENT_SECRET
    const bearerToken = process.env.TWITTER_BEARER_TOKEN
    
    return NextResponse.json({
      hasConsumerKey: !!consumerKey,
      hasConsumerSecret: !!consumerSecret,
      hasBearerToken: !!bearerToken,
      consumerKeyPrefix: consumerKey?.substring(0, 10),
      consumerSecretPrefix: consumerSecret?.substring(0, 10),
      bearerTokenPrefix: bearerToken?.substring(0, 20),
      expectedKeyPrefix: 'hke0zESauH',
      expectedSecretPrefix: '6ZAUFgzqzh',
      expectedBearerPrefix: 'AAAAAAAAAAAAAAAAAAA',
      keysMatch: consumerKey?.startsWith('hke0zESauH'),
      secretsMatch: consumerSecret?.startsWith('6ZAUFgzqzh'),
      bearerMatch: bearerToken?.startsWith('AAAAAAAAAAAAAAAAAAA'),
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    return NextResponse.json({
      error: 'Failed to check config',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
