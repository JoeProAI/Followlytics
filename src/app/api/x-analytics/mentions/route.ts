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
    
    // Get mentions
    const mentions = await xapi.getUserMentions(user.id, maxResults)
    
    // Calculate mention analytics
    const totalEngagement = mentions.reduce((sum, m) => {
      const metrics = m.public_metrics
      if (!metrics) return sum
      return sum + metrics.like_count + metrics.retweet_count + metrics.reply_count
    }, 0)
    
    return NextResponse.json({
      success: true,
      data: {
        user: {
          username: user.username,
          id: user.id
        },
        mentions: mentions,
        analytics: {
          total_mentions: mentions.length,
          total_engagement: totalEngagement,
          avg_engagement: mentions.length ? Math.round(totalEngagement / mentions.length) : 0
        }
      },
      timestamp: new Date().toISOString()
    })

  } catch (error: any) {
    console.error('Mentions API Error:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch mentions',
      details: error.message 
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json({ 
    message: 'Mention Tracking API',
    usage: 'POST with { username: "elonmusk", maxResults: 100 }',
    note: 'Returns mentions with engagement analytics'
  })
}
