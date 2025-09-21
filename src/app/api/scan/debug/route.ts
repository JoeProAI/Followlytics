import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase-admin'
import { DaytonaSandboxManager } from '@/lib/daytona-client'

export const maxDuration = 300 // 5 minutes

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

    // Get scan ID from query params
    const { searchParams } = new URL(request.url)
    const scanId = searchParams.get('scanId')

    if (!scanId) {
      return NextResponse.json({ error: 'Scan ID is required' }, { status: 400 })
    }

    // Get scan document to find sandbox ID
    const scanDoc = await adminDb.collection('follower_scans').doc(scanId).get()
    if (!scanDoc.exists) {
      return NextResponse.json({ error: 'Scan not found' }, { status: 404 })
    }

    const scanData = scanDoc.data()
    if (scanData?.userId !== userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const sandboxId = scanData?.sandboxId
    if (!sandboxId) {
      return NextResponse.json({ error: 'No sandbox found for this scan' }, { status: 404 })
    }

    // Get debug data from sandbox
    console.log(`🔍 Retrieving debug data from sandbox: ${sandboxId}`)
    
    try {
      const debugData = await DaytonaSandboxManager.getDebugData(sandboxId)
      
      return NextResponse.json({
        scanId,
        sandboxId,
        debugData,
        timestamp: new Date().toISOString()
      })
    } catch (sandboxError: any) {
      console.error('Failed to get debug data from sandbox:', sandboxError)
      return NextResponse.json({
        scanId,
        sandboxId,
        error: 'Failed to retrieve debug data from sandbox',
        details: sandboxError.message,
        timestamp: new Date().toISOString()
      })
    }

  } catch (error: any) {
    console.error('Debug endpoint error:', error)
    return NextResponse.json(
      { error: 'Failed to get debug information', details: error.message },
      { status: 500 }
    )
  }
}
