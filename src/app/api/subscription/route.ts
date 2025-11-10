import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase-admin'

export async function GET(request: NextRequest) {
  try {
    // Verify user authentication
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const idToken = authHeader.split('Bearer ')[1]
    const decodedToken = await adminAuth.verifyIdToken(idToken)
    const userId = decodedToken.uid

    // Get user document from Firestore
    const userDoc = await adminDb.collection('users').doc(userId).get()
    
    if (!userDoc.exists) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const userData = userDoc.data()
    
    // Get subscription tier from user data
    // Default to 'beta' if no subscription is set
    const tier = userData?.subscription?.tier || userData?.tier || 'beta'
    
    // Return subscription information
    return NextResponse.json({
      tier,
      status: userData?.subscription?.status || 'active',
      billingCycle: userData?.subscription?.billingCycle || 'monthly',
      stripeCustomerId: userData?.subscription?.stripeCustomerId || null,
      stripeSubscriptionId: userData?.subscription?.stripeSubscriptionId || null,
      currentPeriodStart: userData?.subscription?.currentPeriodStart || null,
      currentPeriodEnd: userData?.subscription?.currentPeriodEnd || null
    })
  } catch (error: any) {
    console.error('[Subscription API] Error:', error)
    return NextResponse.json(
      { error: 'Failed to load subscription', details: error.message },
      { status: 500 }
    )
  }
}
