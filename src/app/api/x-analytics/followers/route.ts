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

    const { username, maxResults = 100 } = await request.json()
    
    if (!username) {
      return NextResponse.json({ error: 'Username is required' }, { status: 400 })
    }

    // Initialize X API service
    const xapi = new XAPIService()
    
    // Get user first
    const user = await xapi.getUserByUsername(username)
    
    // Get followers
    const followers = await xapi.getUserFollowers(user.id, maxResults)
    
    // Calculate follower analytics
    const verifiedCount = followers.filter(f => f.verified).length
    const avgFollowers = followers.reduce((sum, f) => sum + (f.public_metrics?.followers_count || 0), 0) / followers.length
    
    return NextResponse.json({
      success: true,
      data: {
        user: {
          username: user.username,
          total_followers: user.public_metrics.followers_count
        },
        followers: followers,
        analytics: {
          retrieved: followers.length,
          verified_count: verifiedCount,
          verified_percentage: (verifiedCount / followers.length * 100).toFixed(1),
          avg_follower_count: Math.round(avgFollowers)
        }
      },
      timestamp: new Date().toISOString()
    })

  } catch (error: any) {
    console.error('Followers API Error:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch followers',
      details: error.message 
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json({ 
    message: 'Follower Analysis API',
    usage: 'POST with { username: "elonmusk", maxResults: 100 }',
    note: 'Returns follower list with demographics and analytics'
  })
}
