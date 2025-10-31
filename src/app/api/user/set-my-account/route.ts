import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase-admin'

/**
 * Set the user's primary X account (their own account)
 * This is different from tracked accounts (competitors/research)
 */
export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const idToken = authHeader.split('Bearer ')[1]
    const decodedToken = await adminAuth.verifyIdToken(idToken)
    const userId = decodedToken.uid

    const { username } = await request.json()

    if (!username) {
      return NextResponse.json({ error: 'Username is required' }, { status: 400 })
    }

    // Set user's primary account
    await adminDb.collection('users').doc(userId).set({
      my_account: username.toLowerCase(),
      my_account_display: username,
      target_username: username.toLowerCase(), // Active account
      updated_at: new Date().toISOString()
    }, { merge: true })

    return NextResponse.json({
      success: true,
      myAccount: username.toLowerCase()
    })

  } catch (error: any) {
    console.error('[Set My Account] Error:', error)
    return NextResponse.json({
      error: 'Failed to set account',
      details: error.message
    }, { status: 500 })
  }
}

/**
 * Get user's primary account
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const idToken = authHeader.split('Bearer ')[1]
    const decodedToken = await adminAuth.verifyIdToken(idToken)
    const userId = decodedToken.uid

    const userDoc = await adminDb.collection('users').doc(userId).get()
    const userData = userDoc.data()

    return NextResponse.json({
      success: true,
      myAccount: userData?.my_account || null,
      myAccountDisplay: userData?.my_account_display || null
    })

  } catch (error: any) {
    console.error('[Get My Account] Error:', error)
    return NextResponse.json({
      error: 'Failed to get account',
      details: error.message
    }, { status: 500 })
  }
}
