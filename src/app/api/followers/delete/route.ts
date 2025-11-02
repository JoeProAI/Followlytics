import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase-admin'

export async function DELETE(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const idToken = authHeader.split('Bearer ')[1]
    const decodedToken = await adminAuth.verifyIdToken(idToken)
    const userId = decodedToken.uid

    console.log(`[Delete] Deleting all follower data for user: ${userId}`)

    // Delete all followers
    const followersRef = adminDb.collection('users').doc(userId).collection('followers')
    const followersSnapshot = await followersRef.get()
    
    const batch = adminDb.batch()
    let deleteCount = 0
    
    followersSnapshot.docs.forEach(doc => {
      batch.delete(doc.ref)
      deleteCount++
    })

    // Delete unfollower events
    const eventsRef = adminDb.collection('users').doc(userId).collection('unfollower_events')
    const eventsSnapshot = await eventsRef.get()
    
    eventsSnapshot.docs.forEach(doc => {
      batch.delete(doc.ref)
    })

    // Delete tracked accounts
    const trackedRef = adminDb.collection('users').doc(userId).collection('tracked_accounts')
    const trackedSnapshot = await trackedRef.get()
    
    trackedSnapshot.docs.forEach(doc => {
      batch.delete(doc.ref)
    })

    await batch.commit()

    // Reset usage
    const usageRef = adminDb.collection('users').doc(userId).collection('usage').doc('current_month')
    await usageRef.delete()

    // Clear user metadata
    await adminDb.collection('users').doc(userId).update({
      last_follower_extraction: null,
      total_followers_extracted: 0,
      target_username: null,
      first_follower_extraction: null
    })

    console.log(`[Delete] Deleted ${deleteCount} followers and all related data`)

    return NextResponse.json({
      success: true,
      deleted: deleteCount,
      message: 'All follower data deleted successfully'
    })

  } catch (error: any) {
    console.error('[Delete] Error:', error)
    return NextResponse.json({ 
      error: 'Failed to delete data',
      details: error.message 
    }, { status: 500 })
  }
}
