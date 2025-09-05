import { NextRequest, NextResponse } from 'next/server'
import * as admin from 'firebase-admin'

// Initialize Firebase Admin - handle serverless environment
function initializeFirebaseAdmin() {
  if (admin.apps.length > 0) {
    return admin.apps[0]
  }

  try {
    // Handle different private key formats in production
    let privateKey = process.env.FIREBASE_ADMIN_SDK_KEY
    if (privateKey) {
      // Replace escaped newlines with actual newlines
      privateKey = privateKey.replace(/\\n/g, '\n')
      // Ensure proper PEM format
      if (!privateKey.includes('-----BEGIN PRIVATE KEY-----')) {
        privateKey = `-----BEGIN PRIVATE KEY-----\n${privateKey}\n-----END PRIVATE KEY-----\n`
      }
    }
    
    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL
    
    console.log('Firebase Admin init - Project ID:', projectId)
    console.log('Firebase Admin init - Client Email:', clientEmail)
    console.log('Firebase Admin init - Private Key exists:', !!privateKey)
    console.log('Firebase Admin init - Private Key has BEGIN marker:', privateKey?.includes('-----BEGIN') || false)
    
    if (!privateKey || !projectId || !clientEmail) {
      throw new Error(`Firebase Admin SDK not properly configured: privateKey=${!!privateKey}, projectId=${!!projectId}, clientEmail=${!!clientEmail}`)
    }

    const app = admin.initializeApp({
      credential: admin.credential.cert({
        projectId: projectId,
        clientEmail: clientEmail,
        privateKey: privateKey,
      }),
    })
    
    console.log('Firebase Admin initialized successfully')
    return app
  } catch (error) {
    console.error('Firebase Admin initialization error:', error)
    throw error
  }
}

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    console.log('Followers API called')
    
    // Initialize Firebase Admin
    initializeFirebaseAdmin()
    
    // Get user from Firebase token
    const token = request.cookies.get('firebase_token')?.value
    console.log('Token exists:', !!token)
    
    if (!token) {
      console.log('No token found in cookies')
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    console.log('Verifying token...')
    const decodedToken = await admin.auth().verifyIdToken(token)
    const userId = decodedToken.uid
    console.log('Token verified, userId:', userId)

    // Return empty followers for now to test if API works
    console.log('Returning empty followers list for testing')

    return NextResponse.json({
      followers: [],
      count: 0,
      last_scan: null,
      total_followers: 0,
      message: 'API working - no followers scanned yet'
    })

  } catch (error) {
    console.error('Followers API error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    const errorStack = error instanceof Error ? error.stack : undefined
    const errorName = error instanceof Error ? error.name : 'Error'
    
    console.error('Error details:', {
      message: errorMessage,
      stack: errorStack,
      name: errorName
    })
    return NextResponse.json({ 
      error: 'Internal server error',
      details: errorMessage 
    }, { status: 500 })
  }
}
