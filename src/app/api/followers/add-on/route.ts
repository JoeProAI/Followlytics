import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase-admin'
import { FieldValue } from 'firebase-admin/firestore'

export const dynamic = 'force-dynamic'

/**
 * Purchase follower add-on packs for accounts that need more than their tier limit
 * 
 * Add-on Pricing:
 * - 50K followers: $50 (one-time)
 * - 100K followers: $90 (one-time, 10% discount)
 * - 250K followers: $200 (one-time, 20% discount)
 * - 500K followers: $350 (one-time, 30% discount)
 * 
 * Add-ons roll over month-to-month until used up
 */
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const idToken = authHeader.split('Bearer ')[1]
    const decodedToken = await adminAuth.verifyIdToken(idToken)
    const userId = decodedToken.uid

    const body = await request.json()
    const { pack } = body // 'small', 'medium', 'large', 'xlarge'

    // Define add-on packs
    const packs: Record<string, { followers: number; price: number; name: string }> = {
      small: { followers: 50_000, price: 50, name: '50K Followers' },
      medium: { followers: 100_000, price: 90, name: '100K Followers' },
      large: { followers: 250_000, price: 200, name: '250K Followers' },
      xlarge: { followers: 500_000, price: 350, name: '500K Followers' }
    }

    const selectedPack = packs[pack]
    if (!selectedPack) {
      return NextResponse.json({ 
        error: 'Invalid pack. Choose: small, medium, large, or xlarge' 
      }, { status: 400 })
    }

    // Get current add-ons
    const userRef = adminDb.collection('users').doc(userId)
    const userDoc = await userRef.get()
    const userData = userDoc.data() || {}
    
    const currentAddons = userData.follower_addons || 0
    const newTotal = currentAddons + selectedPack.followers

    // Update user's add-on balance
    await userRef.set({
      follower_addons: newTotal,
      last_addon_purchase: new Date().toISOString(),
      addon_purchase_history: FieldValue.arrayUnion({
        pack: pack,
        followers: selectedPack.followers,
        price: selectedPack.price,
        purchasedAt: new Date().toISOString()
      })
    }, { merge: true })

    console.log(`[Add-on] User ${userId} purchased ${selectedPack.name} for $${selectedPack.price}`)

    return NextResponse.json({
      success: true,
      pack: selectedPack.name,
      followers_added: selectedPack.followers,
      new_total_addons: newTotal,
      price: selectedPack.price,
      message: `Successfully added ${selectedPack.followers.toLocaleString()} followers to your account!`
    })

  } catch (error: any) {
    console.error('[Add-on] Error:', error)
    return NextResponse.json({ 
      error: 'Failed to purchase add-on',
      details: error.message 
    }, { status: 500 })
  }
}

/**
 * Check current add-on balance
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
    const userData = userDoc.data() || {}
    
    return NextResponse.json({
      follower_addons: userData.follower_addons || 0,
      last_purchase: userData.last_addon_purchase || null,
      purchase_history: userData.addon_purchase_history || []
    })

  } catch (error: any) {
    console.error('[Add-on] Error fetching balance:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch add-on balance',
      details: error.message 
    }, { status: 500 })
  }
}
