import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  return NextResponse.json({
    apify_configured: !!process.env.APIFY_API_TOKEN,
    apify_token_length: process.env.APIFY_API_TOKEN?.length || 0,
    apify_token_prefix: process.env.APIFY_API_TOKEN?.substring(0, 15) || 'NOT_SET',
    firebase_configured: !!process.env.FIREBASE_PROJECT_ID,
    timestamp: new Date().toISOString()
  })
}
