import { NextRequest, NextResponse } from 'next/server'
import { adminAuth } from '@/lib/firebase-admin'
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

    console.log('🔍 Testing Twitter API access for user:', userId)

    // Create Twitter API client
    const twitterClient = await createTwitterApiClient(userId)
    
    // Test API access
    const testResult = await twitterClient.testApiAccess()
    
    if (testResult.success) {
      console.log('✅ Twitter API access successful')
      return NextResponse.json({
        success: true,
        message: 'Twitter API access is working',
        userInfo: {
          id: testResult.userInfo?.id,
          screen_name: testResult.userInfo?.screen_name,
          name: testResult.userInfo?.name,
          followers_count: testResult.userInfo?.followers_count,
          friends_count: testResult.userInfo?.friends_count
        }
      })
    } else {
      console.log('❌ Twitter API access failed:', testResult.error)
      return NextResponse.json({
        success: false,
        error: testResult.error,
        message: 'Twitter API access failed - may need to re-authorize or check API permissions'
      }, { status: 400 })
    }

  } catch (error) {
    console.error('Twitter API test error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      message: 'Failed to test Twitter API access'
    }, { status: 500 })
  }
}
