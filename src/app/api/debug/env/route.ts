import { NextResponse } from 'next/server'

export async function GET() {
  try {
    // Check environment variables without exposing sensitive data
    const envCheck = {
      NEXTAUTH_URL: !!process.env.NEXTAUTH_URL,
      NEXTAUTH_SECRET: !!process.env.NEXTAUTH_SECRET,
      X_API_KEY: !!process.env.X_API_KEY,
      X_API_SECRET: !!process.env.X_API_SECRET,
      FIREBASE_PROJECT_ID: !!process.env.FIREBASE_PROJECT_ID,
      FIREBASE_CLIENT_EMAIL: !!process.env.FIREBASE_CLIENT_EMAIL,
      FIREBASE_PRIVATE_KEY: !!process.env.FIREBASE_PRIVATE_KEY,
      // Show actual values for non-sensitive config
      NEXTAUTH_URL_VALUE: process.env.NEXTAUTH_URL,
      NODE_ENV: process.env.NODE_ENV,
      VERCEL_ENV: process.env.VERCEL_ENV
    }

    return NextResponse.json({
      status: 'Environment check',
      environment: envCheck,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    return NextResponse.json({
      error: 'Failed to check environment',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
