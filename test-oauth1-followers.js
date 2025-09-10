#!/usr/bin/env node

/**
 * Test OAuth 1.0a Authentication for Followers API
 * Uses Access Token + Secret instead of Bearer Token
 */

const crypto = require('crypto');
require('dotenv').config({ path: '.env.local' });

class OAuth1FollowersTest {
  constructor() {
    this.apiKey = process.env.TWITTER_API_KEY;
    this.apiSecret = process.env.TWITTER_API_SECRET;
    this.accessToken = process.env.TWITTER_ACCESS_TOKEN;
    this.accessTokenSecret = process.env.TWITTER_ACCESS_TOKEN_SECRET;
  }

  // Generate OAuth 1.0a signature
  generateOAuthSignature(method, url, params) {
    const oauthParams = {
      oauth_consumer_key: this.apiKey,
      oauth_token: this.accessToken,
      oauth_signature_method: 'HMAC-SHA1',
      oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
      oauth_nonce: crypto.randomBytes(16).toString('hex'),
      oauth_version: '1.0'
    };

    // Combine all parameters
    const allParams = { ...params, ...oauthParams };
    
    // Create parameter string
    const paramString = Object.keys(allParams)
      .sort()
      .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(allParams[key])}`)
      .join('&');

    // Create signature base string
    const signatureBaseString = [
      method.toUpperCase(),
      encodeURIComponent(url),
      encodeURIComponent(paramString)
    ].join('&');

    // Create signing key
    const signingKey = [
      encodeURIComponent(this.apiSecret),
      encodeURIComponent(this.accessTokenSecret)
    ].join('&');

    // Generate signature
    const signature = crypto
      .createHmac('sha1', signingKey)
      .update(signatureBaseString)
      .digest('base64');

    oauthParams.oauth_signature = signature;

    return oauthParams;
  }

  // Create OAuth 1.0a Authorization header
  createAuthHeader(method, url, params = {}) {
    const oauthParams = this.generateOAuthSignature(method, url, params);
    
    const authHeader = 'OAuth ' + Object.keys(oauthParams)
      .map(key => `${encodeURIComponent(key)}="${encodeURIComponent(oauthParams[key])}"`)
      .join(', ');

    return authHeader;
  }

  async testUserLookup(username) {
    console.log(`🔍 Testing OAuth 1.0a user lookup for @${username}`);
    
    const url = `https://api.twitter.com/2/users/by/username/${username}`;
    const params = { 'user.fields': 'public_metrics' };
    
    const authHeader = this.createAuthHeader('GET', url, params);
    
    const fullUrl = `${url}?${new URLSearchParams(params).toString()}`;
    
    try {
      const response = await fetch(fullUrl, {
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        const metrics = data.data.public_metrics;
        
        console.log(`✅ OAuth 1.0a USER LOOKUP SUCCESS`);
        console.log(`   👥 Followers: ${metrics.followers_count.toLocaleString()}`);
        console.log(`   👤 Following: ${metrics.following_count.toLocaleString()}`);
        
        return {
          success: true,
          user_id: data.data.id,
          followers_count: metrics.followers_count
        };
      } else {
        const errorData = await response.text();
        console.log(`❌ OAuth 1.0a user lookup failed: ${response.status} - ${errorData}`);
        return { success: false, error: errorData };
      }
    } catch (error) {
      console.error(`💥 OAuth 1.0a user lookup error: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  async testFollowersAPI(userId) {
    console.log(`\n🔍 Testing OAuth 1.0a followers API for user ${userId}`);
    
    const url = `https://api.twitter.com/2/users/${userId}/followers`;
    const params = { 
      'max_results': '100',
      'user.fields': 'username,name,public_metrics'
    };
    
    const authHeader = this.createAuthHeader('GET', url, params);
    
    const fullUrl = `${url}?${new URLSearchParams(params).toString()}`;
    
    try {
      const response = await fetch(fullUrl, {
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        
        if (data.data && data.data.length > 0) {
          console.log(`🎉 OAUTH 1.0A FOLLOWERS API SUCCESS!`);
          console.log(`   📊 Retrieved: ${data.data.length} followers`);
          console.log(`   🔑 OAuth 1.0a authentication working!`);
          
          console.log(`\n👥 Sample followers:`);
          data.data.slice(0, 10).forEach((follower, i) => {
            console.log(`   ${i + 1}. @${follower.username} (${follower.name || 'No name'})`);
          });
          
          return {
            success: true,
            followers: data.data,
            has_next_token: !!data.meta?.next_token
          };
        } else {
          console.log(`⚠️ Followers API returned no data`);
          return { success: false, error: 'No followers data returned' };
        }
      } else {
        const errorData = await response.text();
        console.log(`❌ OAuth 1.0a followers API failed: ${response.status} - ${errorData}`);
        return { success: false, error: errorData };
      }
    } catch (error) {
      console.error(`💥 OAuth 1.0a followers API error: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  async runFullTest(username = 'JoeProAI') {
    console.log('🧪 OAUTH 1.0A FOLLOWERS API TEST');
    console.log('=' .repeat(50));
    console.log('🔑 Using Access Token + Secret authentication');
    
    try {
      // Test 1: User lookup
      const userResult = await this.testUserLookup(username);
      
      if (userResult.success) {
        // Test 2: Followers API
        const followersResult = await this.testFollowersAPI(userResult.user_id);
        
        if (followersResult.success) {
          console.log(`\n🎉 OAUTH 1.0A SUCCESS!`);
          console.log(`✅ Can access followers API with OAuth 1.0a`);
          console.log(`📊 Retrieved ${followersResult.followers.length} followers`);
          console.log(`🔑 This method bypasses Bearer token issues`);
          
          return { success: true, method: 'oauth1', followers: followersResult.followers };
        } else {
          console.log(`\n❌ OAuth 1.0a followers API failed: ${followersResult.error}`);
          return { success: false, error: followersResult.error };
        }
      } else {
        console.log(`\n❌ OAuth 1.0a user lookup failed: ${userResult.error}`);
        return { success: false, error: userResult.error };
      }
      
    } catch (error) {
      console.error('\n💥 OAUTH 1.0A TEST FAILED:', error.message);
      return { success: false, error: error.message };
    }
  }
}

// Main execution
async function runOAuth1Test() {
  const tester = new OAuth1FollowersTest();
  
  try {
    const results = await tester.runFullTest('JoeProAI');
    
    if (results.success) {
      console.log('\n🎯 SUCCESS: OAuth 1.0a provides full API access!');
      console.log('✅ Can extract followers without Bearer token issues');
      console.log('🚀 Ready to update production system to use OAuth 1.0a');
      process.exit(0);
    } else {
      console.log('\n⚠️ OAuth 1.0a also blocked');
      console.log(`❌ Error: ${results.error}`);
      process.exit(1);
    }
    
  } catch (error) {
    console.error('💥 FATAL ERROR:', error);
    process.exit(1);
  }
}

// Run the test
if (require.main === module) {
  runOAuth1Test();
}

module.exports = { OAuth1FollowersTest };
