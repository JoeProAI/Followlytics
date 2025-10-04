import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase-admin'

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.split('Bearer ')[1]
    const decodedToken = await adminAuth.verifyIdToken(token)
    
    if (!decodedToken) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    // Check if user is admin (you can add admin check here)
    // For now, we'll use a simple admin email check
    const adminEmails = (process.env.ADMIN_EMAILS || '').split(',')
    if (!adminEmails.includes(decodedToken.email || '')) {
      return NextResponse.json({ 
        error: 'Unauthorized - Admin access required' 
      }, { status: 403 })
    }

    const { userId, betaAccess } = await request.json()
    
    if (!userId || typeof betaAccess !== 'boolean') {
      return NextResponse.json({ 
        error: 'userId and betaAccess (boolean) are required' 
      }, { status: 400 })
    }

    // Update user document
    await adminDb.collection('users').doc(userId).set(
      { betaAccess },
      { merge: true }
    )

    return NextResponse.json({
      success: true,
      userId,
      betaAccess,
      message: `Beta access ${betaAccess ? 'granted' : 'revoked'} for user ${userId}`
    })

  } catch (error: any) {
    console.error('Beta access error:', error)
    return NextResponse.json({
      error: 'Failed to update beta access',
      details: error.message
    }, { status: 500 })
  }
}

// Get beta access status for a user
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.split('Bearer ')[1]
    const decodedToken = await adminAuth.verifyIdToken(token)
    
    if (!decodedToken) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId') || decodedToken.uid

    const userDoc = await adminDb.collection('users').doc(userId).get()
    const userData = userDoc.data()

    return NextResponse.json({
      userId,
      betaAccess: userData?.betaAccess || false
    })

  } catch (error: any) {
    console.error('Beta access check error:', error)
    return NextResponse.json({
      error: 'Failed to check beta access',
      details: error.message
    }, { status: 500 })
  }
}
