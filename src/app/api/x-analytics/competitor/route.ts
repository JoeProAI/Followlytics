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

    const { usernames } = await request.json()
    
    if (!usernames || !Array.isArray(usernames) || usernames.length === 0) {
      return NextResponse.json({ error: 'Usernames array is required' }, { status: 400 })
    }

    if (usernames.length > 5) {
      return NextResponse.json({ error: 'Maximum 5 competitors allowed' }, { status: 400 })
    }

    // Initialize X API service
    const xapi = new XAPIService()
    
    // Get competitor analysis
    const analysis = await xapi.getCompetitorAnalysis(usernames)
    
    return NextResponse.json({
      success: true,
      data: analysis,
      timestamp: new Date().toISOString()
    })

  } catch (error: any) {
    console.error('Competitor Analysis API Error:', error)
    return NextResponse.json({ 
      error: 'Failed to perform competitor analysis',
      details: error.message 
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json({ 
    message: 'Competitor Analysis API',
    usage: 'POST with { usernames: ["user1", "user2", "user3"] }',
    max_competitors: 5
  })
}
