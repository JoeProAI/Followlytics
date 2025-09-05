import { NextRequest, NextResponse } from 'next/server'
import * as admin from 'firebase-admin'
import crypto from 'crypto'

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  const privateKey = process.env.FIREBASE_ADMIN_SDK_KEY?.replace(/\\n/g, '\n')
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL
  
  if (!privateKey || !projectId || !clientEmail) {
    throw new Error(`Firebase Admin SDK not properly configured`)
  }

  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: projectId,
      clientEmail: clientEmail,
      privateKey: privateKey,
    }),
  })
}

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    // Test creating a Firebase custom token with a test Twitter user ID
    const testTwitterUserId = '123456789'
    const testUserData = {
      screen_name: 'testuser',
      name: 'Test User',
      profile_image_url_https: 'https://example.com/image.jpg'
    }

    console.log('Testing Firebase custom token creation...')
    
    // Step 1: Test Firebase custom token creation
    let customToken: string
    try {
      customToken = await admin.auth().createCustomToken(testTwitterUserId, {
        twitter_id: testTwitterUserId,
        username: testUserData.screen_name,
        name: testUserData.name,
        profile_image_url: testUserData.profile_image_url_https
      })
      
      console.log('✅ Firebase token created successfully, length:', customToken.length)
    } catch (tokenError) {
      console.error('❌ Firebase token creation failed:', tokenError)
      return NextResponse.json({
        error: 'Firebase token creation failed',
        details: tokenError instanceof Error ? tokenError.message : 'Unknown error',
        step: 'custom_token_creation'
      }, { status: 500 })
    }

    // Step 2: Test Firestore write
    try {
      const db = admin.firestore()
      await db.collection('users').doc(testTwitterUserId).set({
        twitter_id: testTwitterUserId,
        username: testUserData.screen_name,
        name: testUserData.name,
        profile_image_url: testUserData.profile_image_url_https,
        access_token: 'test_token',
        access_token_secret: 'test_secret',
        last_login: admin.firestore.FieldValue.serverTimestamp(),
        created_at: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true })
      
      console.log('✅ Firestore write successful')
    } catch (firestoreError) {
      console.error('❌ Firestore write failed:', firestoreError)
      return NextResponse.json({
        error: 'Firestore write failed',
        details: firestoreError instanceof Error ? firestoreError.message : 'Unknown error',
        step: 'firestore_write'
      }, { status: 500 })
    }

    // Step 3: Test cookie setting (simulate)
    const response = NextResponse.json({
      success: true,
      message: 'OAuth callback simulation successful',
      steps: {
        firebase_token_created: true,
        firestore_write: true,
        token_length: customToken.length
      }
    })

    // Set test cookie
    response.cookies.set('firebase_token', customToken, {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24,
      path: '/'
    })

    console.log('✅ Test cookie set')

    return response

  } catch (error) {
    console.error('❌ OAuth debug test failed:', error)
    return NextResponse.json({
      error: 'OAuth debug test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
