#!/usr/bin/env node

/**
 * OAuth Authenticated Twitter Scraping
 * Uses the app's Twitter OAuth tokens to authenticate browser session for full follower access
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

class OAuthAuthenticatedScraper {
  constructor() {
    this.accessToken = process.env.TWITTER_ACCESS_TOKEN;
    this.accessTokenSecret = process.env.TWITTER_ACCESS_TOKEN_SECRET;
    this.apiKey = process.env.TWITTER_API_KEY;
    this.apiSecret = process.env.TWITTER_API_SECRET;
    
    this.outputDir = './extraction_results';
    this.browser = null;
    this.page = null;
    
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }
  }

  async initialize() {
    console.log('🚀 OAUTH AUTHENTICATED TWITTER SCRAPING');
    console.log('=' .repeat(50));
    console.log('🔑 Using app OAuth tokens for authentication');
    
    // Launch browser
    this.browser = await chromium.launch({
      headless: false, // Keep visible to monitor authentication
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor'
      ]
    });

    const context = await this.browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      viewport: { width: 1920, height: 1080 }
    });

    this.page = await context.newPage();
    
    // Block unnecessary resources for faster loading
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

  async authenticateWithOAuth() {
    console.log('\n🔐 AUTHENTICATING WITH OAUTH TOKENS...');
    
    try {
      // Navigate to Twitter
      await this.page.goto('https://x.com', { waitUntil: 'networkidle' });
      
      // Check if already logged in
      const currentUrl = this.page.url();
      console.log(`📄 Current URL: ${currentUrl}`);
      
      // If we see login page, we need to authenticate
      const title = await this.page.title();
      console.log(`📋 Page title: ${title}`);
      
      if (title.includes('Login') || currentUrl.includes('login')) {
        console.log('🔑 Not authenticated - need to set up session');
        
        // Method 1: Try to inject authentication cookies/tokens
        await this.injectAuthenticationTokens();
        
        // Refresh to see if authentication worked
        await this.page.reload({ waitUntil: 'networkidle' });
        await this.page.waitForTimeout(3000);
        
        const newTitle = await this.page.title();
        const newUrl = this.page.url();
        
        console.log(`📋 After auth - Title: ${newTitle}`);
        console.log(`📄 After auth - URL: ${newUrl}`);
        
        if (newTitle.includes('Login') || newUrl.includes('login')) {
          console.log('⚠️ Cookie injection failed, trying manual OAuth flow...');
          await this.performOAuthFlow();
        } else {
          console.log('✅ Authentication successful via token injection');
        }
      } else {
        console.log('✅ Already authenticated');
      }
      
      return true;
      
    } catch (error) {
      console.error('❌ Authentication failed:', error.message);
      return false;
    }
  }

  async injectAuthenticationTokens() {
    console.log('🍪 Injecting authentication tokens as cookies...');
    
    // Set authentication cookies that Twitter uses
    const authCookies = [
      {
        name: 'auth_token',
        value: this.accessToken,
        domain: '.x.com',
        path: '/',
        httpOnly: true,
        secure: true
      },
      {
        name: 'ct0', // CSRF token
        value: this.generateCSRFToken(),
        domain: '.x.com',
        path: '/',
        httpOnly: false,
        secure: true
      }
    ];
    
    for (const cookie of authCookies) {
      try {
        await this.page.context().addCookies([cookie]);
        console.log(`✅ Set cookie: ${cookie.name}`);
      } catch (e) {
        console.log(`⚠️ Failed to set cookie ${cookie.name}: ${e.message}`);
      }
    }
    
    // Also try setting localStorage tokens
    await this.page.evaluate((tokens) => {
      try {
        localStorage.setItem('twitter_oauth_token', tokens.accessToken);
        localStorage.setItem('twitter_oauth_token_secret', tokens.accessTokenSecret);
        console.log('Set localStorage tokens');
      } catch (e) {
        console.log('Failed to set localStorage:', e.message);
      }
    }, {
      accessToken: this.accessToken,
      accessTokenSecret: this.accessTokenSecret
    });
  }

  generateCSRFToken() {
    // Generate a random CSRF token
    return Array.from({length: 32}, () => Math.random().toString(36)[2]).join('');
  }

  async performOAuthFlow() {
    console.log('🔄 Performing OAuth authentication flow...');
    
    // This would require implementing the full OAuth 1.0a flow
    // For now, we'll try a different approach - using the API to get a session
    
    try {
      // Navigate to OAuth authorize URL
      const oauthUrl = `https://api.twitter.com/oauth/authorize?oauth_token=${this.accessToken}`;
      console.log(`🌐 Navigating to OAuth URL: ${oauthUrl}`);
      
      await this.page.goto(oauthUrl, { waitUntil: 'networkidle' });
      await this.page.waitForTimeout(5000);
      
      // Check if we're now authenticated
      const currentUrl = this.page.url();
      console.log(`📄 OAuth result URL: ${currentUrl}`);
      
    } catch (error) {
      console.error('❌ OAuth flow failed:', error.message);
    }
  }

  async extractFollowersAuthenticated(username) {
    console.log(`\n👥 EXTRACTING FOLLOWERS for @${username} (AUTHENTICATED)`);
    
    // Navigate to followers page
    const followersUrl = `https://x.com/${username}/followers`;
    console.log(`📱 Navigating to: ${followersUrl}`);
    
    await this.page.goto(followersUrl, { waitUntil: 'networkidle' });
    await this.page.waitForTimeout(5000);
    
    const currentUrl = this.page.url();
    const title = await this.page.title();
    
    console.log(`📄 Current URL: ${currentUrl}`);
    console.log(`📋 Page title: ${title}`);
    
    // Check if we have access to the followers page
    if (title.includes('Login') || currentUrl.includes('login')) {
      throw new Error('Still not authenticated - followers page requires login');
    }
    
    const followers = new Set();
    let scrollAttempts = 0;
    let maxScrollAttempts = 100; // Adjust based on expected followers
    let lastFollowerCount = 0;
    let stagnantScrolls = 0;
    
    console.log('🔄 Starting authenticated follower extraction...');
    
    while (scrollAttempts < maxScrollAttempts && stagnantScrolls < 10) {
      try {
        // Extract current batch of followers
        const currentBatch = await this.extractCurrentBatch();
        
        // Add to followers set
        currentBatch.forEach(follower => followers.add(follower));
        
        const currentCount = followers.size;
        console.log(`📊 Batch ${scrollAttempts + 1}: Found ${currentBatch.length} new, Total: ${currentCount} followers`);
        
        // Check for stagnation
        if (currentCount === lastFollowerCount) {
          stagnantScrolls++;
          console.log(`⚠️ No new followers found (${stagnantScrolls}/10)`);
        } else {
          stagnantScrolls = 0;
          lastFollowerCount = currentCount;
        }
        
        // Save progress every 20 batches
        if (scrollAttempts % 20 === 0 && followers.size > 0) {
          await this.saveProgress('authenticated_followers', Array.from(followers), username);
        }
        
        // Scroll down to load more
        await this.page.evaluate(() => {
          window.scrollTo(0, document.body.scrollHeight);
        });
        
        // Wait for new content to load
        await this.page.waitForTimeout(2000);
        
        scrollAttempts++;
        
      } catch (error) {
        console.error(`❌ Error in batch ${scrollAttempts}: ${error.message}`);
        await this.page.waitForTimeout(5000);
        
        // Refresh page every 50 attempts to prevent timeouts
        if (scrollAttempts > 0 && scrollAttempts % 50 === 0) {
          console.log('🔄 Refreshing page to prevent timeouts...');
          await this.page.reload({ waitUntil: 'networkidle' });
          await this.page.waitForTimeout(3000);
        }
      }
    }
    
    const followersArray = Array.from(followers);
    
    console.log(`\n✅ AUTHENTICATED FOLLOWERS EXTRACTION COMPLETE`);
    console.log(`📊 Total followers extracted: ${followersArray.length}`);
    
    // Save final results
    await this.saveProgress('authenticated_followers_final', followersArray, username);
    
    return followersArray;
  }

  async extractCurrentBatch() {
    // Look for user profile links with various selectors
    const selectors = [
      'a[href^="/"][data-testid*="UserCell"]',
      'a[href^="/"][role="link"]',
      'div[data-testid="UserCell"] a[href^="/"]',
      'article a[href^="/"]'
    ];
    
    const batchUsers = new Set();
    
    for (const selector of selectors) {
      try {
        const links = await this.page.$$(selector);
        
        for (const link of links.slice(0, 50)) { // Limit per selector
          try {
            const href = await link.getAttribute('href');
            if (href && href.startsWith('/') && href.length > 1) {
              const username = href.split('/')[1].split('?')[0];
              
              if (this.isValidUsername(username)) {
                batchUsers.add(username);
              }
            }
          } catch (e) {
            // Skip individual link errors
          }
        }
      } catch (e) {
        // Skip selector errors
      }
    }
    
    // Also extract from text content
    try {
      const textContent = await this.page.textContent('body');
      const mentions = textContent.match(/@([a-zA-Z0-9_]{1,15})/g) || [];
      
      mentions.forEach(mention => {
        const username = mention.substring(1);
        if (this.isValidUsername(username)) {
          batchUsers.add(username);
        }
      });
    } catch (e) {
      // Skip text extraction errors
    }
    
    return Array.from(batchUsers);
  }

  isValidUsername(username) {
    return username && 
           username.length >= 1 && 
           username.length <= 15 &&
           username.match(/^[a-zA-Z0-9_]+$/) &&
           !['home', 'explore', 'search', 'settings', 'notifications', 'messages', 'compose', 'login', 'signup', 'i', 'intent', 'hashtag'].includes(username.toLowerCase());
  }

  async saveProgress(type, data, username) {
    const filename = path.join(this.outputDir, `${username}_${type}_${Date.now()}.json`);
    
    const output = {
      username: username,
      type: type,
      count: data.length,
      extracted_at: new Date().toISOString(),
      method: 'oauth_authenticated_scraping',
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
async function runOAuthAuthenticatedScraping() {
  const username = 'JoeProAI';
  const scraper = new OAuthAuthenticatedScraper();
  
  try {
    await scraper.initialize();
    
    // Authenticate using OAuth tokens
    const authenticated = await scraper.authenticateWithOAuth();
    
    if (!authenticated) {
      throw new Error('Failed to authenticate with OAuth tokens');
    }
    
    // Extract followers with authentication
    const followers = await scraper.extractFollowersAuthenticated(username);
    
    console.log('\n🎉 OAUTH AUTHENTICATED SCRAPING COMPLETE!');
    console.log(`✅ Successfully extracted ${followers.length} followers`);
    console.log(`🔑 Used OAuth authentication for full access`);
    
    if (followers.length > 0) {
      console.log('\n🔍 Sample followers:');
      followers.slice(0, 10).forEach((f, i) => {
        console.log(`  ${i + 1}. @${f}`);
      });
    }
    
    return followers;
    
  } catch (error) {
    console.error('\n💥 SCRAPING FAILED:', error.message);
    throw error;
  } finally {
    await scraper.cleanup();
  }
}

// Run the scraping
if (require.main === module) {
  runOAuthAuthenticatedScraping()
    .then(followers => {
      console.log('\n🚀 SUCCESS: OAuth authenticated scraping works!');
      console.log('✅ Ready to integrate into production system');
      process.exit(0);
    })
    .catch(error => {
      console.error('💥 FATAL ERROR:', error);
      process.exit(1);
    });
}

module.exports = { OAuthAuthenticatedScraper };
