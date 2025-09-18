// Simple test script to verify Twitter API integration
const { TwitterApiClient } = require('./src/lib/twitter-api.ts')

async function testTwitterAPI() {
  console.log('🔍 Testing Twitter API integration...')
  
  // Test with environment variables
  const client = new TwitterApiClient({
    accessToken: process.env.TWITTER_ACCESS_TOKEN || 'test-token',
    accessTokenSecret: process.env.TWITTER_ACCESS_TOKEN_SECRET || 'test-secret'
  })
  
  try {
    console.log('📊 Testing API access...')
    const result = await client.testApiAccess()
    
    if (result.success) {
      console.log('✅ Twitter API is working!')
      console.log('👤 User info:', {
        screen_name: result.userInfo?.screen_name,
        followers_count: result.userInfo?.followers_count,
        friends_count: result.userInfo?.friends_count
      })
    } else {
      console.log('❌ Twitter API test failed:', result.error)
    }
  } catch (error) {
    console.error('💥 Error testing Twitter API:', error.message)
  }
}

// Run the test
testTwitterAPI()
