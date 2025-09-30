import { NextRequest, NextResponse } from 'next/server'
import XAPIService from '@/lib/xapi'
import { adminAuth as auth } from '@/lib/firebase-admin'

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.split('Bearer ')[1]
    const decodedToken = await auth.verifyIdToken(token)
    
    if (!decodedToken) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const { query = '', minLikes = 10000 } = await request.json()

    // Initialize X API service
    const xapi = new XAPIService()
    
    // Find viral content
    const viralTweets = await xapi.findViralContent(query, minLikes)
    
    return NextResponse.json({
      success: true,
      data: {
        total: viralTweets.length,
        tweets: viralTweets,
        minLikes
      },
      timestamp: new Date().toISOString()
    })

  } catch (error: any) {
    console.error('Viral Content API Error:', error)
    return NextResponse.json({ 
      error: 'Failed to find viral content',
      details: error.message 
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json({ 
    message: 'Viral Content Detection API',
    usage: 'POST with { query: "AI", minLikes: 10000 }',
    note: 'Finds trending/viral tweets based on engagement thresholds'
  })
}
