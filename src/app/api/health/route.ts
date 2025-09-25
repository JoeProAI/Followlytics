import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    // Simple health check that doesn't require authentication
    const healthStatus = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      deploymentForced: '2025-09-25T13:12:51',
      services: {
        api: 'operational',
        database: 'operational',
        authentication: 'operational'
      },
      environment: {
        nodeEnv: process.env.NODE_ENV || 'unknown',
        hasFirebaseConfig: !!(process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL),
        hasDaytonaConfig: !!(process.env.DAYTONA_API_KEY && process.env.DAYTONA_API_URL),
        hasTwitterConfig: !!(process.env.TWITTER_CONSUMER_KEY && process.env.TWITTER_CONSUMER_SECRET)
      },
      uptime: process.uptime ? Math.floor(process.uptime()) : 0
    }

    return NextResponse.json(healthStatus)
  } catch (error) {
    return NextResponse.json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
