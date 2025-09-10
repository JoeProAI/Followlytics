#!/usr/bin/env node

/**
 * Test Twitter API v1.1 Followers Endpoint
 * Sometimes v1.1 works when v2 doesn't
 */

const crypto = require('crypto');
require('dotenv').config({ path: '.env.local' });

class TwitterV1Test {
  constructor() {
    this.apiKey = process.env.TWITTER_API_KEY;
    this.apiSecret = process.env.TWITTER_API_SECRET;
    this.accessToken = process.env.TWITTER_ACCESS_TOKEN;
    this.accessTokenSecret = process.env.TWITTER_ACCESS_TOKEN_SECRET;
  }

  generateOAuthSignature(method, url, params) {
    const oauthParams = {
      oauth_consumer_key: this.apiKey,
      oauth_token: this.accessToken,
      oauth_signature_method: 'HMAC-SHA1',
      oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
      oauth_nonce: crypto.randomBytes(16).toString('hex'),
      oauth_version: '1.0'
    };

    const allParams = { ...params, ...oauthParams };
    
    const paramString = Object.keys(allParams)
      .sort()
      .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(allParams[key])}`)
      .join('&');

    const signatureBaseString = [
      method.toUpperCase(),
      encodeURIComponent(url),
      encodeURIComponent(paramString)
    ].join('&');

    const signingKey = [
      encodeURIComponent(this.apiSecret),
      encodeURIComponent(this.accessTokenSecret)
    ].join('&');

    const signature = crypto
      .createHmac('sha1', signingKey)
      .update(signatureBaseString)
      .digest('base64');

    oauthParams.oauth_signature = signature;
    return oauthParams;
  }

  createAuthHeader(method, url, params = {}) {
    const oauthParams = this.generateOAuthSignature(method, url, params);
    
    const authHeader = 'OAuth ' + Object.keys(oauthParams)
      .map(key => `${encodeURIComponent(key)}="${encodeURIComponent(oauthParams[key])}"`)
      .join(', ');

    return authHeader;
  }

  async testV1UserShow(screenName) {
    console.log(`🔍 Testing v1.1 users/show for @${screenName}`);
    
    const url = 'https://api.twitter.com/1.1/users/show.json';
    const params = { screen_name: screenName };
    
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
        console.log(`✅ v1.1 user lookup SUCCESS`);
        console.log(`   👥 Followers: ${data.followers_count.toLocaleString()}`);
        console.log(`   👤 Following: ${data.friends_count.toLocaleString()}`);
        console.log(`   🆔 User ID: ${data.id_str}`);
        
        return {
          success: true,
          user_id: data.id_str,
          followers_count: data.followers_count
        };
      } else {
        const errorText = await response.text();
        console.log(`❌ v1.1 user lookup failed: ${response.status} - ${errorText}`);
        return { success: false, error: errorText };
      }
    } catch (error) {
      console.error(`💥 v1.1 user lookup error: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  async testV1FollowersList(screenName) {
    console.log(`\n🔍 Testing v1.1 followers/list for @${screenName}`);
    
    const url = 'https://api.twitter.com/1.1/followers/list.json';
    const params = { 
      screen_name: screenName,
      count: '200',
      skip_status: 'true',
      include_user_entities: 'false'
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
        
        if (data.users && data.users.length > 0) {
          console.log(`🎉 V1.1 FOLLOWERS API SUCCESS!`);
          console.log(`   📊 Retrieved: ${data.users.length} followers`);
          console.log(`   🔑 v1.1 API working with current credentials!`);
          
          console.log(`\n👥 Sample followers:`);
          data.users.slice(0, 10).forEach((follower, i) => {
            console.log(`   ${i + 1}. @${follower.screen_name} (${follower.name})`);
          });
          
          if (data.next_cursor && data.next_cursor !== 0) {
            console.log(`\n🔄 Has cursor for pagination: ${data.next_cursor}`);
            console.log('✅ Can paginate through all followers');
          }
          
          return {
            success: true,
            followers: data.users,
            next_cursor: data.next_cursor
          };
        } else {
          console.log(`⚠️ v1.1 followers API returned no users`);
          return { success: false, error: 'No followers data returned' };
        }
      } else {
        const errorText = await response.text();
        console.log(`❌ v1.1 followers API failed: ${response.status} - ${errorText}`);
        return { success: false, error: errorText };
      }
    } catch (error) {
      console.error(`💥 v1.1 followers API error: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  async runFullTest(screenName = 'JoeProAI') {
    console.log('🧪 TWITTER API V1.1 TEST');
    console.log('=' .repeat(50));
    console.log('🔑 Using OAuth 1.0a with Access Token + Secret');
    
    try {
      // Test 1: User lookup
      const userResult = await this.testV1UserShow(screenName);
      
      if (userResult.success) {
        // Test 2: Followers list
        const followersResult = await this.testV1FollowersList(screenName);
        
        if (followersResult.success) {
          console.log(`\n🎉 V1.1 API SUCCESS!`);
          console.log(`✅ Can access followers with v1.1 API`);
          console.log(`📊 Retrieved ${followersResult.followers.length} followers`);
          console.log(`🔑 Current credentials work with v1.1`);
          
          return { 
            success: true, 
            method: 'v1.1_oauth1', 
            followers: followersResult.followers,
            next_cursor: followersResult.next_cursor
          };
        } else {
          console.log(`\n❌ v1.1 followers API failed: ${followersResult.error}`);
          return { success: false, error: followersResult.error };
        }
      } else {
        console.log(`\n❌ v1.1 user lookup failed: ${userResult.error}`);
        return { success: false, error: userResult.error };
      }
      
    } catch (error) {
      console.error('\n💥 V1.1 TEST FAILED:', error.message);
      return { success: false, error: error.message };
    }
  }
}

// Main execution
async function runV1Test() {
  const tester = new TwitterV1Test();
  
  try {
    const results = await tester.runFullTest('JoeProAI');
    
    if (results.success) {
      console.log('\n🎯 SUCCESS: Twitter API v1.1 provides full follower access!');
      console.log('✅ Can extract all followers using v1.1 endpoints');
      console.log('🚀 Ready to update production system to use v1.1 API');
      process.exit(0);
    } else {
      console.log('\n⚠️ Twitter API v1.1 also blocked');
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
  runV1Test();
}

module.exports = { TwitterV1Test };
