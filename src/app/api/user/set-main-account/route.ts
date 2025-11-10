import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase-admin'

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
    const { username } = body

    if (!username || typeof username !== 'string') {
      return NextResponse.json({ 
        error: 'Username is required' 
      }, { status: 400 })
    }

    // Clean and normalize username
    const cleanUsername = username.trim().toLowerCase().replace('@', '')

    if (!cleanUsername || cleanUsername.length < 1) {
      return NextResponse.json({ 
        error: 'Invalid username' 
      }, { status: 400 })
    }

    // Update user document with main account
    await adminDb.collection('users').doc(userId).update({
      target_username: cleanUsername,
      xUsername: cleanUsername, // Also set as xUsername for consistency
      mainAccountSetAt: new Date().toISOString()
    })

    console.log(`✅ Set main account for ${userEmail} (${userId}) to: @${cleanUsername}`)

    return NextResponse.json({
      success: true,
      username: cleanUsername,
      message: `Main account set to @${cleanUsername}`
    })
  } catch (error: any) {
    console.error('[Set Main Account] Error:', error)
    return NextResponse.json(
      { error: 'Failed to set main account', details: error.message },
      { status: 500 }
    )
  }
}
