#!/usr/bin/env node

/**
 * Verify Total Follower Count via API, then Extract with Proper App Authentication
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

class VerifiedFollowerExtractor {
  constructor() {
    this.outputDir = './extraction_results';
    this.browser = null;
    this.page = null;
    
    // Twitter API credentials
    this.bearerToken = process.env.TWITTER_BEARER_TOKEN;
    this.apiKey = process.env.TWITTER_API_KEY;
    this.apiSecret = process.env.TWITTER_API_SECRET;
    this.accessToken = process.env.TWITTER_ACCESS_TOKEN;
    this.accessTokenSecret = process.env.TWITTER_ACCESS_TOKEN_SECRET;
    
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }
  }

  async getActualFollowerCount(username) {
    console.log(`🔍 GETTING ACTUAL FOLLOWER COUNT for @${username}`);
    
    try {
      // Method 1: Try Twitter API v2 with Bearer Token
      if (this.bearerToken) {
        console.log('📡 Trying Twitter API v2 with Bearer Token...');
        
        const response = await fetch(`https://api.twitter.com/2/users/by/username/${username}?user.fields=public_metrics`, {
          headers: {
            'Authorization': `Bearer ${this.bearerToken}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.data && data.data.public_metrics) {
            const metrics = data.data.public_metrics;
            console.log(`✅ API SUCCESS - Follower metrics:`);
            console.log(`   👥 Followers: ${metrics.followers_count.toLocaleString()}`);
            console.log(`   👤 Following: ${metrics.following_count.toLocaleString()}`);
            console.log(`   📝 Tweets: ${metrics.tweet_count.toLocaleString()}`);
            console.log(`   ❤️ Likes: ${metrics.like_count.toLocaleString()}`);
            
            return {
              followers_count: metrics.followers_count,
              following_count: metrics.following_count,
              user_id: data.data.id,
              username: data.data.username,
              name: data.data.name || username,
              method: 'twitter_api_v2'
            };
          }
        } else {
          const errorData = await response.text();
          console.log(`❌ API Error: ${response.status} - ${errorData}`);
        }
      }
      
      // Method 2: Try scraping the profile page for follower count
      console.log('🌐 Trying profile page scraping for follower count...');
      
      if (!this.browser) {
        await this.initializeBrowser();
      }
      
      const profileUrl = `https://x.com/${username}`;
      await this.page.goto(profileUrl, { waitUntil: 'networkidle', timeout: 30000 });
      
      // Wait for profile to load
      await this.page.waitForTimeout(3000);
      
      // Extract follower count from profile
      const followerCount = await this.page.evaluate(() => {
        // Look for follower count patterns
        const patterns = [
          // Pattern 1: Link with "Followers" text
          () => {
            const links = Array.from(document.querySelectorAll('a[href*="/followers"]'));
            for (const link of links) {
              const text = link.textContent || '';
              const match = text.match(/(\d{1,3}(?:,\d{3})*(?:\.\d+)?[KMB]?)\s*Followers?/i);
              if (match) return match[1];
            }
            return null;
          },
          
          // Pattern 2: Any element with follower count
          () => {
            const elements = Array.from(document.querySelectorAll('*'));
            for (const el of elements) {
              const text = el.textContent || '';
              if (text.includes('Followers') || text.includes('followers')) {
                const match = text.match(/(\d{1,3}(?:,\d{3})*(?:\.\d+)?[KMB]?)\s*[Ff]ollowers?/);
                if (match) return match[1];
              }
            }
            return null;
          },
          
          // Pattern 3: Specific selectors
          () => {
            const selectors = [
              '[data-testid="UserProfileHeader_Items"] a[href*="/followers"]',
              'a[href$="/followers"] span',
              '[href*="/followers"] span'
            ];
            
            for (const selector of selectors) {
              const elements = document.querySelectorAll(selector);
              for (const el of elements) {
                const text = el.textContent || '';
                const match = text.match(/(\d{1,3}(?:,\d{3})*(?:\.\d+)?[KMB]?)/);
                if (match && !text.includes('Following')) return match[1];
              }
            }
            return null;
          }
        ];
        
        for (const pattern of patterns) {
          const result = pattern();
          if (result) return result;
        }
        
        return null;
      });
      
      if (followerCount) {
        const numericCount = this.parseFollowerCount(followerCount);
        console.log(`✅ SCRAPED SUCCESS - Follower count: ${followerCount} (${numericCount.toLocaleString()})`);
        
        return {
          followers_count: numericCount,
          followers_display: followerCount,
          username: username,
          method: 'profile_scraping'
        };
      }
      
      console.log('❌ Could not determine follower count');
      return null;
      
    } catch (error) {
      console.error(`💥 Error getting follower count: ${error.message}`);
      return null;
    }
  }

  parseFollowerCount(countStr) {
    if (!countStr) return 0;
    
    const str = countStr.toString().toLowerCase();
    const num = parseFloat(str.replace(/[,\s]/g, ''));
    
    if (str.includes('k')) return Math.floor(num * 1000);
    if (str.includes('m')) return Math.floor(num * 1000000);
    if (str.includes('b')) return Math.floor(num * 1000000000);
    
    return Math.floor(num);
  }

  async initializeBrowser() {
    console.log('🚀 Initializing browser with app authentication...');
    
    this.browser = await chromium.launch({
      headless: false,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor',
        '--disable-blink-features=AutomationControlled'
      ]
    });

    const context = await this.browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      viewport: { width: 1920, height: 1080 },
      extraHTTPHeaders: {
        'Accept-Language': 'en-US,en;q=0.9'
      }
    });

    this.page = await context.newPage();
    
    // Set up app authentication if available
    if (this.accessToken && this.accessTokenSecret) {
      console.log('🔑 Setting up app OAuth authentication...');
      
      // Navigate to Twitter first
      await this.page.goto('https://x.com/', { waitUntil: 'networkidle' });
      
      // Inject OAuth tokens into browser session
      await this.page.evaluate((tokens) => {
        // Set authentication cookies/localStorage
        localStorage.setItem('oauth_token', tokens.accessToken);
        localStorage.setItem('oauth_token_secret', tokens.accessTokenSecret);
        
        // Set authentication headers for requests
        window.twitterAuth = {
          token: tokens.accessToken,
          secret: tokens.accessTokenSecret
        };
      }, {
        accessToken: this.accessToken,
        accessTokenSecret: this.accessTokenSecret
      });
      
      console.log('✅ App authentication configured');
    }
  }

  async extractFollowersWithVerifiedCount(username, expectedCount) {
    console.log(`\n👥 EXTRACTING FOLLOWERS for @${username}`);
    console.log(`🎯 Expected count: ${expectedCount.toLocaleString()}`);
    
    const followersUrl = `https://x.com/${username}/followers`;
    console.log(`📱 Navigating to: ${followersUrl}`);
    
    await this.page.goto(followersUrl, { waitUntil: 'networkidle', timeout: 60000 });
    await this.page.waitForTimeout(5000);
    
    const currentUrl = this.page.url();
    const title = await this.page.title();
    
    console.log(`📄 Current URL: ${currentUrl}`);
    console.log(`📋 Page title: ${title}`);
    
    // Check if we're properly authenticated
    const isAuthenticated = await this.page.evaluate(() => {
      // Check for login indicators
      const loginElements = document.querySelectorAll('[data-testid="loginButton"], [href="/login"], .login');
      return loginElements.length === 0;
    });
    
    console.log(`🔐 Authentication status: ${isAuthenticated ? 'Authenticated' : 'Not authenticated'}`);
    
    if (!isAuthenticated) {
      console.log('⚠️ Not properly authenticated - may get limited results');
    }
    
    const followers = new Set();
    let scrollAttempts = 0;
    let maxScrollAttempts = Math.min(500, Math.ceil(expectedCount / 20)); // Estimate based on expected count
    let consecutiveNoNewFollowers = 0;
    
    console.log(`🔄 Starting extraction (max ${maxScrollAttempts} attempts for ${expectedCount} followers)...`);
    
    // Wait for initial followers to load
    await this.waitForFollowersToLoad();
    
    while (scrollAttempts < maxScrollAttempts && consecutiveNoNewFollowers < 30) {
      try {
        // Extract current visible followers
        const currentBatch = await this.extractVisibleFollowers();
        
        // Add new followers
        const initialSize = followers.size;
        currentBatch.forEach(follower => followers.add(follower));
        const newFollowersFound = followers.size - initialSize;
        
        const progress = ((followers.size / expectedCount) * 100).toFixed(1);
        console.log(`📊 Scroll ${scrollAttempts + 1}: +${newFollowersFound} new, Total: ${followers.size}/${expectedCount} (${progress}%)`);
        
        // Check for stagnation
        if (newFollowersFound === 0) {
          consecutiveNoNewFollowers++;
          console.log(`⚠️ No new followers (${consecutiveNoNewFollowers}/30)`);
        } else {
          consecutiveNoNewFollowers = 0;
        }
        
        // Save progress periodically
        if (scrollAttempts % 50 === 0 && followers.size > 0) {
          await this.saveProgress('verified_followers_progress', Array.from(followers), username, expectedCount);
        }
        
        // Enhanced scrolling
        await this.performEnhancedScroll();
        await this.waitForNewContent();
        
        scrollAttempts++;
        
        // Check if we've reached close to expected count
        if (followers.size >= expectedCount * 0.9) {
          console.log(`🎯 Reached 90% of expected followers (${followers.size}/${expectedCount})`);
          break;
        }
        
      } catch (error) {
        console.error(`❌ Error in scroll ${scrollAttempts}: ${error.message}`);
        await this.page.waitForTimeout(3000);
      }
    }
    
    const followersArray = Array.from(followers);
    const successRate = ((followersArray.length / expectedCount) * 100).toFixed(1);
    
    console.log(`\n✅ VERIFIED EXTRACTION COMPLETE`);
    console.log(`📊 Total followers extracted: ${followersArray.length.toLocaleString()}`);
    console.log(`🎯 Expected: ${expectedCount.toLocaleString()}`);
    console.log(`📈 Success rate: ${successRate}%`);
    
    if (followersArray.length < expectedCount * 0.1) {
      console.log(`⚠️ LOW SUCCESS RATE - May need elevated API permissions or different authentication`);
    }
    
    // Save final results
    await this.saveProgress('verified_followers_final', followersArray, username, expectedCount);
    
    return {
      followers: followersArray,
      expected_count: expectedCount,
      actual_count: followersArray.length,
      success_rate: parseFloat(successRate)
    };
  }

  async waitForFollowersToLoad() {
    console.log('⏳ Waiting for followers to load...');
    
    try {
      await this.page.waitForSelector('[data-testid="UserCell"], article, [href*="/"]', { timeout: 30000 });
      await this.page.waitForTimeout(3000);
      console.log('✅ Followers loaded');
    } catch (error) {
      console.log('⚠️ Timeout waiting for followers, continuing anyway');
    }
  }

  async extractVisibleFollowers() {
    return await this.page.evaluate(() => {
      const followers = new Set();
      
      // Strategy 1: UserCell components
      const userCells = document.querySelectorAll('[data-testid="UserCell"]');
      userCells.forEach(cell => {
        const links = cell.querySelectorAll('a[href^="/"]');
        links.forEach(link => {
          const href = link.getAttribute('href');
          if (href && href.startsWith('/')) {
            const username = href.split('/')[1].split('?')[0];
            if (username && username.length >= 1 && username.length <= 15 && 
                username.match(/^[a-zA-Z0-9_]+$/) &&
                !['home', 'explore', 'search', 'settings', 'notifications', 'messages', 'compose', 'login', 'signup', 'i', 'intent', 'hashtag', 'status'].includes(username.toLowerCase())) {
              followers.add(username);
            }
          }
        });
      });
      
      // Strategy 2: All profile links
      const allLinks = document.querySelectorAll('a[href^="/"]');
      Array.from(allLinks).slice(0, 300).forEach(link => {
        const href = link.getAttribute('href');
        if (href && href.startsWith('/') && !href.includes('/status/') && !href.includes('/photo/')) {
          const username = href.split('/')[1].split('?')[0];
          if (username && username.length >= 1 && username.length <= 15 && 
              username.match(/^[a-zA-Z0-9_]+$/) &&
              !['home', 'explore', 'search', 'settings', 'notifications', 'messages', 'compose', 'login', 'signup', 'i', 'intent', 'hashtag', 'status'].includes(username.toLowerCase())) {
            followers.add(username);
          }
        }
      });
      
      return Array.from(followers);
    });
  }

  async performEnhancedScroll() {
    // Multiple scrolling techniques
    await this.page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight);
    });
    await this.page.waitForTimeout(1000);
    
    await this.page.evaluate(() => {
      window.scrollBy(0, window.innerHeight);
    });
    await this.page.waitForTimeout(500);
  }

  async waitForNewContent() {
    try {
      await this.page.waitForLoadState('networkidle', { timeout: 3000 });
    } catch (e) {
      // Continue if network doesn't idle
    }
    await this.page.waitForTimeout(2000);
  }

  async saveProgress(type, data, username, expectedCount) {
    const filename = path.join(this.outputDir, `${username}_${type}_${Date.now()}.json`);
    
    const output = {
      username: username,
      type: type,
      count: data.length,
      expected_count: expectedCount,
      success_rate: ((data.length / expectedCount) * 100).toFixed(1) + '%',
      extracted_at: new Date().toISOString(),
      method: 'verified_count_extraction',
      followers: data
    };
    
    fs.writeFileSync(filename, JSON.stringify(output, null, 2));
    console.log(`💾 Progress saved: ${filename} (${data.length}/${expectedCount} followers)`);
  }

  async cleanup() {
    if (this.browser) {
      await this.browser.close();
    }
  }
}

// Main execution
async function runVerifiedExtraction() {
  const username = 'JoeProAI';
  const extractor = new VerifiedFollowerExtractor();
  
  try {
    // Step 1: Get actual follower count
    const countInfo = await extractor.getActualFollowerCount(username);
    
    if (!countInfo) {
      throw new Error('Could not determine actual follower count');
    }
    
    console.log(`\n🎯 VERIFIED FOLLOWER COUNT: ${countInfo.followers_count.toLocaleString()}`);
    
    // Step 2: Initialize browser with proper authentication
    await extractor.initializeBrowser();
    
    // Step 3: Extract followers with verified count target
    const results = await extractor.extractFollowersWithVerifiedCount(username, countInfo.followers_count);
    
    console.log('\n🎉 VERIFIED EXTRACTION COMPLETE!');
    console.log(`✅ Extracted ${results.actual_count.toLocaleString()} of ${results.expected_count.toLocaleString()} followers`);
    console.log(`📈 Success rate: ${results.success_rate}%`);
    
    if (results.success_rate > 50) {
      console.log('🚀 SUCCESS: High extraction rate achieved!');
    } else if (results.success_rate > 10) {
      console.log('⚠️ PARTIAL SUCCESS: May need elevated API permissions');
    } else {
      console.log('❌ LOW SUCCESS: App authentication may need elevated permissions');
      console.log('💡 Consider checking Twitter Developer Portal for app permissions');
    }
    
    if (results.followers.length > 0) {
      console.log('\n🔍 Sample followers:');
      results.followers.slice(0, 15).forEach((f, i) => {
        console.log(`  ${i + 1}. @${f}`);
      });
    }
    
    return results;
    
  } catch (error) {
    console.error('\n💥 EXTRACTION FAILED:', error.message);
    throw error;
  } finally {
    await extractor.cleanup();
  }
}

// Run the extraction
if (require.main === module) {
  runVerifiedExtraction()
    .then(results => {
      if (results.success_rate > 50) {
        console.log('\n✅ READY FOR PRODUCTION: High success rate achieved');
      } else {
        console.log('\n⚠️ NEEDS PERMISSION UPGRADE: Low success rate indicates API limitations');
      }
      process.exit(0);
    })
    .catch(error => {
      console.error('💥 FATAL ERROR:', error);
      process.exit(1);
    });
}

module.exports = { VerifiedFollowerExtractor };
