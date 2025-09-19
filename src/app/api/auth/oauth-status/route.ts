import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase-admin'
import { createTwitterApiClient } from '@/lib/twitter-api'

export async function GET(request: NextRequest) {
  try {
    // Verify user authentication
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const idToken = authHeader.split('Bearer ')[1]
    const decodedToken = await adminAuth.verifyIdToken(idToken)
    const userId = decodedToken.uid

    console.log('🔍 Checking OAuth status for user:', userId)

    // Check if user has OAuth tokens
    const tokensDoc = await adminDb.collection('x_tokens').doc(userId).get()
    
    if (!tokensDoc.exists) {
      return NextResponse.json({
        hasOAuthTokens: false,
        message: 'No OAuth tokens found. User needs to authorize Twitter access.',
        needsAuthorization: true
      })
    }

    const tokens = tokensDoc.data()
    const hasValidTokens = !!(tokens?.accessToken && tokens?.accessTokenSecret)

    if (!hasValidTokens) {
      return NextResponse.json({
        hasOAuthTokens: false,
        message: 'Invalid OAuth tokens found. User needs to re-authorize Twitter access.',
        needsAuthorization: true,
        tokenData: {
          hasAccessToken: !!tokens?.accessToken,
          hasAccessTokenSecret: !!tokens?.accessTokenSecret,
          screenName: tokens?.screenName,
          createdAt: tokens?.createdAt?.toDate?.()?.toISOString() || tokens?.createdAt
        }
      })
    }

    // Test the OAuth tokens
    try {
      const twitterClient = await createTwitterApiClient(userId)
      const testResult = await twitterClient.testApiAccess()
      
      if (testResult.success) {
        return NextResponse.json({
          hasOAuthTokens: true,
          apiAccessWorking: true,
          message: 'OAuth tokens are valid and API access is working',
          needsAuthorization: false,
          userInfo: {
            screenName: testResult.userInfo?.screen_name,
            name: testResult.userInfo?.name,
            followersCount: testResult.userInfo?.followers_count,
            friendsCount: testResult.userInfo?.friends_count
          },
          tokenData: {
            screenName: tokens?.screenName,
            createdAt: tokens?.createdAt?.toDate?.()?.toISOString() || tokens?.createdAt
          }
        })
      } else {
        return NextResponse.json({
          hasOAuthTokens: true,
          apiAccessWorking: false,
          message: 'OAuth tokens exist but API access failed',
          needsAuthorization: true,
          error: testResult.error,
          tokenData: {
            screenName: tokens?.screenName,
            createdAt: tokens?.createdAt?.toDate?.()?.toISOString() || tokens?.createdAt
          }
        })
      }
    } catch (error) {
      return NextResponse.json({
        hasOAuthTokens: true,
        apiAccessWorking: false,
        message: 'Error testing OAuth tokens',
        needsAuthorization: true,
        error: error instanceof Error ? error.message : 'Unknown error',
        tokenData: {
          screenName: tokens?.screenName,
          createdAt: tokens?.createdAt?.toDate?.()?.toISOString() || tokens?.createdAt
        }
      })
    }

  } catch (error) {
    console.error('OAuth status check failed:', error)
    return NextResponse.json({
      error: 'Failed to check OAuth status',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
