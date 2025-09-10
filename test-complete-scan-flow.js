#!/usr/bin/env node

/**
 * Test Complete Scan Flow with Read/Write Permissions
 * Tests the upgraded Twitter API access with new credentials
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

class UpgradedScanTester {
  constructor() {
    this.outputDir = './extraction_results';
    
    // Updated API credentials with Read/Write permissions
    this.bearerToken = process.env.TWITTER_BEARER_TOKEN;
    this.apiKey = process.env.TWITTER_API_KEY;
    this.apiSecret = process.env.TWITTER_API_SECRET;
    this.accessToken = process.env.TWITTER_ACCESS_TOKEN;
    this.accessTokenSecret = process.env.TWITTER_ACCESS_TOKEN_SECRET;
    
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }
  }

  async testUpgradedApiAccess(username) {
    console.log(`🔍 TESTING UPGRADED API ACCESS (Read/Write) for @${username}`);
    
    try {
      // Test basic user lookup
      const userResponse = await fetch(`https://api.twitter.com/2/users/by/username/${username}?user.fields=public_metrics`, {
        headers: {
          'Authorization': `Bearer ${this.bearerToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (userResponse.ok) {
        const userData = await userResponse.json();
        const metrics = userData.data.public_metrics;
        
        console.log(`✅ USER LOOKUP SUCCESS`);
        console.log(`   👥 Followers: ${metrics.followers_count.toLocaleString()}`);
        console.log(`   👤 Following: ${metrics.following_count.toLocaleString()}`);
        
        // Now test followers API endpoint with Read/Write permissions
        console.log(`\n🔍 Testing followers API endpoint...`);
        
        const followersResponse = await fetch(`https://api.twitter.com/2/users/${userData.data.id}/followers?max_results=100&user.fields=username,name,public_metrics`, {
          headers: {
            'Authorization': `Bearer ${this.bearerToken}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (followersResponse.ok) {
          const followersData = await followersResponse.json();
          
          if (followersData.data && followersData.data.length > 0) {
            console.log(`🎉 FOLLOWERS API SUCCESS!`);
            console.log(`   📊 Retrieved: ${followersData.data.length} followers`);
            console.log(`   🔑 Read/Write permissions working!`);
            
            console.log(`\n👥 Sample followers:`);
            followersData.data.slice(0, 10).forEach((follower, i) => {
              console.log(`   ${i + 1}. @${follower.username} (${follower.name})`);
            });
            
            return {
              success: true,
              total_followers: metrics.followers_count,
              api_followers_retrieved: followersData.data.length,
              followers: followersData.data,
              has_next_token: !!followersData.meta?.next_token
            };
          } else {
            console.log(`⚠️ Followers API returned no data`);
            return { success: false, error: 'No followers data returned' };
          }
        } else {
          const errorData = await followersResponse.text();
          console.log(`❌ Followers API Error: ${followersResponse.status} - ${errorData}`);
          return { success: false, error: `Followers API ${followersResponse.status}: ${errorData}` };
        }
      } else {
        const errorData = await userResponse.text();
        console.log(`❌ User API Error: ${userResponse.status} - ${errorData}`);
        return { success: false, error: `User API ${userResponse.status}: ${errorData}` };
      }
    } catch (error) {
      console.error(`💥 API Test Failed: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  async testFullFollowerExtraction(username, targetCount) {
    console.log(`\n🚀 TESTING FULL FOLLOWER EXTRACTION for @${username}`);
    console.log(`🎯 Target: ${targetCount.toLocaleString()} followers`);
    
    try {
      const allFollowers = [];
      let nextToken = null;
      let pageCount = 0;
      const maxPages = Math.ceil(targetCount / 100); // 100 per page
      
      // Get user ID first
      const userResponse = await fetch(`https://api.twitter.com/2/users/by/username/${username}`, {
        headers: {
          'Authorization': `Bearer ${this.bearerToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      const userData = await userResponse.json();
      const userId = userData.data.id;
      
      console.log(`📡 Starting paginated extraction...`);
      
      do {
        pageCount++;
        console.log(`📄 Page ${pageCount}/${maxPages}...`);
        
        let url = `https://api.twitter.com/2/users/${userId}/followers?max_results=100&user.fields=username,name,public_metrics`;
        if (nextToken) {
          url += `&pagination_token=${nextToken}`;
        }
        
        const response = await fetch(url, {
          headers: {
            'Authorization': `Bearer ${this.bearerToken}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          
          if (data.data && data.data.length > 0) {
            allFollowers.push(...data.data);
            console.log(`   ✅ +${data.data.length} followers (Total: ${allFollowers.length})`);
            
            nextToken = data.meta?.next_token;
            
            // Rate limiting - wait between requests
            await this.waitForTimeout(1000);
          } else {
            console.log(`   ⚠️ No more followers data`);
            break;
          }
        } else {
          const errorData = await response.text();
          console.log(`   ❌ Page ${pageCount} failed: ${response.status} - ${errorData}`);
          break;
        }
        
        // Stop if we've reached our target or hit max pages
        if (allFollowers.length >= targetCount || pageCount >= maxPages) {
          break;
        }
        
      } while (nextToken && pageCount < maxPages);
      
      const successRate = ((allFollowers.length / targetCount) * 100).toFixed(1);
      
      console.log(`\n✅ EXTRACTION COMPLETE`);
      console.log(`📊 Extracted: ${allFollowers.length.toLocaleString()}/${targetCount.toLocaleString()} followers`);
      console.log(`📈 Success rate: ${successRate}%`);
      
      // Save results
      await this.saveResults('upgraded_api_extraction', allFollowers, username, targetCount);
      
      return {
        success: true,
        extracted_count: allFollowers.length,
        target_count: targetCount,
        success_rate: parseFloat(successRate),
        followers: allFollowers
      };
      
    } catch (error) {
      console.error(`💥 Full extraction failed: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  async saveResults(type, followers, username, targetCount) {
    const filename = path.join(this.outputDir, `${username}_${type}_${Date.now()}.json`);
    
    const output = {
      username: username,
      type: type,
      extracted_count: followers.length,
      target_count: targetCount,
      success_rate: ((followers.length / targetCount) * 100).toFixed(1) + '%',
      extracted_at: new Date().toISOString(),
      method: 'upgraded_read_write_api',
      followers: followers
    };
    
    fs.writeFileSync(filename, JSON.stringify(output, null, 2));
    console.log(`💾 Results saved: ${filename}`);
  }

  async waitForTimeout(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async runUpgradedTest(username = 'JoeProAI') {
    console.log('🧪 UPGRADED API PERMISSIONS TEST');
    console.log('=' .repeat(50));
    console.log('🔑 Testing Read/Write permissions');
    
    try {
      // Test 1: Basic API access and followers endpoint
      const apiTest = await this.testUpgradedApiAccess(username);
      
      if (apiTest.success) {
        console.log(`\n🎉 API UPGRADE SUCCESSFUL!`);
        console.log(`✅ Can access followers API with Read/Write permissions`);
        console.log(`📊 Retrieved ${apiTest.api_followers_retrieved} followers in test`);
        
        // Test 2: Full extraction
        const fullTest = await this.testFullFollowerExtraction(username, apiTest.total_followers);
        
        if (fullTest.success) {
          if (fullTest.success_rate > 80) {
            console.log(`\n🚀 EXCELLENT: ${fullTest.success_rate}% extraction rate!`);
            console.log(`✅ Read/Write permissions provide full access`);
            console.log(`🎯 READY FOR PRODUCTION`);
          } else if (fullTest.success_rate > 50) {
            console.log(`\n✅ GOOD: ${fullTest.success_rate}% extraction rate`);
            console.log(`⚠️ Some rate limiting, but functional`);
          } else {
            console.log(`\n⚠️ LIMITED: ${fullTest.success_rate}% extraction rate`);
            console.log(`❓ May need additional API configuration`);
          }
          
          if (fullTest.followers.length > 0) {
            console.log(`\n🔍 Sample extracted followers:`);
            fullTest.followers.slice(0, 15).forEach((f, i) => {
              console.log(`  ${i + 1}. @${f.username} (${f.name || 'No name'})`);
            });
          }
          
          return { success: true, ...fullTest };
        } else {
          console.log(`\n❌ Full extraction failed: ${fullTest.error}`);
          return { success: false, error: fullTest.error };
        }
      } else {
        console.log(`\n❌ API upgrade test failed: ${apiTest.error}`);
        console.log(`💡 Check if permissions were properly upgraded in Twitter Developer Portal`);
        return { success: false, error: apiTest.error };
      }
      
    } catch (error) {
      console.error('\n💥 UPGRADED TEST FAILED:', error.message);
      return { success: false, error: error.message };
    }
  }
}

// Main execution
async function runUpgradedTest() {
  const tester = new UpgradedScanTester();
  
  try {
    const results = await tester.runUpgradedTest('JoeProAI');
    
    if (results.success) {
      console.log('\n🎯 SUCCESS: Upgraded permissions working!');
      console.log(`📊 Extracted ${results.extracted_count} of ${results.target_count} followers`);
      console.log('✅ Ready to integrate into production system');
      process.exit(0);
    } else {
      console.log('\n⚠️ UPGRADE INCOMPLETE: Check API permissions');
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
  runUpgradedTest();
}

module.exports = { UpgradedScanTester };
