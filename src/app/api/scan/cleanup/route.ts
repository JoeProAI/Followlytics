import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase-admin'
import { Daytona } from '@daytonaio/sdk'

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

    console.log('🧹 Starting cleanup for stuck scans for user:', userId)

    // Find scans that have been running for more than 1 hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
    
    // Simplified query to avoid complex index requirements
    const stuckScansSnapshot = await adminDb
      .collection('follower_scans')
      .where('userId', '==', userId)
      .where('createdAt', '<=', oneHourAgo)
      .get()

    // Filter for stuck scans (running statuses only)
    const stuckScans = stuckScansSnapshot.docs.filter(doc => {
      const data = doc.data()
      const stuckStatuses = ['pending', 'initializing', 'setting_up', 'scanning']
      return stuckStatuses.includes(data.status)
    })

    if (stuckScans.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No stuck scans found',
        cleanedUp: 0
      })
    }

    const cleanupResults = []
    let cleanedUpCount = 0

    // Initialize Daytona client for sandbox cleanup
    let daytona = null
    try {
      daytona = new Daytona({
        apiKey: process.env.DAYTONA_API_KEY!,
        apiUrl: process.env.DAYTONA_API_URL!
      })
    } catch (error) {
      console.log('⚠️ Could not initialize Daytona client for sandbox cleanup')
    }

    for (const doc of stuckScans) {
      const scanData = doc.data()
      const scanId = doc.id
      
      try {
        console.log(`🧹 Cleaning up stuck scan: ${scanId}`)
        
        // Update scan status to failed
        await adminDb.collection('follower_scans').doc(scanId).update({
          status: 'failed',
          error: 'Scan timed out and was automatically cleaned up',
          completedAt: new Date(),
          cleanedUpAt: new Date()
        })

        // Try to cleanup associated sandbox if we have sandbox info
        if (daytona && scanData.sandboxId) {
          try {
            console.log(`🗑️ Attempting to delete sandbox: ${scanData.sandboxId}`)
            await daytona.delete(scanData.sandboxId)
            console.log(`✅ Sandbox deleted: ${scanData.sandboxId}`)
          } catch (sandboxError) {
            console.log(`⚠️ Could not delete sandbox ${scanData.sandboxId}:`, sandboxError)
          }
        }

        cleanupResults.push({
          scanId,
          username: scanData.xUsername,
          status: 'cleaned_up',
          originalStatus: scanData.status,
          createdAt: scanData.createdAt?.toDate?.()?.toISOString() || scanData.createdAt
        })
        
        cleanedUpCount++
        
      } catch (error) {
        console.error(`❌ Failed to cleanup scan ${scanId}:`, error)
        cleanupResults.push({
          scanId,
          username: scanData.xUsername,
          status: 'cleanup_failed',
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    return NextResponse.json({
      success: true,
      message: `Cleaned up ${cleanedUpCount} stuck scans`,
      cleanedUp: cleanedUpCount,
      results: cleanupResults
    })

  } catch (error) {
    console.error('Cleanup operation failed:', error)
    return NextResponse.json({
      success: false,
      error: 'Cleanup operation failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
