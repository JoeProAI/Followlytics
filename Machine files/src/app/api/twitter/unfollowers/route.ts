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

    // Get user data from Firestore
    const db = admin.firestore()
    const userDoc = await db.collection('users').doc(userId).get()
    
    if (!userDoc.exists) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const userData = userDoc.data()
    const twitterUserId = userData?.twitter_id

    if (!twitterUserId) {
      return NextResponse.json({ error: 'Twitter user ID not found' }, { status: 400 })
    }

    // Get current followers from user's followers subcollection
    const currentFollowersQuery = await db
      .collection('users')
      .doc(userId)
      .collection('followers')
      .get()

    const currentFollowers = currentFollowersQuery.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }))

    // Get previous follower snapshot for comparison
    const snapshotsQuery = await db
      .collection('follower_snapshots')
      .where('user_id', '==', userId)
      .orderBy('timestamp', 'desc')
      .limit(1)
      .get()

    if (snapshotsQuery.empty) {
      // Create first snapshot
      await db.collection('follower_snapshots').add({
        user_id: userId,
        twitter_user_id: twitterUserId,
        follower_ids: currentFollowers.map(f => f.id),
        followers_data: currentFollowers,
        follower_count: currentFollowers.length,
        timestamp: admin.firestore.FieldValue.serverTimestamp()
      })

      return NextResponse.json({
        unfollowers: [],
        new_followers: [],
        message: 'First snapshot created. Unfollower detection will be available after the next scan.',
        summary: {
          current_followers: currentFollowers.length
        }
      })
    }

    const previousSnapshot = snapshotsQuery.docs[0]
    const previousFollowerIds = new Set(previousSnapshot.data().follower_ids || [])
    const previousFollowersData = previousSnapshot.data().followers_data || []
    const currentFollowerIds = new Set(currentFollowers.map(f => f.id))

    // Find unfollowers (in previous but not in current)
    const unfollowerIds = Array.from(previousFollowerIds).filter(id => !currentFollowerIds.has(id as string))
    const unfollowers = previousFollowersData.filter((f: any) => unfollowerIds.includes(f.id))

    // Find new followers (in current but not in previous)
    const newFollowerIds = Array.from(currentFollowerIds).filter(id => !previousFollowerIds.has(id))
    const newFollowers = currentFollowers.filter((f: any) => newFollowerIds.includes(f.id))

    // Store unfollower events
    if (unfollowers.length > 0) {
      const batch = db.batch()
      
      unfollowers.forEach((unfollower: any) => {
        const unfollowerRef = db.collection('unfollower_events').doc()
        batch.set(unfollowerRef, {
          user_id: userId,
          twitter_user_id: twitterUserId,
          unfollower_id: unfollower.id,
          unfollower_username: unfollower.username,
          unfollower_name: unfollower.name,
          unfollower_profile_image: unfollower.profile_image_url,
          unfollowed_at: admin.firestore.FieldValue.serverTimestamp(),
          detected_at: admin.firestore.FieldValue.serverTimestamp()
        })
      })
      
      await batch.commit()
    }

    // Create new snapshot after processing
    await db.collection('follower_snapshots').add({
      user_id: userId,
      twitter_user_id: twitterUserId,
      follower_ids: currentFollowers.map(f => f.id),
      followers_data: currentFollowers,
      follower_count: currentFollowers.length,
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    })

    return NextResponse.json({
      unfollowers: unfollowers.map((u: any) => ({
        id: u.id,
        username: u.username,
        name: u.name,
        profile_image_url: u.profile_image_url,
        followers_count: u.followers_count,
        verified: u.verified
      })),
      new_followers: newFollowers.map((f: any) => ({
        id: f.id,
        username: f.username,
        name: f.name,
        profile_image_url: f.profile_image_url,
        followers_count: f.followers_count,
        verified: f.verified
      })),
      summary: {
        unfollowers_count: unfollowers.length,
        new_followers_count: newFollowers.length,
        net_change: newFollowers.length - unfollowers.length,
        current_followers: currentFollowerIds.size,
        previous_followers: previousFollowerIds.size
      },
      timestamps: {
        current_scan: new Date().toISOString(),
        previous_scan: previousSnapshot.data().timestamp?.toDate?.()?.toISOString()
      }
    })

  } catch (error) {
    console.error('Unfollowers API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
