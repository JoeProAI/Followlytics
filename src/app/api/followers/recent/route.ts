import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function GET(request: NextRequest) {
  try {
    // Get user session from cookies
    const cookieStore = cookies()
    const sessionCookie = cookieStore.get('session')
    
    if (!sessionCookie) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // For now, return empty array since we don't have persistent storage
    // In the future, this would fetch from a database
    return NextResponse.json({
      followers: [],
      total: 0,
      message: 'No recent followers found. Run a new scan to get follower data.'
    })

  } catch (error) {
    console.error('Recent followers API error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
