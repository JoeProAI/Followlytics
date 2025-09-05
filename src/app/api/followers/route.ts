import { NextRequest, NextResponse } from 'next/server'
import * as admin from 'firebase-admin'

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  try {
    const privateKey = process.env.FIREBASE_ADMIN_SDK_KEY?.replace(/\\n/g, '\n')
    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL
    
    console.log('Firebase Admin init - Project ID:', projectId)
    console.log('Firebase Admin init - Client Email:', clientEmail)
    console.log('Firebase Admin init - Private Key exists:', !!privateKey)
    
    if (!privateKey || !projectId || !clientEmail) {
      throw new Error(`Firebase Admin SDK not properly configured: privateKey=${!!privateKey}, projectId=${!!projectId}, clientEmail=${!!clientEmail}`)
    }

    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: projectId,
        clientEmail: clientEmail,
        privateKey: privateKey,
      }),
    })
    
    console.log('Firebase Admin initialized successfully')
  } catch (error) {
    console.error('Firebase Admin initialization error:', error)
    throw error
  }
}

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    console.log('Followers API called')
    
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

    // Get followers from Firestore
    const db = admin.firestore()
    console.log('Querying followers for user:', userId)
    
    const followersQuery = await db
      .collection('users')
      .doc(userId)
      .collection('followers')
      .orderBy('scanned_at', 'desc')
      .limit(1000)
      .get()

    const followers = followersQuery.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }))
    
    console.log('Found followers:', followers.length)

    // Get user's last scan info
    const userDoc = await db.collection('users').doc(userId).get()
    const userData = userDoc.data()
    console.log('User data exists:', !!userData)

    return NextResponse.json({
      followers: followers,
      count: followers.length,
      last_scan: userData?.last_follower_scan?.toDate?.()?.toISOString(),
      total_followers: userData?.follower_count || followers.length
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
