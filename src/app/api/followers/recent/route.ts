import { NextRequest, NextResponse } from 'next/server'
import { getMostRecentCompletedScan } from '@/lib/scan-jobs'

export async function GET(request: NextRequest) {
  try {
    // Get the most recent completed scan results from shared storage
    const { followers, total } = getMostRecentCompletedScan()

    return NextResponse.json({
      followers,
      total,
      message: followers.length > 0 
        ? `Found ${total} followers from recent scan`
        : 'No recent followers found. Run a new scan to get follower data.'
    })

  } catch (error) {
    console.error('Recent followers API error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
