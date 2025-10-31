import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const hasServiceAccountJson = !!process.env.FIREBASE_SERVICE_ACCOUNT_JSON
    const hasPrivateKey = !!process.env.FIREBASE_PRIVATE_KEY
    const hasProjectId = !!process.env.FIREBASE_PROJECT_ID
    const hasClientEmail = !!process.env.FIREBASE_CLIENT_EMAIL
    
    let privateKeyFormat: any = 'N/A'
    if (process.env.FIREBASE_PRIVATE_KEY) {
      const key = process.env.FIREBASE_PRIVATE_KEY
      privateKeyFormat = {
        hasBeginMarker: key.includes('-----BEGIN PRIVATE KEY-----'),
        hasEndMarker: key.includes('-----END PRIVATE KEY-----'),
        hasLiteralBackslashN: key.includes('\\n'),
        length: key.length,
        startsWithQuote: key.startsWith('"'),
        endsWithQuote: key.endsWith('"'),
      }
    }
    
    return NextResponse.json({
      success: true,
      check: {
        hasServiceAccountJson,
        hasPrivateKey,
        hasProjectId,
        hasClientEmail,
        privateKeyFormat,
        recommendation: hasServiceAccountJson 
          ? '✅ Using FIREBASE_SERVICE_ACCOUNT_JSON (recommended)'
          : hasPrivateKey && hasProjectId && hasClientEmail
          ? '✅ Using individual env vars'
          : '❌ Missing Firebase credentials'
      }
    })
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}
