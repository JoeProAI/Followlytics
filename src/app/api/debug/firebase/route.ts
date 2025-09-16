import { NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase-admin'

export async function GET() {
  try {
    // Test Firebase Admin SDK initialization
    const testResult: any = {
      adminAuthInitialized: !!adminAuth,
      adminDbInitialized: !!adminDb,
      timestamp: new Date().toISOString()
    }

    // Try to create a test custom token
    if (adminAuth) {
      try {
        const testToken = await adminAuth.createCustomToken('test-uid')
        testResult.customTokenTest = 'success'
        testResult.tokenLength = testToken.length
      } catch (error) {
        testResult.customTokenTest = 'failed'
        testResult.customTokenError = error instanceof Error ? error.message : 'Unknown error'
      }
    }

    return NextResponse.json({
      status: 'Firebase Admin SDK check',
      result: testResult
    })
  } catch (error) {
    return NextResponse.json({
      error: 'Firebase Admin SDK test failed',
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 })
  }
}
