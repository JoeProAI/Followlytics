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

    console.log('[Fix Tokens] Fixing tokens for user:', userId)

    // Find the X-only account that was just created
    const xOnlyAccountId = `x_${decodedToken.uid.split('_')[1] || ''}`
    
    // Try to find tokens in common places
    const possibleLocations = [
      `x_1767231492793434113`, // The X account ID we've been seeing
      xOnlyAccountId,
    ]

    let foundTokens: any = null
    let foundLocation: string | null = null

    for (const location of possibleLocations) {
      console.log('[Fix Tokens] Checking:', location)
      const doc = await adminDb.collection('x_tokens').doc(location).get()
      if (doc.exists) {
        const data = doc.data()
        if (data?.accessToken && data?.accessTokenSecret) {
          foundTokens = data
          foundLocation = location
          console.log('[Fix Tokens] Found tokens at:', location)
          break
        }
      }
    }

    if (!foundTokens) {
      console.log('[Fix Tokens] No tokens found to move')
      return NextResponse.json({ 
        success: false,
        message: 'No X tokens found to fix'
      })
    }

    // Copy tokens to the correct user account
    console.log('[Fix Tokens] Copying tokens to:', userId)
    await adminDb.collection('x_tokens').doc(userId).set({
      accessToken: foundTokens.accessToken,
      accessTokenSecret: foundTokens.accessTokenSecret,
      xUserId: foundTokens.xUserId,
      screenName: foundTokens.screenName,
      userId: userId,
      createdAt: new Date(),
      copiedFrom: foundLocation,
    })

    console.log('✅ Tokens fixed! Copied from', foundLocation, 'to', userId)

    // Optionally delete the old X-only account document
    // await adminDb.collection('x_tokens').doc(foundLocation).delete()

    return NextResponse.json({ 
      success: true,
      message: 'X tokens fixed successfully',
      copiedFrom: foundLocation,
      copiedTo: userId
    })

  } catch (error) {
    console.error('[Fix Tokens] Error:', error)
    return NextResponse.json(
      { error: 'Failed to fix tokens', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
