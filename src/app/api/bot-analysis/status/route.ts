// Bot Analysis Status Check
// Returns ONLY analysis results - no raw follower data

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

    // Get scan ID from query params
    const { searchParams } = new URL(request.url)
    const scanId = searchParams.get('scanId')

    if (!scanId) {
      return NextResponse.json({ error: 'Scan ID is required' }, { status: 400 })
    }

    // Get scan record
    const scanDoc = await adminDb
      .collection('users')
      .doc(userId)
      .collection('bot_scans')
      .doc(scanId)
      .get()

    if (!scanDoc.exists) {
      return NextResponse.json({ error: 'Scan not found' }, { status: 404 })
    }

    const scanData = scanDoc.data()

    // Return status and analysis (if completed)
    // CRITICAL: Never return raw follower data
    return NextResponse.json({
      scanId,
      status: scanData?.status,
      progress: scanData?.progress,
      analysis: scanData?.analysis || null, // ONLY aggregate statistics
      gammaUrl: scanData?.gammaUrl || null,
      gammaPdfUrl: scanData?.gammaPdfUrl || null,
      gammaPptxUrl: scanData?.gammaPptxUrl || null,
      gammaStatus: scanData?.gammaStatus || null,
      createdAt: scanData?.createdAt?.toDate?.().toISOString(),
      completedAt: scanData?.completedAt?.toDate?.().toISOString(),
      error: scanData?.error
    })

  } catch (error: any) {
    console.error('[Bot Analysis Status] Error:', error)
    return NextResponse.json({
      error: 'Failed to get scan status',
      details: error.message
    }, { status: 500 })
  }
}
