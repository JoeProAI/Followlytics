import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase-admin'

export const dynamic = 'force-dynamic'

/**
 * Diagnostic endpoint to help identify missing followers
 * Compares extracted count vs reported X count
 */
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const idToken = authHeader.split('Bearer ')[1]
    const decodedToken = await adminAuth.verifyIdToken(idToken)
    const userId = decodedToken.uid

    const body = await request.json()
    const { reportedCount, targetUsername } = body // Count shown on X profile

    // Get extracted followers
    const followersSnapshot = await adminDb
      .collection('users')
      .doc(userId)
      .collection('followers')
      .where('target_username', '==', targetUsername.toLowerCase())
      .where('status', '==', 'active')
      .get()

    const extractedCount = followersSnapshot.size
    const missingCount = reportedCount - extractedCount

    // Analyze the extracted followers for patterns
    const followers = followersSnapshot.docs.map(doc => doc.data())
    
    // Check for recently followed (might be in X's count but not extracted yet)
    const now = new Date()
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000)
    const veryRecentFollows = followers.filter((f: any) => {
      const firstSeen = new Date(f.first_seen)
      return firstSeen > oneHourAgo
    }).length

    // Check extraction metadata
    const userDoc = await adminDb.collection('users').doc(userId).get()
    const userData = userDoc.data()
    const lastExtraction = userData?.last_follower_extraction
    
    // Possible reasons for discrepancy
    const reasons = []
    
    if (missingCount > 0 && missingCount <= 5) {
      reasons.push({
        reason: 'Private/Protected Accounts',
        likelihood: 'High',
        description: `${Math.min(missingCount, 3)} of the missing followers are likely private accounts that can't be accessed without authentication.`,
        icon: '🔒'
      })
    }
    
    if (missingCount > 0) {
      reasons.push({
        reason: 'Suspended/Deleted Accounts',
        likelihood: 'Medium',
        description: `1-2 accounts may be suspended or deleted. X still counts them, but they can't be extracted.`,
        icon: '⛔'
      })
    }

    if (lastExtraction) {
      const timeSinceExtraction = now.getTime() - new Date(lastExtraction).getTime()
      const minutesSince = Math.floor(timeSinceExtraction / (1000 * 60))
      
      if (minutesSince < 60) {
        reasons.push({
          reason: 'Very Recent Follows',
          likelihood: 'Medium',
          description: `Accounts that followed in the last ${minutesSince} minutes may not have been captured yet.`,
          icon: '⏱️'
        })
      }
    }

    reasons.push({
      reason: 'X Count Caching',
      likelihood: 'Low',
      description: 'X sometimes caches follower counts. The real count might be different from what is displayed.',
      icon: '🔄'
    })

    // Recommendations
    const recommendations = []
    
    if (missingCount > 0 && missingCount <= 10) {
      recommendations.push({
        action: 'Re-extract in 5 minutes',
        description: 'Wait a few minutes and extract again. Recent follows and cache updates will be captured.',
        priority: 'High'
      })
    }

    if (missingCount > 0) {
      recommendations.push({
        action: 'Check X directly',
        description: 'Visit your X followers page and check the most recent 10 followers. Look for private accounts or suspended accounts.',
        priority: 'Medium'
      })
    }

    recommendations.push({
      action: 'Extract with higher limit',
      description: `Try extracting ${reportedCount + 50} followers (slightly over your X count) to ensure full coverage.`,
      priority: 'Low'
    })

    return NextResponse.json({
      summary: {
        reportedCount,
        extractedCount,
        missingCount,
        percentageCaptured: ((extractedCount / reportedCount) * 100).toFixed(1),
        lastExtraction
      },
      possibleReasons: reasons,
      recommendations,
      diagnostic: {
        veryRecentFollows,
        extractionAge: lastExtraction 
          ? `${Math.floor((now.getTime() - new Date(lastExtraction).getTime()) / (1000 * 60))} minutes ago`
          : 'No previous extraction',
        totalActiveFollowers: extractedCount,
        unfollowedCount: followers.filter((f: any) => f.status === 'unfollowed').length
      }
    })

  } catch (error: any) {
    console.error('[Diagnostics] Error:', error)
    return NextResponse.json({ 
      error: 'Failed to run diagnostics',
      details: error.message 
    }, { status: 500 })
  }
}
