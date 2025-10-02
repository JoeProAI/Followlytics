import { NextRequest, NextResponse } from 'next/server'
import { adminAuth as auth, adminDb as db } from '@/lib/firebase-admin'

/**
 * Get historical snapshots for a user
 * Shows growth trends, engagement changes over time
 */
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

    const { username, days = 30 } = await request.json()
    
    if (!username) {
      return NextResponse.json({ error: 'Username is required' }, { status: 400 })
    }

    const cleanUsername = username.replace('@', '').trim()
    
    console.log(`[History] Fetching ${days} days of history for @${cleanUsername}`)

    // Calculate date threshold
    const daysAgo = new Date()
    daysAgo.setDate(daysAgo.getDate() - days)

    // Get snapshots from Firestore
    const snapshotsQuery = await db.collection('snapshots')
      .where('userId', '==', decodedToken.uid)
      .where('username', '==', cleanUsername)
      .where('timestamp', '>=', daysAgo.toISOString())
      .orderBy('timestamp', 'desc')
      .get()

    if (snapshotsQuery.empty) {
      return NextResponse.json({
        success: true,
        message: 'No snapshots found. Start tracking to collect data.',
        snapshots: [],
        insights: []
      })
    }

    const snapshots = snapshotsQuery.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }))

    // Calculate growth metrics
    const first = snapshots[snapshots.length - 1]
    const latest = snapshots[0]

    const followerGrowth = latest.followers - first.followers
    const followerGrowthPercent = first.followers ? 
      ((followerGrowth / first.followers) * 100).toFixed(2) : 0

    const engagementChange = latest.avg_engagement - first.avg_engagement
    const engagementChangePercent = first.avg_engagement ?
      ((engagementChange / first.avg_engagement) * 100).toFixed(2) : 0

    // Find trends
    const followerTrend = snapshots.map(s => ({
      date: s.timestamp,
      value: s.followers
    }))

    const engagementTrend = snapshots.map(s => ({
      date: s.timestamp,
      value: s.avg_engagement
    }))

    // Calculate daily averages
    const avgFollowerChange = Math.round(followerGrowth / days)
    const avgEngagementChange = Math.round(engagementChange / days)

    // Generate insights
    const insights = []
    
    if (followerGrowth > 0) {
      insights.push({
        type: 'growth',
        message: `Gained ${followerGrowth.toLocaleString()} followers in ${days} days (+${followerGrowthPercent}%)`,
        trend: 'up',
        metric: followerGrowth
      })
    } else if (followerGrowth < 0) {
      insights.push({
        type: 'warning',
        message: `Lost ${Math.abs(followerGrowth).toLocaleString()} followers in ${days} days (${followerGrowthPercent}%)`,
        trend: 'down',
        metric: followerGrowth
      })
    }

    if (engagementChange > 0) {
      insights.push({
        type: 'engagement',
        message: `Engagement up ${engagementChangePercent}% (${engagementChange} avg per tweet)`,
        trend: 'up',
        metric: engagementChange
      })
    } else if (engagementChange < 0) {
      insights.push({
        type: 'warning',
        message: `Engagement down ${Math.abs(parseFloat(engagementChangePercent))}%`,
        trend: 'down',
        metric: engagementChange
      })
    }

    insights.push({
      type: 'projection',
      message: `At current rate: ${avgFollowerChange > 0 ? '+' : ''}${avgFollowerChange * 30} followers/month`,
      trend: avgFollowerChange > 0 ? 'up' : 'down',
      metric: avgFollowerChange * 30
    })

    // Find best performing day
    const bestDay = snapshots.reduce((best, current) => 
      current.avg_engagement > best.avg_engagement ? current : best
    )

    insights.push({
      type: 'performance',
      message: `Best day: ${new Date(bestDay.timestamp).toLocaleDateString()} (${bestDay.avg_engagement} avg engagement)`,
      trend: 'neutral',
      metric: bestDay.avg_engagement
    })

    console.log(`[History] Retrieved ${snapshots.length} snapshots`)

    return NextResponse.json({
      success: true,
      username: cleanUsername,
      period: {
        days,
        start: first.timestamp,
        end: latest.timestamp,
        snapshots_count: snapshots.length
      },
      current: {
        followers: latest.followers,
        avg_engagement: latest.avg_engagement,
        tweet_count: latest.tweet_count
      },
      growth: {
        followers: followerGrowth,
        followers_percent: parseFloat(followerGrowthPercent),
        avg_per_day: avgFollowerChange,
        engagement_change: engagementChange,
        engagement_percent: parseFloat(engagementChangePercent)
      },
      trends: {
        followers: followerTrend,
        engagement: engagementTrend
      },
      insights,
      snapshots: snapshots.slice(0, 10), // Return last 10 for display
      timestamp: new Date().toISOString()
    })

  } catch (error: any) {
    console.error('[History] Error:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch history',
      details: error.message 
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json({ 
    message: 'Historical Tracking API',
    description: 'View growth trends and engagement changes over time',
    usage: 'POST with { username: "elonmusk", days: 30 }',
    features: [
      'Follower growth tracking',
      'Engagement trend analysis',
      'Daily/weekly/monthly views',
      'Actionable insights',
      'Performance projections'
    ]
  })
}
