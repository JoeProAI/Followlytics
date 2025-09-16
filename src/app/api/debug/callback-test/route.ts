import { NextResponse } from 'next/server'
import { adminAuth } from '@/lib/firebase-admin'

export async function GET() {
  try {
    // Test the exact same flow as X OAuth callback
    const customToken = await adminAuth.createCustomToken('test-user-123')
    
    // Test the redirect that should happen
    const redirectUrl = `${process.env.NEXTAUTH_URL}/dashboard?x_auth=success&token=${customToken}`
    
    return NextResponse.json({
      status: 'Callback test',
      customTokenCreated: true,
      tokenLength: customToken.length,
      redirectUrl: redirectUrl,
      nextAuthUrl: process.env.NEXTAUTH_URL
    })
  } catch (error) {
    return NextResponse.json({
      error: 'Callback test failed',
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 })
  }
}
