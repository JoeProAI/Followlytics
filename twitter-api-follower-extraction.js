#!/usr/bin/env node

/**
 * Twitter API Follower Extraction using App Credentials
 * Uses the app's own Twitter API credentials to extract follower data
 */

const https = require('https');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

class TwitterAPIFollowerExtractor {
  constructor() {
    this.bearerToken = process.env.TWITTER_BEARER_TOKEN;
    this.apiKey = process.env.TWITTER_API_KEY;
    this.apiSecret = process.env.TWITTER_API_SECRET;
    this.accessToken = process.env.TWITTER_ACCESS_TOKEN;
    this.accessTokenSecret = process.env.TWITTER_ACCESS_TOKEN_SECRET;
    this.clientId = process.env.TWITTER_CLIENT_ID;
    this.clientSecret = process.env.TWITTER_CLIENT_SECRET;
    
    this.baseUrl = 'https://api.twitter.com/2';
    this.outputDir = './extraction_results';
    
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }
  }

  async makeAPIRequest(endpoint, params = {}) {
    return new Promise((resolve, reject) => {
      const queryString = new URLSearchParams(params).toString();
      const url = `${this.baseUrl}${endpoint}${queryString ? '?' + queryString : ''}`;
      
      const options = {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.bearerToken}`,
          'Content-Type': 'application/json',
          'User-Agent': 'Followlytics/1.0'
        }
      };

      console.log(`🌐 API Request: ${url}`);
      
      const req = https.request(url, options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const jsonData = JSON.parse(data);
            if (res.statusCode === 200) {
              resolve(jsonData);
            } else {
              console.error(`❌ API Error ${res.statusCode}:`, jsonData);
              reject(new Error(`API Error ${res.statusCode}: ${JSON.stringify(jsonData)}`));
            }
          } catch (e) {
            reject(new Error(`JSON Parse Error: ${e.message}`));
          }
        });
      });

      req.on('error', reject);
      req.setTimeout(30000, () => reject(new Error('Request timeout')));
      req.end();
    });
  }

  async getUserByUsername(username) {
    console.log(`👤 Looking up user: @${username}`);
    
    try {
      const response = await this.makeAPIRequest('/users/by/username/' + username, {
        'user.fields': 'id,name,username,public_metrics,verified,description,created_at'
      });
      
      if (response.data) {
        console.log(`✅ Found user: @${response.data.username} (ID: ${response.data.id})`);
        console.log(`📊 Followers: ${response.data.public_metrics?.followers_count?.toLocaleString() || 'N/A'}`);
        console.log(`📊 Following: ${response.data.public_metrics?.following_count?.toLocaleString() || 'N/A'}`);
        return response.data;
      } else {
        throw new Error('User not found');
      }
    } catch (error) {
      console.error(`❌ Failed to lookup user @${username}:`, error.message);
      throw error;
    }
  }

  async getFollowers(userId, maxResults = 1000) {
    console.log(`\n👥 EXTRACTING FOLLOWERS for user ID: ${userId}`);
    console.log(`📊 Target: ${maxResults.toLocaleString()} followers`);
    
    const followers = [];
    let nextToken = null;
    let requestCount = 0;
    const maxRequestsPerWindow = 75; // API rate limit
    
    do {
      try {
        requestCount++;
        console.log(`📡 API Request ${requestCount}/${maxRequestsPerWindow}`);
        
        const params = {
          'max_results': Math.min(1000, maxResults - followers.length), // Max 1000 per request
          'user.fields': 'id,name,username,public_metrics,verified,description'
        };
        
        if (nextToken) {
          params.pagination_token = nextToken;
        }
        
        const response = await this.makeAPIRequest(`/users/${userId}/followers`, params);
        
        if (response.data && response.data.length > 0) {
          followers.push(...response.data);
          console.log(`📊 Batch: +${response.data.length} followers, Total: ${followers.length.toLocaleString()}`);
          
          // Save progress every 10 requests
          if (requestCount % 10 === 0) {
            await this.saveProgress('followers', followers, userId);
          }
        }
        
        nextToken = response.meta?.next_token;
        
        // Check if we've reached our target or API limits
        if (followers.length >= maxResults) {
          console.log(`✅ Reached target of ${maxResults.toLocaleString()} followers`);
          break;
        }
        
        if (requestCount >= maxRequestsPerWindow) {
          console.log(`⚠️ Reached API rate limit (${maxRequestsPerWindow} requests)`);
          console.log(`💡 Wait 15 minutes for rate limit reset to continue`);
          break;
        }
        
        // Rate limiting - wait between requests
        if (nextToken) {
          await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay
        }
        
      } catch (error) {
        console.error(`❌ Error in followers request ${requestCount}:`, error.message);
        
        if (error.message.includes('429')) {
          console.log(`⚠️ Rate limited. Wait 15 minutes before continuing.`);
          break;
        }
        
        // Continue with other errors after a delay
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    } while (nextToken && followers.length < maxResults);
    
    console.log(`\n✅ FOLLOWERS EXTRACTION COMPLETE`);
    console.log(`📊 Total followers extracted: ${followers.length.toLocaleString()}`);
    
    return followers;
  }

  async getFollowing(userId, maxResults = 1000) {
    console.log(`\n👤 EXTRACTING FOLLOWING for user ID: ${userId}`);
    
    const following = [];
    let nextToken = null;
    let requestCount = 0;
    const maxRequestsPerWindow = 75;
    
    do {
      try {
        requestCount++;
        console.log(`📡 API Request ${requestCount}/${maxRequestsPerWindow}`);
        
        const params = {
          'max_results': Math.min(1000, maxResults - following.length),
          'user.fields': 'id,name,username,public_metrics,verified,description'
        };
        
        if (nextToken) {
          params.pagination_token = nextToken;
        }
        
        const response = await this.makeAPIRequest(`/users/${userId}/following`, params);
        
        if (response.data && response.data.length > 0) {
          following.push(...response.data);
          console.log(`📊 Batch: +${response.data.length} following, Total: ${following.length.toLocaleString()}`);
          
          if (requestCount % 10 === 0) {
            await this.saveProgress('following', following, userId);
          }
        }
        
        nextToken = response.meta?.next_token;
        
        if (following.length >= maxResults || requestCount >= maxRequestsPerWindow) {
          break;
        }
        
        if (nextToken) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
      } catch (error) {
        console.error(`❌ Error in following request ${requestCount}:`, error.message);
        
        if (error.message.includes('429')) {
          console.log(`⚠️ Rate limited. Wait 15 minutes before continuing.`);
          break;
        }
        
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    } while (nextToken && following.length < maxResults);
    
    console.log(`\n✅ FOLLOWING EXTRACTION COMPLETE`);
    console.log(`📊 Total following extracted: ${following.length.toLocaleString()}`);
    
    return following;
  }

  async saveProgress(type, data, userId) {
    const filename = path.join(this.outputDir, `${userId}_${type}_${Date.now()}.json`);
    
    const output = {
      user_id: userId,
      type: type,
      count: data.length,
      extracted_at: new Date().toISOString(),
      data: data
    };
    
    fs.writeFileSync(filename, JSON.stringify(output, null, 2));
    console.log(`💾 Progress saved: ${filename} (${data.length.toLocaleString()} ${type})`);
  }

  async generateUnfollowerReport(username, followers, following) {
    console.log('\n📊 GENERATING UNFOLLOWER ANALYSIS...');
    
    const followerUsernames = new Set(followers.map(f => f.username.toLowerCase()));
    const followingUsernames = new Set(following.map(f => f.username.toLowerCase()));
    
    // Users you follow but who don't follow you back
    const notFollowingBack = following.filter(user => 
      !followerUsernames.has(user.username.toLowerCase())
    );
    
    // Users who follow you but you don't follow back
    const youDontFollowBack = followers.filter(user => 
      !followingUsernames.has(user.username.toLowerCase())
    );
    
    // Mutual followers
    const mutualFollowers = followers.filter(user => 
      followingUsernames.has(user.username.toLowerCase())
    );
    
    const report = {
      username: username,
      analysis_date: new Date().toISOString(),
      summary: {
        total_followers: followers.length,
        total_following: following.length,
        mutual_followers: mutualFollowers.length,
        not_following_back: notFollowingBack.length,
        you_dont_follow_back: youDontFollowBack.length
      },
      details: {
        followers: followers,
        following: following,
        mutual_followers: mutualFollowers,
        not_following_back: notFollowingBack,
        you_dont_follow_back: youDontFollowBack
      }
    };
    
    const reportFile = path.join(this.outputDir, `${username}_api_unfollower_report_${Date.now()}.json`);
    fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
    
    console.log('\n📋 UNFOLLOWER ANALYSIS COMPLETE:');
    console.log(`👥 Total Followers: ${followers.length.toLocaleString()}`);
    console.log(`👤 Total Following: ${following.length.toLocaleString()}`);
    console.log(`🤝 Mutual Followers: ${mutualFollowers.length.toLocaleString()}`);
    console.log(`❌ Not Following You Back: ${notFollowingBack.length.toLocaleString()}`);
    console.log(`➡️ You Don't Follow Back: ${youDontFollowBack.length.toLocaleString()}`);
    console.log(`📄 Report saved: ${reportFile}`);
    
    // Show sample unfollowers
    if (notFollowingBack.length > 0) {
      console.log('\n🔍 Sample users not following you back:');
      notFollowingBack.slice(0, 10).forEach((user, i) => {
        console.log(`  ${i + 1}. @${user.username} (${user.name}) - ${user.public_metrics?.followers_count?.toLocaleString() || 'N/A'} followers`);
      });
    }
    
    return report;
  }
}

// Main execution
async function runTwitterAPIExtraction() {
  const username = 'JoeProAI';
  const extractor = new TwitterAPIFollowerExtractor();
  
  console.log('🚀 TWITTER API FOLLOWER EXTRACTION');
  console.log('=' .repeat(50));
  console.log(`🎯 Target: @${username}`);
  console.log(`🔑 Using app credentials for API access`);
  
  try {
    // Step 1: Get user info
    const user = await extractor.getUserByUsername(username);
    const userId = user.id;
    
    // Step 2: Extract followers (up to API limits)
    const followers = await extractor.getFollowers(userId, 10000); // Start with 10K
    
    // Step 3: Extract following
    const following = await extractor.getFollowing(userId, 5000); // Usually fewer following
    
    // Step 4: Generate unfollower report
    const report = await extractor.generateUnfollowerReport(username, followers, following);
    
    console.log('\n🎉 TWITTER API EXTRACTION COMPLETE!');
    console.log(`✅ Successfully extracted ${followers.length.toLocaleString()} followers via API`);
    console.log(`✅ Successfully extracted ${following.length.toLocaleString()} following via API`);
    console.log(`📊 Unfollower analysis complete`);
    
    return report;
    
  } catch (error) {
    console.error('\n💥 EXTRACTION FAILED:', error.message);
    
    if (error.message.includes('403')) {
      console.log('\n🔧 TROUBLESHOOTING:');
      console.log('- Check if Twitter API credentials are valid');
      console.log('- Verify API access level (Basic/Pro/Enterprise)');
      console.log('- Ensure followers endpoint is available in your plan');
    }
    
    throw error;
  }
}

// Run the extraction
if (require.main === module) {
  runTwitterAPIExtraction()
    .then(report => {
      console.log('\n🚀 SUCCESS: Twitter API extraction is working!');
      console.log('✅ Ready to integrate into Daytona sandbox system');
      process.exit(0);
    })
    .catch(error => {
      console.error('💥 FATAL ERROR:', error);
      process.exit(1);
    });
}

module.exports = { TwitterAPIFollowerExtractor };
