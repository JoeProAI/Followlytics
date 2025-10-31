import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase-admin'

/**
 * Get all tracked accounts for a user
 * Returns "my account" + tracked accounts separately
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

    // Get user's primary account
    const userDoc = await adminDb.collection('users').doc(userId).get()
    const userData = userDoc.data()
    const myAccount = userData?.my_account || null
    const activeAccount = userData?.target_username || myAccount

    // Get all tracked accounts
    const trackedAccountsSnapshot = await adminDb
      .collection('users')
      .doc(userId)
      .collection('tracked_accounts')
      .orderBy('last_extraction', 'desc')
      .get()

    const allAccounts = trackedAccountsSnapshot.docs.map(doc => ({
      username: doc.id,
      ...doc.data()
    }))

    // Separate my account from tracked accounts
    const myAccountData = myAccount ? allAccounts.find(a => a.username === myAccount) : null
    const trackedAccounts = allAccounts.filter(a => a.username !== myAccount)

    return NextResponse.json({
      success: true,
      myAccount: myAccountData || { username: myAccount, display_username: userData?.my_account_display },
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

/**
 * Remove a tracked account
 * WARNING: This deletes all followers, events, and analytics for this account
 */
export async function DELETE(request: NextRequest) {
  try {
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

    const targetUsername = username.toLowerCase()

    // Prevent removing "my account"
    const userDoc = await adminDb.collection('users').doc(userId).get()
    const userData = userDoc.data()
    const myAccount = userData?.my_account

    if (targetUsername === myAccount) {
      return NextResponse.json({
        error: 'Cannot remove your primary account. To change it, set a new primary account first.'
      }, { status: 400 })
    }

    // Delete tracked account metadata
    await adminDb
      .collection('users')
      .doc(userId)
      .collection('tracked_accounts')
      .doc(targetUsername)
      .delete()

    // Delete all followers for this account
    const followersSnapshot = await adminDb
      .collection('users')
      .doc(userId)
      .collection('followers')
      .where('target_username', '==', targetUsername)
      .get()

    const batch = adminDb.batch()
    followersSnapshot.docs.forEach(doc => {
      batch.delete(doc.ref)
    })

    // Delete all events for this account
    const eventsSnapshot = await adminDb
      .collection('users')
      .doc(userId)
      .collection('unfollower_events')
      .where('target_username', '==', targetUsername)
      .get()

    eventsSnapshot.docs.forEach(doc => {
      batch.delete(doc.ref)
    })

    await batch.commit()

    // If this was the active account, switch to my account
    if (userData?.target_username === targetUsername) {
      await adminDb.collection('users').doc(userId).update({
        target_username: myAccount || null
      })
    }

    return NextResponse.json({
      success: true,
      message: `Account @${username} and all its data removed successfully`
    })

  } catch (error: any) {
    console.error('[Tracked Accounts] Delete error:', error)
    return NextResponse.json({
      error: 'Failed to remove account',
      details: error.message
    }, { status: 500 })
  }
}

