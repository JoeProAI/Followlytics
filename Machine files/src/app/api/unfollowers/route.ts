import { NextRequest, NextResponse } from 'next/server'

// Firebase Admin SDK initialization function
async function initializeFirebaseAdmin() {
  try {
    const { getApps, initializeApp, cert } = await import('firebase-admin/app')
    const { getFirestore } = await import('firebase-admin/firestore')
    
    if (getApps().length === 0) {
      // Try using service account key first (if available)
      const serviceAccountKey = process.env.FIREBASE_ADMIN_SDK_KEY
      
      if (serviceAccountKey) {
        try {
          console.log('Attempting to parse service account JSON, length:', serviceAccountKey.length)
          const serviceAccount = JSON.parse(serviceAccountKey)
          console.log('Service account parsed successfully, project_id:', serviceAccount.project_id)
          initializeApp({
            credential: cert(serviceAccount)
          })
        } catch (jsonError) {
          console.error('Failed to parse service account JSON:', jsonError)
          console.log('Service account key preview:', serviceAccountKey.substring(0, 100) + '...')
          // Fall through to individual environment variables instead of throwing
        }
      }
      
      // Use individual environment variables (either as fallback or primary)
      if (getApps().length === 0) {
        // Fallback to individual environment variables
        const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
        const clientEmail = process.env.FIREBASE_CLIENT_EMAIL
        let privateKey = process.env.FIREBASE_PRIVATE_KEY
        
        if (privateKey) {
          // Enhanced private key processing
          privateKey = privateKey
            .replace(/^["']|["']$/g, '') // Remove outer quotes
            .replace(/\\n/g, '\n') // Convert escaped newlines
            .trim()
          
          // More flexible PEM validation - check for key boundaries after processing
          const hasBeginMarker = privateKey.includes('-----BEGIN PRIVATE KEY-----') || privateKey.includes('-----BEGIN RSA PRIVATE KEY-----')
          const hasEndMarker = privateKey.includes('-----END PRIVATE KEY-----') || privateKey.includes('-----END RSA PRIVATE KEY-----')
          
          if (!hasBeginMarker || !hasEndMarker) {
            console.log('Private key validation failed. Key preview:', privateKey.substring(0, 50) + '...')
            console.log('Has begin marker:', hasBeginMarker, 'Has end marker:', hasEndMarker)
            throw new Error('Invalid private key format - must be PEM format')
          }
        }
        
        if (!projectId || !clientEmail || !privateKey) {
          throw new Error(`Missing Firebase config: projectId=${projectId || 'MISSING'}, clientEmail=${clientEmail || 'MISSING'}, privateKey=${privateKey ? 'SET' : 'MISSING'}`)
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
    
    return { firestore: getFirestore }
  } catch (error) {
    console.error('Firebase Admin initialization error:', error)
    throw error
  }
}

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    // Get user from Firebase token
    const token = request.cookies.get('firebase_token')?.value
    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // The token is a custom token, decode it to get user ID
    let userId
    try {
      const tokenParts = token.split('.')
      if (tokenParts.length !== 3) {
        throw new Error('Invalid token format')
      }
      
      const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString())
      userId = payload.uid
      
      if (!userId) {
        throw new Error('No user ID in token')
      }
      
      console.log('User ID extracted from custom token:', userId)
    } catch (error) {
      console.error('Token processing failed:', error)
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    // Get unfollower events from Firestore
    const firebase = await initializeFirebaseAdmin()
    const db = firebase.firestore()
    const unfollowersQuery = await db
      .collection('users')
      .doc(userId)
      .collection('unfollower_events')
      .orderBy('unfollowed_at', 'desc')
      .limit(100)
      .get()

    const unfollowers = unfollowersQuery.docs.map((doc: any) => ({
      id: doc.id,
      ...doc.data(),
      unfollowed_at: doc.data().unfollowed_at?.toDate?.()?.toISOString()
    }))

    return NextResponse.json({
      unfollowers: unfollowers,
      count: unfollowers.length
    })

  } catch (error) {
    console.error('Unfollowers API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
