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

    const decodedToken = await admin.auth().verifyIdToken(token)
    const userId = decodedToken.uid

    // Get followers from Firestore
    const db = admin.firestore()
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

    // Get user's last scan info
    const userDoc = await db.collection('users').doc(userId).get()
    const userData = userDoc.data()

    return NextResponse.json({
      followers: followers,
      count: followers.length,
      last_scan: userData?.last_follower_scan?.toDate?.()?.toISOString(),
      total_followers: userData?.follower_count || followers.length
    })

  } catch (error) {
    console.error('Followers API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
