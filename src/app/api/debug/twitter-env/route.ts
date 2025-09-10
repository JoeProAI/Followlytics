import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  // Debug endpoint to check Twitter environment variables in production
  const consumerKey = process.env.TWITTER_API_KEY || process.env.TWITTER_CLIENT_ID
  const consumerSecret = process.env.TWITTER_API_SECRET || process.env.TWITTER_CLIENT_SECRET
  const accessToken = process.env.TWITTER_ACCESS_TOKEN
  const accessTokenSecret = process.env.TWITTER_ACCESS_TOKEN_SECRET
  const bearerToken = process.env.TWITTER_BEARER_TOKEN

  return NextResponse.json({
    environment: process.env.NODE_ENV,
    vercel_env: process.env.VERCEL_ENV,
    credentials_check: {
      has_consumer_key: !!consumerKey,
      has_consumer_secret: !!consumerSecret,
      has_access_token: !!accessToken,
      has_access_token_secret: !!accessTokenSecret,
      has_bearer_token: !!bearerToken,
      consumer_key_prefix: consumerKey ? consumerKey.substring(0, 10) : 'MISSING',
      consumer_secret_prefix: consumerSecret ? consumerSecret.substring(0, 10) : 'MISSING',
      access_token_prefix: accessToken ? accessToken.substring(0, 15) : 'MISSING',
      bearer_token_prefix: bearerToken ? bearerToken.substring(0, 20) : 'MISSING'
    },
    all_env_vars: Object.keys(process.env)
      .filter(key => key.includes('TWITTER') || key.includes('DAYTONA'))
      .reduce((acc, key) => {
        acc[key] = process.env[key] ? `${process.env[key].substring(0, 10)}...` : 'MISSING'
        return acc
      }, {} as Record<string, string>)
  })
}
