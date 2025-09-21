import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase-admin'

export const maxDuration = 60 // 1 minute

export async function GET(
  request: NextRequest,
  { params }: { params: { scanId: string } }
) {
  try {
    const { scanId } = params

    if (!scanId) {
      return NextResponse.json({ error: 'Scan ID is required' }, { status: 400 })
    }

    console.log(`🔍 Checking status for scan: ${scanId}`)

    // Get scan document from Firestore
    const scanDoc = await adminDb.collection('follower_scans').doc(scanId).get()
    
    if (!scanDoc.exists) {
      return NextResponse.json({ error: 'Scan not found' }, { status: 404 })
    }

    const scanData = scanDoc.data()
    
    // Return current status
    return NextResponse.json({
      scanId,
      status: scanData?.status || 'unknown',
      progress: scanData?.progress || 0,
      followerCount: scanData?.followerCount || 0,
      error: scanData?.error || null,
      createdAt: scanData?.createdAt?.toDate?.()?.toISOString() || null,
      completedAt: scanData?.completedAt?.toDate?.()?.toISOString() || null,
      updatedAt: scanData?.updatedAt?.toDate?.()?.toISOString() || null,
      sandboxId: scanData?.sandboxId || null,
      authStatus: scanData?.authStatus || null,
      message: scanData?.message || null
    })

  } catch (error: any) {
    console.error('Status check error:', error)
    return NextResponse.json(
      { error: 'Failed to check scan status', details: error.message },
      { status: 500 }
    )
  }
}
