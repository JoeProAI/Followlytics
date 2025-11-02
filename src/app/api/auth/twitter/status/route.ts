import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase-admin'

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

    // Log environment variable status for debugging
    console.log('Firebase config check:', {
      projectId: !!process.env.FIREBASE_PROJECT_ID,
      clientEmail: !!process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: !!process.env.FIREBASE_PRIVATE_KEY
    })

    // Get the authorization header
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'No authorization token provided' }, { status: 401 })
    }

    const token = authHeader.split(' ')[1]
    
    // Verify the Firebase token
    const decodedToken = await adminAuth.verifyIdToken(token)
    const userId = decodedToken.uid

    // Check if user has X OAuth tokens stored in x_tokens collection
    console.log('[Status Check] Checking x_tokens for userId:', userId)
    const xTokensDoc = await adminDb.collection('x_tokens').doc(userId).get()
    
    console.log('[Status Check] Document exists?', xTokensDoc.exists)
    
    if (!xTokensDoc.exists) {
      console.log('[Status Check] No x_tokens document found for user')
      return NextResponse.json({ 
        connected: false,
        authorized: false, 
        message: 'X OAuth not completed - no tokens found' 
      })
    }

    const tokenData = xTokensDoc.data()
    console.log('[Status Check] Token data:', {
      hasAccessToken: !!tokenData?.accessToken,
      hasAccessTokenSecret: !!tokenData?.accessTokenSecret,
      screenName: tokenData?.screenName,
      xUserId: tokenData?.xUserId
    })
    
    const hasXTokens = tokenData?.accessToken && tokenData?.accessTokenSecret

    if (hasXTokens) {
      return NextResponse.json({
        connected: true,
        authorized: true,
        xUsername: tokenData.screenName || null,
        xUserId: tokenData.xUserId || null
      })
    } else {
      return NextResponse.json({
        connected: false,
        authorized: false,
        message: 'X OAuth tokens incomplete'
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
