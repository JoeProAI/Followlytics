import { NextRequest, NextResponse } from 'next/server'
import XAPIService from '@/lib/xapi'
import { withPaymentGate, isPaymentGateError } from '@/lib/paymentGate'
import { adminDb } from '@/lib/firebase-admin'

export async function POST(request: NextRequest) {
  try {
    // Payment gate: all tiers allowed, tracks usage
    const gateResult = await withPaymentGate(request, {
      trackUsage: true,
      endpoint: '/api/x-analytics'
    })

    if (isPaymentGateError(gateResult)) {
      return gateResult
    }

    const { userId } = gateResult
    const { username } = await request.json()
    
    if (!username) {
      return NextResponse.json({ error: 'Username is required' }, { status: 400 })
    }

    // Initialize X API service
    const xapi = new XAPIService()
    
    // Get real analytics data from X API
    const analyticsData = await xapi.getAnalytics(username)
    
    // Save analytics snapshot to Firestore for historical tracking
    try {
      const timestamp = new Date().toISOString()
      const snapshotId = `${userId}_${username}_${Date.now()}`
      
      await adminDb.collection('analytics_snapshots').doc(snapshotId).set({
        userId,
        username,
        timestamp,
        followers: analyticsData.user_metrics?.followers_count || 0,
        following: analyticsData.user_metrics?.following_count || 0,
        engagement_rate: analyticsData.engagement_rate,
        total_engagements: analyticsData.total_engagements,
        total_impressions: analyticsData.total_impressions,
        sentiment: analyticsData.sentiment_analysis,
        top_tweet_score: analyticsData.top_performing_tweet?.ai_analysis?.performance_score || null,
        recent_tweet_score: analyticsData.most_recent_tweet?.ai_analysis?.performance_score || null
      })
      
      // Also update user's latest analytics
      await adminDb.collection('users').doc(userId).set({
        latest_analytics: {
          username,
          timestamp,
          followers: analyticsData.user_metrics?.followers_count || 0,
          engagement_rate: analyticsData.engagement_rate
        }
      }, { merge: true })
      
    } catch (firestoreError) {
      console.error('Failed to save analytics snapshot:', firestoreError)
      // Continue even if Firestore fails - don't block the user
    }
    
    // Return data directly (not wrapped) for component compatibility
    return NextResponse.json({
      ...analyticsData,
      success: true,
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
