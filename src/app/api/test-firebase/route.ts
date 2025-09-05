import { NextRequest, NextResponse } from 'next/server'
import * as admin from 'firebase-admin'

// Initialize Firebase Admin - handle serverless environment
function initializeFirebaseAdmin() {
  if (admin.apps.length > 0) {
    return admin.apps[0]
  }

  try {
    const privateKey = process.env.FIREBASE_ADMIN_SDK_KEY?.replace(/\\n/g, '\n')
    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL
    
    console.log('Firebase Admin init - Project ID:', projectId)
    console.log('Firebase Admin init - Client Email:', clientEmail)
    console.log('Firebase Admin init - Private Key exists:', !!privateKey)
    console.log('Firebase Admin init - Private Key length:', privateKey?.length || 0)
    console.log('Firebase Admin init - Private Key first 50 chars:', privateKey?.substring(0, 50))
    
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
    console.log('Test Firebase API called')
    
    // Initialize Firebase Admin
    const app = initializeFirebaseAdmin()
    console.log('Firebase app initialized:', !!app)
    
    // Test basic Firebase Admin functionality
    const auth = admin.auth()
    console.log('Firebase Auth service available:', !!auth)
    
    const db = admin.firestore()
    console.log('Firestore service available:', !!db)
    
    // Get user from Firebase token
    const token = request.cookies.get('firebase_token')?.value
    console.log('Token exists:', !!token)
    console.log('Token length:', token?.length || 0)
    
    if (!token) {
      return NextResponse.json({ 
        status: 'no_token',
        firebase_initialized: !!app,
        auth_available: !!auth,
        firestore_available: !!db
      })
    }

    console.log('Attempting to verify token...')
    const decodedToken = await admin.auth().verifyIdToken(token)
    console.log('Token verified successfully, userId:', decodedToken.uid)
    
    // Test Firestore connection
    const testDoc = await db.collection('test').doc('connection').get()
    console.log('Firestore connection test completed')

    return NextResponse.json({
      status: 'success',
      firebase_initialized: true,
      auth_available: true,
      firestore_available: true,
      token_verified: true,
      user_id: decodedToken.uid,
      firestore_connected: true
    })

  } catch (error) {
    console.error('Test Firebase API error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    const errorStack = error instanceof Error ? error.stack : undefined
    
    console.error('Error details:', {
      message: errorMessage,
      stack: errorStack,
      name: error instanceof Error ? error.name : 'Error'
    })
    
    return NextResponse.json({ 
      status: 'error',
      error: errorMessage,
      details: errorStack
    }, { status: 500 })
  }
}
