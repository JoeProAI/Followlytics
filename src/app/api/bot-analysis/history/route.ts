// Bot Analysis History - Returns user's recent bot scans
// ONLY returns aggregate analysis, never raw follower data

import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase-admin'

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

    // Get recent scans (limit to 50 most recent)
    const scansSnapshot = await adminDb
      .collection('users')
      .doc(userId)
      .collection('bot_scans')
      .orderBy('createdAt', 'desc')
      .limit(50)
      .get()

    const scans = scansSnapshot.docs.map(doc => {
      const data = doc.data()
      return {
        scanId: data.scanId,
        username: data.username,
        status: data.status,
        createdAt: data.createdAt?.toDate?.().toISOString(),
        completedAt: data.completedAt?.toDate?.().toISOString(),
        
        // ONLY aggregate analysis - NO raw follower data
        analysis: data.analysis || null,
        
        // Gamma URLs if available
        gammaUrl: data.gammaUrl || null,
        gammaPdfUrl: data.gammaPdfUrl || null,
        gammaPptxUrl: data.gammaPptxUrl || null,
        gammaStatus: data.gammaStatus || null,
        
        error: data.error || null
      }
    })

    return NextResponse.json({
      scans,
      total: scans.length
    })

  } catch (error: any) {
    console.error('[Bot Analysis History] Error:', error)
    return NextResponse.json({
      error: 'Failed to fetch analysis history',
      details: error.message
    }, { status: 500 })
  }
}
