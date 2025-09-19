import { NextRequest, NextResponse } from 'next/server'
import { TwitterApiClient } from '@/lib/twitter-api'

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Verifying Twitter API configuration...')

    // Check if we have the required environment variables
    const requiredEnvVars = ['TWITTER_CONSUMER_KEY', 'TWITTER_CONSUMER_SECRET']
    const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar])
    
    if (missingEnvVars.length > 0) {
      return NextResponse.json({
        success: false,
        error: 'Missing Twitter API credentials',
        missingEnvVars,
        message: 'Twitter Consumer Key and Secret are required for API access'
      }, { status: 400 })
    }

    // Test with dummy tokens (this will fail but shows if the API client is working)
    const testClient = new TwitterApiClient({
      accessToken: 'test-token',
      accessTokenSecret: 'test-secret'
    })

    try {
      // This will fail with authentication error, but that's expected
      await testClient.testApiAccess()
    } catch (error) {
      // Expected to fail with auth error
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      
      if (errorMessage.includes('401') || errorMessage.includes('Unauthorized')) {
        return NextResponse.json({
          success: true,
          message: 'Twitter API client is configured correctly',
          note: 'Authentication failed as expected with test tokens',
          apiClientWorking: true,
          environmentVariables: {
            TWITTER_CONSUMER_KEY: !!process.env.TWITTER_CONSUMER_KEY,
            TWITTER_CONSUMER_SECRET: !!process.env.TWITTER_CONSUMER_SECRET
          }
        })
      } else {
        return NextResponse.json({
          success: false,
          error: 'Twitter API client configuration issue',
          details: errorMessage,
          environmentVariables: {
            TWITTER_CONSUMER_KEY: !!process.env.TWITTER_CONSUMER_KEY,
            TWITTER_CONSUMER_SECRET: !!process.env.TWITTER_CONSUMER_SECRET
          }
        }, { status: 500 })
      }
    }

    // If we get here, something unexpected happened
    return NextResponse.json({
      success: true,
      message: 'Twitter API verification completed',
      note: 'Unexpected success with test tokens'
    })

  } catch (error) {
    console.error('Twitter API verification failed:', error)
    return NextResponse.json({
      success: false,
      error: 'Twitter API verification failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
