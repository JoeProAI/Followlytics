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

    // For now, use mock data since Firestore is disabled
    // TODO: Get real user data from Firestore once API is enabled
    const twitterUserId = 'mock_twitter_id'
    const accessToken = 'mock_access_token'
    const accessTokenSecret = 'mock_access_token_secret'

    // Return mock unfollower data since Firestore is disabled
    // TODO: Implement real unfollower detection once Firestore API is enabled
    return NextResponse.json({
      unfollowers: [
        {
          id: "mock_unfollower_1",
          username: "example_user",
          name: "Example User",
          profile_image_url: "https://via.placeholder.com/48",
          followers_count: 1234,
          verified: false,
          unfollowed_at: new Date().toISOString()
        }
      ],
      new_followers: [
        {
          id: "mock_new_follower_1", 
          username: "new_follower",
          name: "New Follower",
          profile_image_url: "https://via.placeholder.com/48",
          followers_count: 567,
          verified: false,
          followed_at: new Date().toISOString()
        }
      ],
      message: 'Mock data - enable Firestore for real unfollower tracking'
    })

  } catch (error) {
    console.error('Unfollowers API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
