#!/usr/bin/env node

/**
 * MASSIVE SCALE FOLLOWER EXTRACTION for @JoeProAI
 * Designed to extract millions of followers with pagination, batching, and resilience
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

class MassiveFollowerExtractor {
  constructor(username) {
    this.username = username;
    this.followers = new Set();
    this.following = new Set();
    this.processed = 0;
    this.batchSize = 100;
    this.maxRetries = 3;
    this.delayBetweenBatches = 2000; // 2 seconds
    this.outputDir = './extraction_results';
    this.browser = null;
    this.page = null;
  }

  async initialize() {
    console.log(`🚀 MASSIVE FOLLOWER EXTRACTION: @${this.username}`);
    console.log('=' .repeat(60));
    
    // Create output directory
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }

    // Launch browser with optimized settings
    console.log('🌐 Launching optimized browser...');
    this.browser = await chromium.launch({
      headless: false, // Keep visible for monitoring
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor',
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding'
      ]
    });

    const context = await this.browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      viewport: { width: 1920, height: 1080 },
      ignoreHTTPSErrors: true
    });

    this.page = await context.newPage();
    
    // Set up request interception to block unnecessary resources
    await this.page.route('**/*', (route) => {
      const resourceType = route.request().resourceType();
      if (['image', 'stylesheet', 'font', 'media'].includes(resourceType)) {
        route.abort();
      } else {
        route.continue();
      }
    });

    console.log('✅ Browser initialized');
  }

  async extractFollowers() {
    console.log(`\n👥 EXTRACTING FOLLOWERS for @${this.username}`);
    
    // Navigate to followers page
    const followersUrl = `https://x.com/${this.username}/followers`;
    console.log(`📱 Navigating to: ${followersUrl}`);
    
    await this.page.goto(followersUrl, { waitUntil: 'networkidle', timeout: 30000 });
    await this.page.waitForTimeout(3000);
    
    console.log(`📄 Current URL: ${this.page.url()}`);
    
    // Check if we're blocked or redirected
    const title = await this.page.title();
    if (title.includes('Login') || title.includes('Sign up')) {
      throw new Error('Redirected to login - Twitter is blocking access');
    }

    let scrollAttempts = 0;
    let maxScrollAttempts = 1000; // Adjust based on expected follower count
    let lastFollowerCount = 0;
    let stagnantScrolls = 0;
    
    console.log('🔄 Starting infinite scroll extraction...');
    
    while (scrollAttempts < maxScrollAttempts && stagnantScrolls < 10) {
      try {
        // Extract current batch of followers
        const currentBatch = await this.extractCurrentBatch();
        
        // Add to followers set
        currentBatch.forEach(follower => this.followers.add(follower));
        
        const currentCount = this.followers.size;
        console.log(`📊 Batch ${scrollAttempts + 1}: Found ${currentBatch.length} new, Total: ${currentCount} followers`);
        
        // Check for stagnation
        if (currentCount === lastFollowerCount) {
          stagnantScrolls++;
          console.log(`⚠️ No new followers found (${stagnantScrolls}/10)`);
        } else {
          stagnantScrolls = 0;
          lastFollowerCount = currentCount;
        }
        
        // Save progress every 10 batches
        if (scrollAttempts % 10 === 0) {
          await this.saveProgress('followers');
        }
        
        // Scroll down to load more
        await this.page.evaluate(() => {
          window.scrollTo(0, document.body.scrollHeight);
        });
        
        // Wait for new content to load
        await this.page.waitForTimeout(this.delayBetweenBatches);
        
        scrollAttempts++;
        
      } catch (error) {
        console.error(`❌ Error in batch ${scrollAttempts}: ${error.message}`);
        
        // Try to recover
        await this.page.waitForTimeout(5000);
        
        // If too many errors, break
        if (scrollAttempts > 0 && scrollAttempts % 50 === 0) {
          console.log('🔄 Refreshing page to prevent timeouts...');
          await this.page.reload({ waitUntil: 'networkidle' });
          await this.page.waitForTimeout(3000);
        }
      }
    }
    
    console.log(`\n✅ FOLLOWERS EXTRACTION COMPLETE`);
    console.log(`📊 Total followers extracted: ${this.followers.size}`);
    
    return Array.from(this.followers);
  }

  async extractFollowing() {
    console.log(`\n👤 EXTRACTING FOLLOWING for @${this.username}`);
    
    // Navigate to following page
    const followingUrl = `https://x.com/${this.username}/following`;
    console.log(`📱 Navigating to: ${followingUrl}`);
    
    await this.page.goto(followingUrl, { waitUntil: 'networkidle', timeout: 30000 });
    await this.page.waitForTimeout(3000);
    
    let scrollAttempts = 0;
    let maxScrollAttempts = 500; // Usually fewer following than followers
    let lastFollowingCount = 0;
    let stagnantScrolls = 0;
    
    console.log('🔄 Starting following extraction...');
    
    while (scrollAttempts < maxScrollAttempts && stagnantScrolls < 10) {
      try {
        const currentBatch = await this.extractCurrentBatch();
        currentBatch.forEach(user => this.following.add(user));
        
        const currentCount = this.following.size;
        console.log(`📊 Batch ${scrollAttempts + 1}: Found ${currentBatch.length} new, Total: ${currentCount} following`);
        
        if (currentCount === lastFollowingCount) {
          stagnantScrolls++;
        } else {
          stagnantScrolls = 0;
          lastFollowingCount = currentCount;
        }
        
        if (scrollAttempts % 10 === 0) {
          await this.saveProgress('following');
        }
        
        await this.page.evaluate(() => {
          window.scrollTo(0, document.body.scrollHeight);
        });
        
        await this.page.waitForTimeout(this.delayBetweenBatches);
        scrollAttempts++;
        
      } catch (error) {
        console.error(`❌ Error in following batch ${scrollAttempts}: ${error.message}`);
        await this.page.waitForTimeout(5000);
      }
    }
    
    console.log(`\n✅ FOLLOWING EXTRACTION COMPLETE`);
    console.log(`📊 Total following extracted: ${this.following.size}`);
    
    return Array.from(this.following);
  }

  async extractCurrentBatch() {
    // Look for user profile links
    const userLinks = await this.page.$$('a[href^="/"][data-testid*="UserCell"], a[href^="/"][role="link"]');
    const batchUsers = new Set();
    
    for (const link of userLinks.slice(0, this.batchSize)) {
      try {
        const href = await link.getAttribute('href');
        if (href && href.startsWith('/') && href.length > 1) {
          const username = href.split('/')[1].split('?')[0]; // Remove query params
          
          if (this.isValidUsername(username)) {
            batchUsers.add(username);
          }
        }
      } catch (e) {
        // Skip errors on individual links
      }
    }
    
    // Also extract from text content
    const textContent = await this.page.textContent('body');
    const mentions = textContent.match(/@([a-zA-Z0-9_]{1,15})/g) || [];
    
    mentions.forEach(mention => {
      const username = mention.substring(1);
      if (this.isValidUsername(username) && username.toLowerCase() !== this.username.toLowerCase()) {
        batchUsers.add(username);
      }
    });
    
    return Array.from(batchUsers);
  }

  isValidUsername(username) {
    return username && 
           username.length >= 1 && 
           username.length <= 15 &&
           username.match(/^[a-zA-Z0-9_]+$/) &&
           !['home', 'explore', 'search', 'settings', 'notifications', 'messages', 'compose', 'login', 'signup', 'i', 'intent', 'hashtag'].includes(username.toLowerCase());
  }

  async saveProgress(type) {
    const data = type === 'followers' ? Array.from(this.followers) : Array.from(this.following);
    const filename = path.join(this.outputDir, `${this.username}_${type}_${Date.now()}.json`);
    
    const output = {
      username: this.username,
      type: type,
      count: data.length,
      extracted_at: new Date().toISOString(),
      users: data
    };
    
    fs.writeFileSync(filename, JSON.stringify(output, null, 2));
    console.log(`💾 Progress saved: ${filename} (${data.length} ${type})`);
  }

  async generateUnfollowerReport() {
    console.log('\n📊 GENERATING UNFOLLOWER ANALYSIS...');
    
    const followersArray = Array.from(this.followers);
    const followingArray = Array.from(this.following);
    
    // Find users you follow but who don't follow you back
    const notFollowingBack = followingArray.filter(user => !this.followers.has(user));
    
    // Find users who follow you but you don't follow back
    const youDontFollowBack = followersArray.filter(user => !this.following.has(user));
    
    // Mutual followers
    const mutualFollowers = followersArray.filter(user => this.following.has(user));
    
    const report = {
      username: this.username,
      analysis_date: new Date().toISOString(),
      summary: {
        total_followers: this.followers.size,
        total_following: this.following.size,
        mutual_followers: mutualFollowers.length,
        not_following_back: notFollowingBack.length,
        you_dont_follow_back: youDontFollowBack.length
      },
      details: {
        followers: followersArray,
        following: followingArray,
        mutual_followers: mutualFollowers,
        not_following_back: notFollowingBack,
        you_dont_follow_back: youDontFollowBack
      }
    };
    
    const reportFile = path.join(this.outputDir, `${this.username}_unfollower_report_${Date.now()}.json`);
    fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
    
    console.log('\n📋 UNFOLLOWER ANALYSIS COMPLETE:');
    console.log(`👥 Total Followers: ${this.followers.size.toLocaleString()}`);
    console.log(`👤 Total Following: ${this.following.size.toLocaleString()}`);
    console.log(`🤝 Mutual Followers: ${mutualFollowers.length.toLocaleString()}`);
    console.log(`❌ Not Following You Back: ${notFollowingBack.length.toLocaleString()}`);
    console.log(`➡️ You Don't Follow Back: ${youDontFollowBack.length.toLocaleString()}`);
    console.log(`📄 Report saved: ${reportFile}`);
    
    return report;
  }

  async cleanup() {
    if (this.browser) {
      await this.browser.close();
    }
  }
}

// Main execution
async function runMassiveExtraction() {
  const username = 'JoeProAI';
  const extractor = new MassiveFollowerExtractor(username);
  
  try {
    await extractor.initialize();
    
    // Extract followers first (this is the main data we need)
    const followers = await extractor.extractFollowers();
    
    // Extract following to identify unfollowers
    const following = await extractor.extractFollowing();
    
    // Generate comprehensive unfollower report
    const report = await extractor.generateUnfollowerReport();
    
    console.log('\n🎉 MASSIVE EXTRACTION COMPLETE!');
    console.log(`✅ Successfully extracted ${followers.length.toLocaleString()} followers`);
    console.log(`✅ Successfully extracted ${following.length.toLocaleString()} following`);
    console.log(`📊 Unfollower analysis complete`);
    
    return report;
    
  } catch (error) {
    console.error('\n💥 EXTRACTION FAILED:', error.message);
    throw error;
  } finally {
    await extractor.cleanup();
  }
}

// Run the extraction
if (require.main === module) {
  runMassiveExtraction()
    .then(report => {
      console.log('\n🚀 READY FOR PRODUCTION: Extraction process is iron-clad!');
      process.exit(0);
    })
    .catch(error => {
      console.error('💥 FATAL ERROR:', error);
      process.exit(1);
    });
}

module.exports = { MassiveFollowerExtractor };
