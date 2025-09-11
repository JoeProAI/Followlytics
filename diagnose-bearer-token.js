#!/usr/bin/env node

/**
 * Diagnose OAuth 1.0a Authentication Issues
 */

const https = require('https');

async function diagnoseBearerToken() {
  console.log('🔍 BEARER TOKEN DIAGNOSTIC');
  console.log('=' .repeat(50));
  
  const bearerToken = process.env.TWITTER_BEARER_TOKEN;
  const apiKey = process.env.TWITTER_API_KEY;
  
  console.log(`🔑 API Key: ${apiKey}`);
  console.log(`🎫 Bearer Token: ${bearerToken.substring(0, 50)}...`);
  
  // Test 1: Check what client ID the Bearer token reports
  console.log('\n🧪 Testing Bearer token client ID...');
  
  try {
    const response = await fetch('https://api.twitter.com/2/users/by/username/JoeProAI?user.fields=public_metrics', {
      headers: {
        'Authorization': `Bearer ${bearerToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Bearer token works for user lookup');
      console.log(`   Followers: ${data.data.public_metrics.followers_count}`);
    } else {
      const errorText = await response.text();
      console.log(`❌ Bearer token error: ${response.status}`);
      console.log(`   Response: ${errorText}`);
      
      // Extract client ID from error
      try {
        const errorData = JSON.parse(errorText);
        if (errorData.client_id) {
          console.log(`🆔 Bearer token client ID: ${errorData.client_id}`);
        }
      } catch (e) {
        console.log('   Could not parse error response');
      }
    }
  } catch (error) {
    console.error(`💥 Bearer token test failed: ${error.message}`);
  }
  
  // Test 2: Try followers API to see the exact error
  console.log('\n🧪 Testing followers API with Bearer token...');
  
  try {
    const response = await fetch('https://api.twitter.com/2/users/1767231492793434113/followers?max_results=10', {
      headers: {
        'Authorization': `Bearer ${bearerToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.ok) {
      console.log('🎉 FOLLOWERS API WORKS!');
      const data = await response.json();
      console.log(`   Retrieved ${data.data?.length || 0} followers`);
    } else {
      const errorText = await response.text();
      console.log(`❌ Followers API error: ${response.status}`);
      console.log(`   Response: ${errorText}`);
      
      // Extract client ID from error
      try {
        const errorData = JSON.parse(errorText);
        if (errorData.client_id) {
          console.log(`🆔 Followers API client ID: ${errorData.client_id}`);
          
          if (errorData.client_id === '31438855') {
            console.log('⚠️  This is the OLD client ID - keys not from project!');
            console.log('💡 You need to generate NEW keys from within the project');
          } else {
            console.log('✅ This is a different client ID - might be project keys');
          }
        }
        
        if (errorData.detail && errorData.detail.includes('attached to a Project')) {
          console.log('🔧 SOLUTION: Generate new API keys from within your Twitter Project');
          console.log('   1. Go to Twitter Developer Portal');
          console.log('   2. Navigate to Projects → [Your Project]');
          console.log('   3. Generate new API keys from the PROJECT (not the app)');
          console.log('   4. The new keys will have a different client ID');
        }
      } catch (e) {
        console.log('   Could not parse followers API error response');
      }
    }
  } catch (error) {
    console.error(`💥 Followers API test failed: ${error.message}`);
  }
  
  // Test 3: Check OAuth 2.0 Client ID
  console.log('\n🧪 Checking OAuth 2.0 Client ID...');
  const clientId = process.env.TWITTER_CLIENT_ID;
  
  if (clientId) {
    // Decode base64 client ID to see the actual ID
    try {
      const decoded = Buffer.from(clientId, 'base64').toString('utf-8');
      console.log(`🔓 Decoded Client ID: ${decoded}`);
      
      // Extract numeric ID if present
      const numericMatch = decoded.match(/(\d+)/);
      if (numericMatch) {
        const numericId = numericMatch[1];
        console.log(`🔢 Numeric Client ID: ${numericId}`);
        
        if (numericId === '31438855') {
          console.log('⚠️  OAuth Client ID also matches old app!');
        } else {
          console.log('✅ OAuth Client ID is different - might be project-based');
        }
      }
    } catch (e) {
      console.log('❌ Could not decode OAuth Client ID');
    }
  }
  
  console.log('\n📋 SUMMARY:');
  console.log('If all client IDs show 31438855, your keys are still from the old standalone app.');
  console.log('You need to generate completely new keys from within the Twitter Project interface.');
}

// Run diagnostic
if (require.main === module) {
  diagnoseBearerToken().catch(console.error);
}
