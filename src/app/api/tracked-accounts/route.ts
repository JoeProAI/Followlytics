import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase-admin'

/**
 * Get all tracked accounts for a user
 * POST: Set active tracked account
 */
export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const idToken = authHeader.split('Bearer ')[1]
    const decodedToken = await adminAuth.verifyIdToken(idToken)
    const userId = decodedToken.uid

    // Get all tracked accounts
    const trackedAccountsSnapshot = await adminDb
      .collection('users')
      .doc(userId)
      .collection('tracked_accounts')
      .orderBy('last_extraction', 'desc')
      .get()

    const trackedAccounts = trackedAccountsSnapshot.docs.map(doc => ({
      username: doc.id,
      ...doc.data()
    }))

    // Get current active account
    const userDoc = await adminDb.collection('users').doc(userId).get()
    const userData = userDoc.data()
    const activeAccount = userData?.target_username || (trackedAccounts[0]?.username || null)

    return NextResponse.json({
      success: true,
      trackedAccounts,
      activeAccount
    })

  } catch (error: any) {
    console.error('[Tracked Accounts] Error:', error)
    return NextResponse.json({
      error: 'Failed to load tracked accounts',
      details: error.message
    }, { status: 500 })
  }
}

/**
 * Set active tracked account
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

    // Verify this account exists in tracked accounts
    const trackedAccountDoc = await adminDb
      .collection('users')
      .doc(userId)
      .collection('tracked_accounts')
      .doc(username.toLowerCase())
      .get()

    if (!trackedAccountDoc.exists) {
      return NextResponse.json({ 
        error: 'Account not tracked. Extract followers first to track this account.' 
      }, { status: 404 })
    }

    // Update active account
    await adminDb.collection('users').doc(userId).update({
      target_username: username.toLowerCase()
    })

    return NextResponse.json({
      success: true,
      activeAccount: username.toLowerCase()
    })

  } catch (error: any) {
    console.error('[Tracked Accounts] Set active error:', error)
    return NextResponse.json({
      error: 'Failed to set active account',
      details: error.message
    }, { status: 500 })
  }
}
