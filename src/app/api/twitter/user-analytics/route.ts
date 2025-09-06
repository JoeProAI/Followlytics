import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('authToken')?.value
    if (!token) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // Decode Firebase custom token to get user ID
    let userId: string
    try {
      const tokenParts = token.split('.')
      if (tokenParts.length !== 3) throw new Error('Invalid token format')
      const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString())
      userId = payload.uid
      if (!userId) throw new Error('No user ID in token')
    } catch (error) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    // Get user data from Firestore
    const admin = require('firebase-admin')
    const userDoc = await admin.firestore().collection('users').doc(userId).get()
    if (!userDoc.exists) {
      return NextResponse.json({ error: 'User not found in database. Please log in again.' }, { status: 404 })
    }

    const userData = userDoc.data()
    if (!userData || !userData.twitter_id) {
      return NextResponse.json({ error: 'Twitter ID not found. Please log in again.' }, { status: 401 })
    }

    const bearerToken = process.env.TWITTER_BEARER_TOKEN
    if (!bearerToken) {
      return NextResponse.json({ error: 'Twitter Bearer token not configured' }, { status: 500 })
    }

    // Use Twitter API v2 for user analytics (available with Pro access)
    const analyticsData = {
      user_profile: null,
      recent_tweets: null,
      user_metrics: null
    }

    // 1. Get user profile data
    try {
      const profileResponse = await fetch(`https://api.twitter.com/2/users/${userData.twitter_id}?user.fields=id,name,username,description,public_metrics,verified,profile_image_url,created_at`, {
        headers: {
          'Authorization': `Bearer ${bearerToken}`,
          'Content-Type': 'application/json'
        }
      })

      if (profileResponse.ok) {
        const profileData = await profileResponse.json()
        analyticsData.user_profile = profileData.data
      }
    } catch (error) {
      console.error('Error fetching user profile:', error)
    }

    // 2. Get recent tweets (available with Pro access)
    try {
      const tweetsResponse = await fetch(`https://api.twitter.com/2/users/${userData.twitter_id}/tweets?max_results=10&tweet.fields=id,text,created_at,public_metrics,author_id`, {
        headers: {
          'Authorization': `Bearer ${bearerToken}`,
          'Content-Type': 'application/json'
        }
      })

      if (tweetsResponse.ok) {
        const tweetsData = await tweetsResponse.json()
        analyticsData.recent_tweets = tweetsData.data || []
      }
    } catch (error) {
      console.error('Error fetching recent tweets:', error)
    }

    // 3. Calculate engagement metrics from available data
    if (analyticsData.recent_tweets && analyticsData.recent_tweets.length > 0) {
      const totalLikes = analyticsData.recent_tweets.reduce((sum: number, tweet: any) => sum + (tweet.public_metrics?.like_count || 0), 0)
      const totalRetweets = analyticsData.recent_tweets.reduce((sum: number, tweet: any) => sum + (tweet.public_metrics?.retweet_count || 0), 0)
      const totalReplies = analyticsData.recent_tweets.reduce((sum: number, tweet: any) => sum + (tweet.public_metrics?.reply_count || 0), 0)
      
      analyticsData.user_metrics = {
        avg_likes_per_tweet: Math.round(totalLikes / analyticsData.recent_tweets.length),
        avg_retweets_per_tweet: Math.round(totalRetweets / analyticsData.recent_tweets.length),
        avg_replies_per_tweet: Math.round(totalReplies / analyticsData.recent_tweets.length),
        total_engagement: totalLikes + totalRetweets + totalReplies,
        tweet_count: analyticsData.recent_tweets.length
      }
    }

    return NextResponse.json({
      success: true,
      analytics: analyticsData,
      message: 'User analytics retrieved successfully using Twitter API Pro access'
    })

  } catch (error) {
    console.error('Twitter analytics error:', error)
    return NextResponse.json({
      error: 'Internal server error during analytics fetch',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
