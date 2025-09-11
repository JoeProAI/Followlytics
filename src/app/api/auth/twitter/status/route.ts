import { NextRequest, NextResponse } from 'next/server'

// Firebase Admin SDK initialization function
async function initializeFirebaseAdmin() {
  try {
    const { getApps, initializeApp, cert } = await import('firebase-admin/app')
    const { getAuth } = await import('firebase-admin/auth')
    const { getFirestore } = await import('firebase-admin/firestore')
    
    if (getApps().length === 0) {
      const serviceAccountKey = process.env.FIREBASE_ADMIN_SDK_KEY
      
      if (serviceAccountKey) {
        try {
          const serviceAccount = JSON.parse(serviceAccountKey)
          initializeApp({
            credential: cert(serviceAccount)
          })
        } catch (jsonError) {
          // Fall through to individual environment variables
        }
      }
      
      if (getApps().length === 0) {
        const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
        const clientEmail = process.env.FIREBASE_CLIENT_EMAIL
        let privateKey = process.env.FIREBASE_PRIVATE_KEY
        
        if (privateKey) {
          privateKey = privateKey
            .replace(/^["']|["']$/g, '')
            .replace(/\\n/g, '\n')
            .trim()
        }
        
        if (!projectId || !clientEmail || !privateKey) {
          throw new Error(`Missing Firebase config`)
        }
        
        initializeApp({
          credential: cert({
            projectId: projectId,
            clientEmail: clientEmail,
            privateKey: privateKey
          })
        })
      }
    }
    
    return { auth: getAuth, firestore: getFirestore }
  } catch (error) {
    console.error('Firebase Admin initialization error:', error)
    throw error
  }
}

export async function GET(request: NextRequest) {
  try {
    // Get Firebase token from cookie
    const firebaseToken = request.cookies.get('firebase_token')?.value
    
    if (!firebaseToken) {
      return NextResponse.json({ authorized: false, error: 'No authentication token' })
    }

    // Initialize Firebase Admin
    const firebase = await initializeFirebaseAdmin()
    
    // Verify the token and get user ID
    let userId: string
    try {
      // Try to verify as ID token first
      const decodedToken = await firebase.auth().verifyIdToken(firebaseToken)
      userId = decodedToken.uid
    } catch (idTokenError) {
      // If that fails, try to verify as custom token by checking session
      try {
        const decodedToken = await firebase.auth().verifySessionCookie(firebaseToken)
        userId = decodedToken.uid
      } catch (sessionError) {
        // Extract user ID from custom token payload (fallback)
        const tokenParts = firebaseToken.split('.')
        if (tokenParts.length === 3) {
          const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString())
          userId = payload.uid || payload.sub
        } else {
          throw new Error('Invalid token format')
        }
      }
    }

    // Check if user has Twitter tokens in Firestore
    const db = firebase.firestore()
    const userDoc = await db.collection('users').doc(userId).get()
    
    if (!userDoc.exists) {
      return NextResponse.json({ authorized: false, error: 'User not found' })
    }

    const userData = userDoc.data()
    const hasTwitterTokens = !!(userData?.access_token && userData?.access_token_secret)

    return NextResponse.json({ 
      authorized: hasTwitterTokens,
      username: userData?.username || null
    })

  } catch (error) {
    console.error('Twitter auth status check failed:', error)
    return NextResponse.json({ 
      authorized: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    })
  }
}
