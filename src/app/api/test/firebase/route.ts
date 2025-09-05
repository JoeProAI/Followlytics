import { NextRequest, NextResponse } from 'next/server'
import * as admin from 'firebase-admin'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    // Check environment variables
    const privateKey = process.env.FIREBASE_ADMIN_SDK_KEY
    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL

    console.log('Environment check:', {
      hasPrivateKey: !!privateKey,
      hasProjectId: !!projectId,
      hasClientEmail: !!clientEmail,
      projectId: projectId,
      clientEmail: clientEmail
    })

    if (!privateKey || !projectId || !clientEmail) {
      return NextResponse.json({
        error: 'Missing Firebase environment variables',
        missing: {
          privateKey: !privateKey,
          projectId: !projectId,
          clientEmail: !clientEmail
        }
      }, { status: 500 })
    }

    // Initialize Firebase Admin if not already initialized
    if (!admin.apps.length) {
      try {
        admin.initializeApp({
          credential: admin.credential.cert({
            projectId: projectId,
            clientEmail: clientEmail,
            privateKey: privateKey.replace(/\\n/g, '\n'),
          }),
        })
        console.log('Firebase Admin initialized successfully')
      } catch (initError) {
        console.error('Firebase initialization error:', initError)
        return NextResponse.json({
          error: 'Firebase initialization failed',
          details: initError instanceof Error ? initError.message : 'Unknown error'
        }, { status: 500 })
      }
    }

    // Test Firebase Auth
    try {
      const testToken = await admin.auth().createCustomToken('test-user-123')
      console.log('Custom token created successfully')
      
      return NextResponse.json({
        success: true,
        message: 'Firebase Admin SDK working correctly',
        projectId: projectId,
        clientEmail: clientEmail,
        tokenCreated: !!testToken
      })
    } catch (authError) {
      console.error('Firebase Auth error:', authError)
      return NextResponse.json({
        error: 'Firebase Auth test failed',
        details: authError instanceof Error ? authError.message : 'Unknown error'
      }, { status: 500 })
    }

  } catch (error) {
    console.error('Firebase test error:', error)
    return NextResponse.json({
      error: 'Firebase test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
