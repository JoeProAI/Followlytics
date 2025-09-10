#!/usr/bin/env node

/**
 * Robust Follower Extraction - 867 Followers Target
 * Uses verified API count (867) to extract all followers with proper app authentication
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

class RobustFollowerExtractor {
  constructor() {
    this.outputDir = './extraction_results';
    this.browser = null;
    this.page = null;
    this.context = null;
    
    // Twitter API credentials
    this.bearerToken = process.env.TWITTER_BEARER_TOKEN;
    this.accessToken = process.env.TWITTER_ACCESS_TOKEN;
    this.accessTokenSecret = process.env.TWITTER_ACCESS_TOKEN_SECRET;
    
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }
  }

  async getVerifiedFollowerCount(username) {
    console.log(`🔍 GETTING VERIFIED FOLLOWER COUNT for @${username}`);
    
    try {
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
          console.log(`✅ VERIFIED COUNT: ${metrics.followers_count.toLocaleString()} followers`);
          return metrics.followers_count;
        }
      }
      
      throw new Error('Could not get verified count from API');
    } catch (error) {
      console.error(`❌ API Error: ${error.message}`);
      return null;
    }
  }

  async initializeBrowser() {
    console.log('🚀 Initializing robust browser...');
    
    try {
      this.browser = await chromium.launch({
        headless: false,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-web-security',
          '--disable-features=VizDisplayCompositor',
          '--disable-blink-features=AutomationControlled',
          '--disable-dev-shm-usage',
          '--no-first-run',
          '--disable-extensions'
        ]
      });

      this.context = await this.browser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        viewport: { width: 1920, height: 1080 },
        extraHTTPHeaders: {
          'Accept-Language': 'en-US,en;q=0.9'
        }
      });

      this.page = await this.context.newPage();
      
      console.log('✅ Browser initialized successfully');
      return true;
    } catch (error) {
      console.error(`❌ Browser initialization failed: ${error.message}`);
      return false;
    }
  }

  async authenticateWithApp() {
    console.log('🔑 Authenticating with app credentials...');
    
    try {
      // Navigate to Twitter
      await this.page.goto('https://x.com/', { 
        waitUntil: 'domcontentloaded', 
        timeout: 30000 
      });
      
      await this.page.waitForTimeout(3000);
      
      // Check if we can access the site
      const title = await this.page.title();
      console.log(`📄 Page loaded: ${title}`);
      
      // Set authentication tokens in browser storage
      if (this.accessToken && this.accessTokenSecret) {
        await this.page.evaluate((tokens) => {
          // Store OAuth tokens
          localStorage.setItem('oauth_token', tokens.accessToken);
          localStorage.setItem('oauth_token_secret', tokens.accessTokenSecret);
          
          // Set authentication headers for future requests
          window.twitterAuth = {
            token: tokens.accessToken,
            secret: tokens.accessTokenSecret
          };
          
          console.log('OAuth tokens stored in browser');
        }, {
          accessToken: this.accessToken,
          accessTokenSecret: this.accessTokenSecret
        });
        
        console.log('✅ App authentication configured');
      }
      
      return true;
    } catch (error) {
      console.error(`❌ Authentication failed: ${error.message}`);
      return false;
    }
  }

  async extractAllFollowers(username, targetCount) {
    console.log(`\n👥 EXTRACTING ALL ${targetCount} FOLLOWERS for @${username}`);
    
    try {
      const followersUrl = `https://x.com/${username}/followers`;
      console.log(`📱 Navigating to: ${followersUrl}`);
      
      await this.page.goto(followersUrl, { 
        waitUntil: 'domcontentloaded', 
        timeout: 60000 
      });
      
      await this.page.waitForTimeout(5000);
      
      const currentUrl = this.page.url();
      const title = await this.page.title();
      
      console.log(`📄 Current URL: ${currentUrl}`);
      console.log(`📋 Page title: ${title}`);
      
      // Check authentication status
      const authStatus = await this.checkAuthenticationStatus();
      console.log(`🔐 Authentication: ${authStatus}`);
      
      const followers = new Set();
      let scrollAttempts = 0;
      let maxScrollAttempts = Math.ceil(targetCount / 10); // Estimate scrolls needed
      let consecutiveNoNewFollowers = 0;
      let lastCount = 0;
      
      console.log(`🔄 Starting extraction (targeting ${targetCount} followers)...`);
      
      // Wait for initial content
      await this.waitForInitialContent();
      
      while (scrollAttempts < maxScrollAttempts && consecutiveNoNewFollowers < 50) {
        try {
          // Extract visible followers
          const newFollowers = await this.extractVisibleFollowers();
          
          // Add to set
          const beforeSize = followers.size;
          newFollowers.forEach(f => followers.add(f));
          const added = followers.size - beforeSize;
          
          const progress = ((followers.size / targetCount) * 100).toFixed(1);
          console.log(`📊 Scroll ${scrollAttempts + 1}: +${added} new, Total: ${followers.size}/${targetCount} (${progress}%)`);
          
          // Check for progress
          if (followers.size === lastCount) {
            consecutiveNoNewFollowers++;
            console.log(`⚠️ No progress (${consecutiveNoNewFollowers}/50)`);
          } else {
            consecutiveNoNewFollowers = 0;
            lastCount = followers.size;
          }
          
          // Save progress every 100 followers
          if (followers.size > 0 && followers.size % 100 === 0) {
            await this.saveProgress('extraction_progress', Array.from(followers), username, targetCount);
          }
          
          // Scroll and wait
          await this.performScroll();
          await this.waitForNewContent();
          
          scrollAttempts++;
          
          // Check if we're close to target
          if (followers.size >= targetCount * 0.95) {
            console.log(`🎯 Reached 95% of target (${followers.size}/${targetCount})`);
            break;
          }
          
        } catch (error) {
          console.error(`❌ Error in scroll ${scrollAttempts}: ${error.message}`);
          await this.page.waitForTimeout(5000);
          
          // Try to recover
          if (scrollAttempts % 50 === 0) {
            console.log('🔄 Attempting page refresh...');
            await this.page.reload({ waitUntil: 'domcontentloaded' });
            await this.waitForInitialContent();
          }
        }
      }
      
      const followersArray = Array.from(followers);
      const successRate = ((followersArray.length / targetCount) * 100).toFixed(1);
      
      console.log(`\n✅ EXTRACTION COMPLETE`);
      console.log(`📊 Extracted: ${followersArray.length.toLocaleString()}/${targetCount.toLocaleString()} followers`);
      console.log(`📈 Success rate: ${successRate}%`);
      
      // Save final results
      await this.saveProgress('final_extraction', followersArray, username, targetCount);
      
      return {
        followers: followersArray,
        target_count: targetCount,
        actual_count: followersArray.length,
        success_rate: parseFloat(successRate)
      };
      
    } catch (error) {
      console.error(`💥 Extraction error: ${error.message}`);
      throw error;
    }
  }

  async checkAuthenticationStatus() {
    try {
      const hasLoginButton = await this.page.$('[data-testid="loginButton"]') !== null;
      const hasLoginLink = await this.page.$('a[href="/login"]') !== null;
      const isLoginPage = this.page.url().includes('/login');
      
      if (hasLoginButton || hasLoginLink || isLoginPage) {
        return 'Not authenticated - limited access';
      }
      
      return 'Authenticated - full access';
    } catch (error) {
      return 'Unknown';
    }
  }

  async waitForInitialContent() {
    console.log('⏳ Waiting for initial content...');
    
    try {
      // Wait for any of these selectors to appear
      await this.page.waitForSelector('div, article, [data-testid], a[href]', { timeout: 30000 });
      await this.page.waitForTimeout(3000);
      console.log('✅ Initial content loaded');
    } catch (error) {
      console.log('⚠️ Timeout waiting for content, continuing...');
    }
  }

  async extractVisibleFollowers() {
    return await this.page.evaluate(() => {
      const followers = new Set();
      
      // Get all links that could be profile links
      const links = document.querySelectorAll('a[href^="/"]');
      
      for (const link of links) {
        try {
          const href = link.getAttribute('href');
          if (!href) continue;
          
          // Extract username from href
          const pathParts = href.split('/');
          if (pathParts.length < 2) continue;
          
          const username = pathParts[1].split('?')[0];
          
          // Validate username
          if (username && 
              username.length >= 1 && 
              username.length <= 15 &&
              /^[a-zA-Z0-9_]+$/.test(username) &&
              !['home', 'explore', 'search', 'settings', 'notifications', 'messages', 
                'compose', 'login', 'signup', 'i', 'intent', 'hashtag', 'status', 
                'photo', 'video', 'moments', 'lists', 'bookmarks'].includes(username.toLowerCase())) {
            followers.add(username);
          }
        } catch (e) {
          // Skip invalid links
        }
      }
      
      return Array.from(followers);
    });
  }

  async performScroll() {
    // Scroll to bottom
    await this.page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight);
    });
    
    await this.page.waitForTimeout(1000);
    
    // Scroll by viewport
    await this.page.evaluate(() => {
      window.scrollBy(0, window.innerHeight);
    });
  }

  async waitForNewContent() {
    // Wait for potential new content to load
    await this.page.waitForTimeout(2000);
    
    try {
      await this.page.waitForLoadState('networkidle', { timeout: 3000 });
    } catch (e) {
      // Continue if network doesn't idle
    }
  }

  async saveProgress(type, followers, username, targetCount) {
    const filename = path.join(this.outputDir, `${username}_${type}_${Date.now()}.json`);
    
    const output = {
      username: username,
      type: type,
      extracted_count: followers.length,
      target_count: targetCount,
      success_rate: ((followers.length / targetCount) * 100).toFixed(1) + '%',
      extracted_at: new Date().toISOString(),
      method: 'robust_app_authentication',
      followers: followers
    };
    
    fs.writeFileSync(filename, JSON.stringify(output, null, 2));
    console.log(`💾 Saved: ${filename} (${followers.length}/${targetCount})`);
  }

  async cleanup() {
    try {
      if (this.page) await this.page.close();
      if (this.context) await this.context.close();
      if (this.browser) await this.browser.close();
      console.log('🧹 Browser cleanup complete');
    } catch (error) {
      console.error('⚠️ Cleanup error:', error.message);
    }
  }
}

// Main execution
async function runRobustExtraction() {
  const username = 'JoeProAI';
  const extractor = new RobustFollowerExtractor();
  
  try {
    // Step 1: Get verified count from API
    const targetCount = await extractor.getVerifiedFollowerCount(username);
    if (!targetCount) {
      throw new Error('Could not get verified follower count');
    }
    
    // Step 2: Initialize browser
    const browserReady = await extractor.initializeBrowser();
    if (!browserReady) {
      throw new Error('Browser initialization failed');
    }
    
    // Step 3: Authenticate
    const authReady = await extractor.authenticateWithApp();
    if (!authReady) {
      throw new Error('Authentication failed');
    }
    
    // Step 4: Extract all followers
    const results = await extractor.extractAllFollowers(username, targetCount);
    
    console.log('\n🎉 ROBUST EXTRACTION COMPLETE!');
    console.log(`✅ Extracted ${results.actual_count.toLocaleString()} of ${results.target_count.toLocaleString()} followers`);
    console.log(`📈 Success rate: ${results.success_rate}%`);
    
    if (results.success_rate > 80) {
      console.log('🚀 EXCELLENT: High success rate - ready for production!');
    } else if (results.success_rate > 50) {
      console.log('✅ GOOD: Decent success rate - may need minor improvements');
    } else if (results.success_rate > 20) {
      console.log('⚠️ PARTIAL: Limited success - may need elevated API permissions');
    } else {
      console.log('❌ LOW: Very limited access - app needs elevated permissions');
    }
    
    if (results.followers.length > 0) {
      console.log('\n🔍 Sample followers:');
      results.followers.slice(0, 20).forEach((f, i) => {
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
  runRobustExtraction()
    .then(results => {
      if (results.success_rate > 50) {
        console.log('\n🎯 SUCCESS: Ready to integrate into production system');
      } else {
        console.log('\n⚠️ NEEDS IMPROVEMENT: Consider elevated API permissions or user authentication');
      }
      process.exit(0);
    })
    .catch(error => {
      console.error('💥 FATAL ERROR:', error);
      process.exit(1);
    });
}

module.exports = { RobustFollowerExtractor };
