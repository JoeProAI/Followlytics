import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase-admin'

export const dynamic = 'force-dynamic'

/**
 * Get current month's usage stats for the authenticated user
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

    // Get current month's usage
    const usageRef = adminDb
      .collection('users')
      .doc(userId)
      .collection('usage')
      .doc('current_month')

    const usageSnapshot = await usageRef.get()

    if (!usageSnapshot.exists) {
      // No usage yet this month
      return NextResponse.json({
        month: new Date().getMonth() + 1,
        year: new Date().getFullYear(),
        followers_extracted: 0,
        extractions_count: 0,
        last_extraction: null,
        last_reset: null
      })
    }

    const usageData = usageSnapshot.data()
    
    return NextResponse.json(usageData)
  } catch (error: any) {
    console.error('Error fetching usage:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch usage',
      details: error.message 
    }, { status: 500 })
  }
}
