import { NextRequest, NextResponse } from 'next/server'
import * as admin from 'firebase-admin'

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  const privateKey = process.env.FIREBASE_ADMIN_SDK_KEY?.replace(/\\n/g, '\n')
  
  if (!privateKey) {
    throw new Error('Firebase Admin SDK private key is not configured')
  }

  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "followlytics-cd4e1",
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL || "firebase-adminsdk-fbsvc@followlytics-cd4e1.iam.gserviceaccount.com",
      privateKey: privateKey,
    }),
  })
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
    const db = admin.firestore()
    const unfollowersQuery = await db
      .collection('users')
      .doc(userId)
      .collection('unfollower_events')
      .orderBy('unfollowed_at', 'desc')
      .limit(100)
      .get()

    const unfollowers = unfollowersQuery.docs.map(doc => ({
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
