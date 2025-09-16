import { NextRequest, NextResponse } from 'next/server'
import getFirebaseAdmin from '@/lib/firebase-admin'

export async function GET(request: NextRequest) {
  try {
    // Add environment variable validation
    const requiredEnvVars = [
      'FIREBASE_PROJECT_ID',
      'FIREBASE_CLIENT_EMAIL', 
      'FIREBASE_PRIVATE_KEY'
    ]
    
    const missingVars = requiredEnvVars.filter(varName => !process.env[varName])
    if (missingVars.length > 0) {
      console.error('Missing environment variables:', missingVars)
      return NextResponse.json(
        { error: `Missing environment variables: ${missingVars.join(', ')}` },
        { status: 500 }
      )
    }

    // Get the authorization header
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'No authorization token provided' }, { status: 401 })
    }

    const token = authHeader.split(' ')[1]
    
    // Verify the Firebase token
    const { auth } = getFirebaseAdmin()
    const decodedToken = await auth.verifyIdToken(token)
    const userId = decodedToken.uid

    // Check if user has X OAuth tokens stored
    const { firestore } = getFirebaseAdmin()
    const userDoc = await firestore.collection('users').doc(userId).get()
    
    if (!userDoc.exists) {
      return NextResponse.json({ 
        authorized: false, 
        message: 'User not found' 
      })
    }

    const userData = userDoc.data()
    const hasXTokens = userData?.xAccessToken && userData?.xAccessTokenSecret

    if (hasXTokens) {
      return NextResponse.json({
        authorized: true,
        xUsername: userData.xUsername || null,
        xUserId: userData.xUserId || null
      })
    } else {
      return NextResponse.json({
        authorized: false,
        message: 'X OAuth not completed'
      })
    }

  } catch (error) {
    console.error('Error checking X authorization status:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
