import { NextRequest, NextResponse } from 'next/server'
import admin from 'firebase-admin'

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  })
}

const adminDb = admin.firestore()

// Manual OAuth token storage for testing
export async function POST(request: NextRequest) {
  try {
    const { user_id, access_token, access_token_secret, username } = await request.json()
    
    if (!user_id || !access_token || !access_token_secret || !username) {
      return NextResponse.json({ 
        error: 'Missing required fields: user_id, access_token, access_token_secret, username' 
      }, { status: 400 })
    }

    console.log('🔐 Storing manual OAuth tokens for user:', user_id)

    // Store tokens in Firebase
    await adminDb.collection('users').doc(user_id).set({
      twitter_access_token: access_token,
      twitter_access_token_secret: access_token_secret,
      twitter_username: username,
      oauth_completed_at: admin.firestore.FieldValue.serverTimestamp(),
      oauth_method: 'manual'
    }, { merge: true })

    console.log('✅ OAuth tokens stored successfully')

    return NextResponse.json({
      success: true,
      message: 'OAuth tokens stored successfully',
      username: username
    })

  } catch (error) {
    console.error('❌ Failed to store OAuth tokens:', error)
    return NextResponse.json(
      { 
        error: 'Failed to store OAuth tokens',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// Get stored tokens
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const user_id = searchParams.get('user_id')
    
    if (!user_id) {
      return NextResponse.json({ 
        error: 'Missing user_id parameter' 
      }, { status: 400 })
    }

    const userDoc = await adminDb.collection('users').doc(user_id).get()
    
    if (!userDoc.exists) {
      return NextResponse.json({
        authorized: false,
        message: 'User not found'
      })
    }

    const userData = userDoc.data()
    const hasTokens = userData?.twitter_access_token && userData?.twitter_access_token_secret

    return NextResponse.json({
      authorized: hasTokens,
      username: userData?.twitter_username || null,
      oauth_method: userData?.oauth_method || null,
      oauth_completed_at: userData?.oauth_completed_at || null
    })

  } catch (error) {
    console.error('❌ Failed to check OAuth status:', error)
    return NextResponse.json(
      { 
        error: 'Failed to check OAuth status',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
