import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase-admin'

export async function GET(request: NextRequest) {
  try {
    // Get the authorization header
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'No authorization token provided' }, { status: 401 })
    }

    const token = authHeader.split(' ')[1]
    
    // Verify the Firebase token
    const decodedToken = await adminAuth.verifyIdToken(token)
    const userId = decodedToken.uid

    console.log('🔍 Getting scan progress for user:', userId)

    // Get recent scans for this user (last 5)
    const scansSnapshot = await adminDb.collection('follower_scans')
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .limit(5)
      .get()

    const scans = []
    scansSnapshot.forEach(doc => {
      const data = doc.data()
      scans.push({
        scanId: doc.id,
        status: data.status,
        progress: data.progress || 0,
        message: data.message || 'No message',
        xUsername: data.xUsername,
        followerCount: data.followerCount || 0,
        authenticationMethod: data.authenticationMethod || 'unknown',
        userActionRequired: data.userActionRequired || false,
        sandboxId: data.sandboxId || null,
        createdAt: data.createdAt?.toDate().toISOString(),
        completedAt: data.completedAt?.toDate().toISOString(),
        timeElapsed: data.completedAt && data.createdAt 
          ? Math.round((data.completedAt.toDate() - data.createdAt.toDate()) / 1000) + 's'
          : 'In progress'
      })
    })

    // Analyze the scans
    const analysis = {
      totalScans: scans.length,
      activeScans: scans.filter(s => ['pending', 'creating_sandbox', 'setting_up', 'scanning_followers'].includes(s.status)).length,
      completedScans: scans.filter(s => s.status === 'completed').length,
      failedScans: scans.filter(s => s.status === 'failed').length,
      using7StepMethod: scans.filter(s => s.authenticationMethod === '7-step-oauth-injection').length,
      usingOldMethod: scans.filter(s => s.userActionRequired === true).length,
      successfulExtractions: scans.filter(s => s.status === 'completed' && s.followerCount > 0).length
    }

    // Get current active scan details
    const activeScan = scans.find(s => ['pending', 'creating_sandbox', 'setting_up', 'scanning_followers'].includes(s.status))

    return NextResponse.json({
      userId,
      analysis,
      recentScans: scans,
      activeScan: activeScan || null,
      recommendations: generateRecommendations(analysis, scans),
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Error getting scan progress:', error)
    return NextResponse.json({
      error: 'Failed to get scan progress',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

function generateRecommendations(analysis: any, scans: any[]) {
  const recommendations = []

  if (analysis.usingOldMethod > 0) {
    recommendations.push({
      type: 'warning',
      message: 'Some scans are still using old authentication method',
      action: 'Force cleanup old scans and start fresh'
    })
  }

  if (analysis.using7StepMethod === 0 && analysis.totalScans > 0) {
    recommendations.push({
      type: 'error',
      message: 'No scans using 7-step OAuth method detected',
      action: 'Check if latest code is deployed'
    })
  }

  if (analysis.successfulExtractions === 0 && analysis.completedScans > 0) {
    recommendations.push({
      type: 'warning',
      message: 'Scans completing but extracting 0 followers',
      action: 'Check OAuth token validity and X account status'
    })
  }

  if (analysis.activeScans > 1) {
    recommendations.push({
      type: 'info',
      message: 'Multiple active scans detected',
      action: 'Consider using force cleanup to avoid conflicts'
    })
  }

  const recentFailures = scans.filter(s => s.status === 'failed').slice(0, 3)
  if (recentFailures.length > 0) {
    recommendations.push({
      type: 'error',
      message: `${recentFailures.length} recent scan failures`,
      action: 'Check error logs and sandbox status'
    })
  }

  return recommendations
}
