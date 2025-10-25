import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase-admin'

// Get user's credit balance
export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const decodedToken = await adminAuth.verifyIdToken(token)
    const userId = decodedToken.uid

    const userDoc = await adminDb.collection('users').doc(userId).get()
    const balance = userDoc.data()?.api_credits || 0

    return NextResponse.json({ 
      balance,
      formatted: `$${balance.toFixed(2)}`,
    })

  } catch (error: any) {
    console.error('[Credits] Error fetching balance:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch balance',
      details: error.message 
    }, { status: 500 })
  }
}
