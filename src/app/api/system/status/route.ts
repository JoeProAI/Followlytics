import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Checking system status...')

    // Check recent scans (last hour) to see system activity
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
    
    const recentScansSnapshot = await adminDb
      .collection('follower_scans')
      .where('createdAt', '>=', oneHourAgo)
      .orderBy('createdAt', 'desc')
      .limit(20)
      .get()

    const recentScans = recentScansSnapshot.docs.map(doc => {
      const data = doc.data()
      return {
        id: doc.id,
        status: data.status,
        xUsername: data.xUsername,
        method: data.method,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
        completedAt: data.completedAt?.toDate?.()?.toISOString() || data.completedAt,
        followerCount: data.followerCount || 0,
        requiresSessionCookies: data.requiresSessionCookies || false,
        authenticationMessage: data.authenticationMessage
      }
    })

    // Categorize scans
    const activeScans = recentScans.filter(scan => 
      !['completed', 'failed', 'authentication_required'].includes(scan.status)
    )
    
    const authRequiredScans = recentScans.filter(scan => 
      scan.status === 'authentication_required'
    )
    
    const completedScans = recentScans.filter(scan => 
      scan.status === 'completed'
    )
    
    const failedScans = recentScans.filter(scan => 
      scan.status === 'failed'
    )

    // Environment status
    const envStatus = {
      DAYTONA_API_KEY: !!process.env.DAYTONA_API_KEY,
      DAYTONA_API_URL: !!process.env.DAYTONA_API_URL,
      FIREBASE_PROJECT_ID: !!process.env.FIREBASE_PROJECT_ID,
      FIREBASE_CLIENT_EMAIL: !!process.env.FIREBASE_CLIENT_EMAIL,
      FIREBASE_PRIVATE_KEY: !!process.env.FIREBASE_PRIVATE_KEY,
      TWITTER_CONSUMER_KEY: !!process.env.TWITTER_CONSUMER_KEY,
      TWITTER_CONSUMER_SECRET: !!process.env.TWITTER_CONSUMER_SECRET
    }

    const systemStatus = {
      timestamp: new Date().toISOString(),
      environment: envStatus,
      scanActivity: {
        totalRecentScans: recentScans.length,
        activeScans: activeScans.length,
        authenticationRequiredScans: authRequiredScans.length,
        completedScans: completedScans.length,
        failedScans: failedScans.length
      },
      recentScans: recentScans.slice(0, 10), // Show last 10 scans
      systemHealth: {
        status: 'operational',
        message: 'All systems operational'
      }
    }

    // Determine overall system health
    if (activeScans.length > 5) {
      systemStatus.systemHealth = {
        status: 'busy',
        message: 'High scan activity detected'
      }
    }

    if (authRequiredScans.length > 0) {
      systemStatus.systemHealth = {
        status: 'attention_required',
        message: `${authRequiredScans.length} scan(s) require session cookies`
      }
    }

    return NextResponse.json(systemStatus)

  } catch (error) {
    console.error('System status check failed:', error)
    return NextResponse.json({
      timestamp: new Date().toISOString(),
      systemHealth: {
        status: 'error',
        message: 'System status check failed'
      },
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
