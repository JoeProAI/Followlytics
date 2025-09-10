#!/usr/bin/env node

/**
 * Enhanced Follower Extraction with Proper Twitter Pagination
 * Handles Twitter's infinite scroll and lazy loading mechanisms
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

class EnhancedFollowerExtractor {
  constructor() {
    this.outputDir = './extraction_results';
    this.browser = null;
    this.page = null;
    
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }
  }

  async initialize() {
    console.log('🚀 ENHANCED FOLLOWER EXTRACTION');
    console.log('=' .repeat(50));
    
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
    
    // Don't block resources - we need full page functionality for pagination
    console.log('✅ Browser initialized with full resource loading');
  }

  async extractFollowersWithPagination(username) {
    console.log(`\n👥 EXTRACTING ALL FOLLOWERS for @${username}`);
    
    const followersUrl = `https://x.com/${username}/followers`;
    console.log(`📱 Navigating to: ${followersUrl}`);
    
    await this.page.goto(followersUrl, { waitUntil: 'networkidle', timeout: 60000 });
    await this.page.waitForTimeout(5000);
    
    const currentUrl = this.page.url();
    const title = await this.page.title();
    
    console.log(`📄 Current URL: ${currentUrl}`);
    console.log(`📋 Page title: ${title}`);
    
    if (title.includes('Login') || currentUrl.includes('login')) {
      throw new Error('Authentication required - followers page not accessible');
    }
    
    const followers = new Set();
    let scrollAttempts = 0;
    let maxScrollAttempts = 500; // Increased for large follower counts
    let consecutiveNoNewFollowers = 0;
    let lastFollowerCount = 0;
    
    console.log('🔄 Starting enhanced pagination extraction...');
    
    // Wait for initial followers to load
    await this.waitForFollowersToLoad();
    
    while (scrollAttempts < maxScrollAttempts && consecutiveNoNewFollowers < 20) {
      try {
        // Extract current visible followers
        const currentBatch = await this.extractVisibleFollowers();
        
        // Add new followers
        const initialSize = followers.size;
        currentBatch.forEach(follower => followers.add(follower));
        const newFollowersFound = followers.size - initialSize;
        
        console.log(`📊 Scroll ${scrollAttempts + 1}: +${newFollowersFound} new, Total: ${followers.size} followers`);
        
        // Check for stagnation
        if (followers.size === lastFollowerCount) {
          consecutiveNoNewFollowers++;
          console.log(`⚠️ No new followers (${consecutiveNoNewFollowers}/20)`);
        } else {
          consecutiveNoNewFollowers = 0;
          lastFollowerCount = followers.size;
        }
        
        // Save progress periodically
        if (scrollAttempts % 50 === 0 && followers.size > 0) {
          await this.saveProgress('enhanced_followers_progress', Array.from(followers), username);
        }
        
        // Enhanced scrolling with multiple techniques
        await this.performEnhancedScroll();
        
        // Wait for new content with loading detection
        await this.waitForNewContent();
        
        scrollAttempts++;
        
        // Check if we've reached the expected follower count
        if (followers.size >= 800) { // Close to your 867 followers
          console.log(`🎯 Approaching target follower count (${followers.size}/867)`);
        }
        
      } catch (error) {
        console.error(`❌ Error in scroll ${scrollAttempts}: ${error.message}`);
        
        // Recovery strategies
        await this.page.waitForTimeout(3000);
        
        // Refresh page every 100 attempts
        if (scrollAttempts > 0 && scrollAttempts % 100 === 0) {
          console.log('🔄 Refreshing page for better loading...');
          await this.page.reload({ waitUntil: 'networkidle' });
          await this.waitForFollowersToLoad();
        }
      }
    }
    
    const followersArray = Array.from(followers);
    
    console.log(`\n✅ ENHANCED EXTRACTION COMPLETE`);
    console.log(`📊 Total followers extracted: ${followersArray.length}`);
    console.log(`🎯 Target was 867 followers`);
    console.log(`📈 Success rate: ${((followersArray.length / 867) * 100).toFixed(1)}%`);
    
    // Save final results
    await this.saveProgress('enhanced_followers_final', followersArray, username);
    
    return followersArray;
  }

  async waitForFollowersToLoad() {
    console.log('⏳ Waiting for followers to load...');
    
    try {
      // Wait for follower elements to appear
      await this.page.waitForSelector('[data-testid="UserCell"], article[data-testid="tweet"]', { timeout: 30000 });
      
      // Wait a bit more for dynamic content
      await this.page.waitForTimeout(3000);
      
      console.log('✅ Followers loaded');
    } catch (error) {
      console.log('⚠️ Timeout waiting for followers, continuing anyway');
    }
  }

  async extractVisibleFollowers() {
    // Multiple strategies to find follower elements
    const strategies = [
      // Strategy 1: UserCell components
      async () => {
        const cells = await this.page.$$('[data-testid="UserCell"]');
        const users = [];
        
        for (const cell of cells) {
          try {
            const links = await cell.$$('a[href^="/"]');
            for (const link of links) {
              const href = await link.getAttribute('href');
              if (href && href.startsWith('/')) {
                const username = href.split('/')[1].split('?')[0];
                if (this.isValidUsername(username)) {
                  users.push(username);
                  break; // One username per cell
                }
              }
            }
          } catch (e) {
            // Skip errors
          }
        }
        
        return users;
      },
      
      // Strategy 2: Profile links in articles
      async () => {
        const articles = await this.page.$$('article');
        const users = [];
        
        for (const article of articles) {
          try {
            const links = await article.$$('a[href^="/"][role="link"]');
            for (const link of links) {
              const href = await link.getAttribute('href');
              if (href && href.startsWith('/')) {
                const username = href.split('/')[1].split('?')[0];
                if (this.isValidUsername(username)) {
                  users.push(username);
                  break;
                }
              }
            }
          } catch (e) {
            // Skip errors
          }
        }
        
        return users;
      },
      
      // Strategy 3: All profile links
      async () => {
        const links = await this.page.$$('a[href^="/"]');
        const users = [];
        
        for (const link of links.slice(0, 200)) { // Limit to prevent timeout
          try {
            const href = await link.getAttribute('href');
            if (href && href.startsWith('/')) {
              const username = href.split('/')[1].split('?')[0];
              if (this.isValidUsername(username)) {
                users.push(username);
              }
            }
          } catch (e) {
            // Skip errors
          }
        }
        
        return users;
      }
    ];
    
    const allUsers = new Set();
    
    // Run all strategies
    for (let i = 0; i < strategies.length; i++) {
      try {
        const users = await strategies[i]();
        users.forEach(user => allUsers.add(user));
        console.log(`   Strategy ${i + 1}: Found ${users.length} users`);
      } catch (error) {
        console.log(`   Strategy ${i + 1}: Failed - ${error.message}`);
      }
    }
    
    return Array.from(allUsers);
  }

  async performEnhancedScroll() {
    // Multiple scrolling techniques to trigger loading
    
    // Technique 1: Scroll to bottom
    await this.page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight);
    });
    
    await this.page.waitForTimeout(1000);
    
    // Technique 2: Scroll by viewport height
    await this.page.evaluate(() => {
      window.scrollBy(0, window.innerHeight);
    });
    
    await this.page.waitForTimeout(500);
    
    // Technique 3: Trigger scroll events
    await this.page.evaluate(() => {
      const event = new Event('scroll', { bubbles: true });
      window.dispatchEvent(event);
      document.body.dispatchEvent(event);
    });
  }

  async waitForNewContent() {
    // Wait for new content to load with multiple indicators
    
    try {
      // Wait for loading indicators to disappear
      await this.page.waitForFunction(() => {
        const loadingElements = document.querySelectorAll('[data-testid="spinner"], .loading, [aria-label*="Loading"]');
        return loadingElements.length === 0;
      }, { timeout: 5000 });
    } catch (e) {
      // Continue if no loading indicators found
    }
    
    // Wait for network to be idle
    try {
      await this.page.waitForLoadState('networkidle', { timeout: 3000 });
    } catch (e) {
      // Continue if network doesn't idle
    }
    
    // Standard wait
    await this.page.waitForTimeout(2000);
  }

  isValidUsername(username) {
    return username && 
           username.length >= 1 && 
           username.length <= 15 &&
           username.match(/^[a-zA-Z0-9_]+$/) &&
           !['home', 'explore', 'search', 'settings', 'notifications', 'messages', 'compose', 'login', 'signup', 'i', 'intent', 'hashtag', 'status'].includes(username.toLowerCase());
  }

  async saveProgress(type, data, username) {
    const filename = path.join(this.outputDir, `${username}_${type}_${Date.now()}.json`);
    
    const output = {
      username: username,
      type: type,
      count: data.length,
      extracted_at: new Date().toISOString(),
      method: 'enhanced_pagination_extraction',
      followers: data
    };
    
    fs.writeFileSync(filename, JSON.stringify(output, null, 2));
    console.log(`💾 Progress saved: ${filename} (${data.length} followers)`);
  }

  async cleanup() {
    if (this.browser) {
      await this.browser.close();
    }
  }
}

// Main execution
async function runEnhancedExtraction() {
  const username = 'JoeProAI';
  const extractor = new EnhancedFollowerExtractor();
  
  try {
    await extractor.initialize();
    
    const followers = await extractor.extractFollowersWithPagination(username);
    
    console.log('\n🎉 ENHANCED EXTRACTION COMPLETE!');
    console.log(`✅ Extracted ${followers.length} followers`);
    
    if (followers.length > 26) {
      console.log('🚀 SUCCESS: Broke through pagination barrier!');
    }
    
    if (followers.length > 0) {
      console.log('\n🔍 Sample followers:');
      followers.slice(0, 15).forEach((f, i) => {
        console.log(`  ${i + 1}. @${f}`);
      });
    }
    
    return followers;
    
  } catch (error) {
    console.error('\n💥 EXTRACTION FAILED:', error.message);
    throw error;
  } finally {
    await extractor.cleanup();
  }
}

// Run the extraction
if (require.main === module) {
  runEnhancedExtraction()
    .then(followers => {
      if (followers.length >= 100) {
        console.log('\n🎯 BREAKTHROUGH: Successfully extracted large follower list!');
        console.log('✅ Pagination system is working - ready for production');
      } else {
        console.log('\n⚠️ Still limited followers - may need further pagination improvements');
      }
      process.exit(0);
    })
    .catch(error => {
      console.error('💥 FATAL ERROR:', error);
      process.exit(1);
    });
}

module.exports = { EnhancedFollowerExtractor };
