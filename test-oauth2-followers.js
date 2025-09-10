#!/usr/bin/env node

/**
 * Test OAuth 2.0 Client Credentials for Followers API
 * Uses the V-prefixed Client ID and Secret
 */

require('dotenv').config({ path: '.env.local' });

async function testOAuth2ClientCredentials() {
  console.log('🧪 OAUTH 2.0 CLIENT CREDENTIALS TEST');
  console.log('=' .repeat(50));
  
  const clientId = process.env.TWITTER_CLIENT_ID;
  const clientSecret = process.env.TWITTER_CLIENT_SECRET;
  
  console.log(`🔑 Client ID: ${clientId}`);
  console.log(`🔐 Client Secret: ${clientSecret.substring(0, 20)}...`);
  
  // Step 1: Get OAuth 2.0 Bearer Token using Client Credentials
  console.log('\n🔄 Getting OAuth 2.0 Bearer Token...');
  
  try {
    const tokenResponse = await fetch('https://api.twitter.com/oauth2/token', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: 'grant_type=client_credentials'
    });
    
    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.log(`❌ OAuth 2.0 token request failed: ${tokenResponse.status}`);
      console.log(`   Response: ${errorText}`);
      return;
    }
    
    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;
    
    console.log('✅ OAuth 2.0 Bearer Token obtained');
    console.log(`🎫 Token: ${accessToken.substring(0, 50)}...`);
    
    // Step 2: Test user lookup with OAuth 2.0 token
    console.log('\n🔍 Testing user lookup with OAuth 2.0 token...');
    
    const userResponse = await fetch('https://api.twitter.com/2/users/by/username/JoeProAI?user.fields=public_metrics', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (userResponse.ok) {
      const userData = await userResponse.json();
      const metrics = userData.data.public_metrics;
      const userId = userData.data.id;
      
      console.log('✅ OAuth 2.0 user lookup SUCCESS');
      console.log(`   👥 Followers: ${metrics.followers_count.toLocaleString()}`);
      console.log(`   👤 Following: ${metrics.following_count.toLocaleString()}`);
      console.log(`   🆔 User ID: ${userId}`);
      
      // Step 3: Test followers API with OAuth 2.0 token
      console.log('\n🎯 Testing followers API with OAuth 2.0 token...');
      
      const followersResponse = await fetch(`https://api.twitter.com/2/users/${userId}/followers?max_results=100&user.fields=username,name,public_metrics`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (followersResponse.ok) {
        const followersData = await followersResponse.json();
        
        console.log('🎉 OAUTH 2.0 FOLLOWERS API SUCCESS!');
        console.log(`   📊 Retrieved: ${followersData.data?.length || 0} followers`);
        console.log(`   🔑 OAuth 2.0 Client Credentials working!`);
        console.log(`   🚀 Project-based authentication successful!`);
        
        if (followersData.data && followersData.data.length > 0) {
          console.log(`\n👥 Sample followers:`);
          followersData.data.slice(0, 10).forEach((follower, i) => {
            console.log(`   ${i + 1}. @${follower.username} (${follower.name || 'No name'})`);
          });
          
          if (followersData.meta?.next_token) {
            console.log(`\n🔄 Has pagination token: ${followersData.meta.next_token.substring(0, 20)}...`);
            console.log('✅ Can paginate through all followers');
          }
        }
        
        return {
          success: true,
          method: 'oauth2_client_credentials',
          followers: followersData.data,
          access_token: accessToken
        };
        
      } else {
        const errorText = await followersResponse.text();
        console.log(`❌ OAuth 2.0 followers API failed: ${followersResponse.status}`);
        console.log(`   Response: ${errorText}`);
        
        try {
          const errorData = JSON.parse(errorText);
          if (errorData.client_id) {
            console.log(`🆔 Client ID in error: ${errorData.client_id}`);
          }
        } catch (e) {
          // Ignore parse error
        }
        
        return { success: false, error: errorText };
      }
      
    } else {
      const errorText = await userResponse.text();
      console.log(`❌ OAuth 2.0 user lookup failed: ${userResponse.status}`);
      console.log(`   Response: ${errorText}`);
      return { success: false, error: errorText };
    }
    
  } catch (error) {
    console.error(`💥 OAuth 2.0 test failed: ${error.message}`);
    return { success: false, error: error.message };
  }
}

// Main execution
async function runOAuth2Test() {
  try {
    const results = await testOAuth2ClientCredentials();
    
    if (results && results.success) {
      console.log('\n🎯 SUCCESS: OAuth 2.0 Client Credentials provide full API access!');
      console.log('✅ Can extract followers with project-based authentication');
      console.log('🚀 Ready to update production system to use OAuth 2.0');
      process.exit(0);
    } else {
      console.log('\n⚠️ OAuth 2.0 Client Credentials also blocked');
      console.log(`❌ Error: ${results?.error || 'Unknown error'}`);
      process.exit(1);
    }
    
  } catch (error) {
    console.error('💥 FATAL ERROR:', error);
    process.exit(1);
  }
}

// Run the test
if (require.main === module) {
  runOAuth2Test();
}

module.exports = { testOAuth2ClientCredentials };
