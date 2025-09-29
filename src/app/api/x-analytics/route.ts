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

    const { username } = await request.json()
    
    if (!username) {
      return NextResponse.json({ error: 'Username is required' }, { status: 400 })
    }

    // Initialize X API service
    const xapi = new XAPIService()
    
    // Get real analytics data from X API
    const analyticsData = await xapi.getAnalytics(username)
    
    return NextResponse.json({
      success: true,
      data: analyticsData,
      timestamp: new Date().toISOString()
    })

  } catch (error: any) {
    console.error('X Analytics API Error:', error)
    
    if (error.message.includes('User not found')) {
      return NextResponse.json({ 
        error: 'X user not found. Please check the username.' 
      }, { status: 404 })
    }
    
    if (error.message.includes('Rate limit')) {
      return NextResponse.json({ 
        error: 'X API rate limit exceeded. Please try again later.' 
      }, { status: 429 })
    }
    
    return NextResponse.json({ 
      error: 'Failed to fetch X analytics data',
      details: error.message 
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json({ 
    message: 'X Analytics API - Use POST with username',
    endpoints: {
      'POST /api/x-analytics': 'Get user analytics',
      'required_headers': ['Authorization: Bearer <firebase_token>'],
      'required_body': { username: 'string' }
    }
  })
}
