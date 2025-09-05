import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  // Only allow in development or with a debug key
  const debugKey = request.nextUrl.searchParams.get('key')
  if (process.env.NODE_ENV === 'production' && debugKey !== process.env.DEBUG_KEY) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 401 })
  }

  const origin = request.nextUrl.origin
  const expectedCallback = `${origin}/api/auth/twitter/callback`

  return NextResponse.json({
    environment: process.env.NODE_ENV,
    origin,
    expectedCallback,
    hasTwitterApiKey: !!process.env.TWITTER_API_KEY,
    hasTwitterApiSecret: !!process.env.TWITTER_API_SECRET,
    twitterApiKeyPrefix: process.env.TWITTER_API_KEY?.substring(0, 10) + '...',
    hasFirebaseAdminKey: !!process.env.FIREBASE_ADMIN_SDK_KEY,
    firebaseProjectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
  })
}
