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

    const { tweetId } = await request.json()
    
    if (!tweetId) {
      return NextResponse.json({ error: 'Tweet ID is required' }, { status: 400 })
    }

    // Initialize X API service
    const xapi = new XAPIService()
    
    // Get tweet details, likes, retweets, and quotes in parallel
    const [likes, retweets, quotes] = await Promise.all([
      xapi.getTweetLikes(tweetId, 100),
      xapi.getTweetRetweets(tweetId, 100),
      xapi.getTweetQuotes(tweetId, 100)
    ])
    
    // Calculate engagement demographics
    const likeVerifiedCount = likes.filter(u => u.verified).length
    const retweetVerifiedCount = retweets.filter(u => u.verified).length
    
    const avgLikerFollowers = likes.length ? 
      Math.round(likes.reduce((sum, u) => sum + (u.public_metrics?.followers_count || 0), 0) / likes.length) : 0
    
    return NextResponse.json({
      success: true,
      data: {
        tweetId,
        engagement: {
          likes: {
            total: likes.length,
            verified: likeVerifiedCount,
            verified_percentage: likes.length ? (likeVerifiedCount / likes.length * 100).toFixed(1) : 0,
            avg_follower_count: avgLikerFollowers
          },
          retweets: {
            total: retweets.length,
            verified: retweetVerifiedCount,
            verified_percentage: retweets.length ? (retweetVerifiedCount / retweets.length * 100).toFixed(1) : 0
          },
          quotes: {
            total: quotes.length,
            top_quotes: quotes.slice(0, 5)
          }
        },
        top_engagers: {
          likers: likes.slice(0, 10),
          retweeters: retweets.slice(0, 10)
        }
      },
      timestamp: new Date().toISOString()
    })

  } catch (error: any) {
    console.error('Tweet Analysis API Error:', error)
    return NextResponse.json({ 
      error: 'Failed to analyze tweet',
      details: error.message 
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json({ 
    message: 'Deep Tweet Analysis API',
    usage: 'POST with { tweetId: "1234567890" }',
    note: 'Returns comprehensive engagement analysis including likes, retweets, quotes, and demographics'
  })
}
