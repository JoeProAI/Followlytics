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
    const userEmail = decodedToken.email

    // Get user document from Firestore
    const userDoc = await adminDb.collection('users').doc(userId).get()
    
    if (!userDoc.exists) {
      return NextResponse.json({ 
        error: 'User not found',
        userId,
        email: userEmail
      }, { status: 404 })
    }

    const userData = userDoc.data()
    
    // Return ALL tier-related data for debugging
    return NextResponse.json({
      userId,
      email: userEmail,
      
      // Check all possible tier locations
      tier: userData?.tier || null,
      subscriptionTier: userData?.subscription?.tier || null,
      subscriptionObject: userData?.subscription || null,
      
      // Check target username (for JoeProAI verification)
      targetUsername: userData?.target_username || null,
      xUsername: userData?.xUsername || null,
      
      // Check if X is connected
      xConnected: userData?.xConnected || false,
      
      // Full subscription object if exists
      rawSubscription: userData?.subscription || null,
      
      // Computed tier (what the API would return)
      computedTier: userData?.subscription?.tier || userData?.tier || 'beta',
      
      // Full user data (sanitized - no sensitive tokens)
      userData: {
        ...userData,
        // Remove sensitive fields
        x_tokens: userData?.x_tokens ? '[REDACTED]' : null
      }
    })
  } catch (error: any) {
    console.error('[Check User Tier] Error:', error)
    return NextResponse.json(
      { error: 'Failed to check user tier', details: error.message },
      { status: 500 }
    )
  }
}

// POST endpoint to update tier (admin only - for fixing the tier)
export async function POST(request: NextRequest) {
  try {
    // Verify user authentication
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const idToken = authHeader.split('Bearer ')[1]
    const decodedToken = await adminAuth.verifyIdToken(idToken)
    const userId = decodedToken.uid
    const userEmail = decodedToken.email

    const body = await request.json()
    const { newTier } = body

    if (!newTier || !['beta', 'starter', 'pro', 'scale', 'enterprise'].includes(newTier)) {
      return NextResponse.json({ 
        error: 'Invalid tier. Must be: beta, starter, pro, scale, or enterprise' 
      }, { status: 400 })
    }

    // Update the user's tier
    await adminDb.collection('users').doc(userId).update({
      tier: newTier,
      tierUpdatedAt: new Date().toISOString()
    })

    console.log(`[Admin] Updated tier for user ${userEmail} (${userId}) to: ${newTier}`)

    return NextResponse.json({
      success: true,
      userId,
      email: userEmail,
      oldTier: 'unknown',
      newTier,
      message: `Successfully updated tier to ${newTier}`
    })
  } catch (error: any) {
    console.error('[Update User Tier] Error:', error)
    return NextResponse.json(
      { error: 'Failed to update user tier', details: error.message },
      { status: 500 }
    )
  }
}
