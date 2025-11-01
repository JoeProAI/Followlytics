import { NextRequest, NextResponse } from 'next/server'
import { getAuth } from 'firebase-admin/auth'
import getFirebaseAdminApp from '@/lib/firebase-admin'
import { getFirestore } from 'firebase-admin/firestore'

const adminDb = getFirestore(getFirebaseAdminApp())

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.split('Bearer ')[1]
    const decodedToken = await getAuth(getFirebaseAdminApp()).verifyIdToken(token)
    const userId = decodedToken.uid

    // Get user document
    const userDoc = await adminDb.collection('users').doc(userId).get()
    
    if (!userDoc.exists) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const userData = userDoc.data()

    return NextResponse.json({
      success: true,
      userId,
      email: decodedToken.email,
      xUsername: userData?.xUsername || userData?.twitterUsername || null,
      displayName: userData?.displayName || decodedToken.name || null,
      photoURL: userData?.photoURL || null,
      tier: userData?.tier || 'free',
      createdAt: userData?.createdAt || null,
    })

  } catch (error: any) {
    console.error('Get user profile error:', error)
    return NextResponse.json({ 
      error: 'Failed to get user profile',
      details: error.message 
    }, { status: 500 })
  }
}
