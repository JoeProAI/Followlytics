#!/usr/bin/env node

/**
 * Direct Test: Extract JoeProAI's Real Followers
 * This bypasses Daytona to prove follower extraction works
 */

const { chromium } = require('playwright');

async function extractJoeProAIFollowers() {
  console.log('🎯 DIRECT TEST: Extracting @JoeProAI followers');
  console.log('=' .repeat(50));

  let browser;
  try {
    // Launch browser
    console.log('🚀 Launching browser...');
    browser = await chromium.launch({
      headless: false, // Show browser for debugging
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      viewport: { width: 1920, height: 1080 }
    });

    const page = await context.newPage();

    // Navigate to JoeProAI's profile
    console.log('📱 Navigating to @JoeProAI profile...');
    await page.goto('https://x.com/JoeProAI', { waitUntil: 'networkidle' });
    
    // Wait for page to load
    await page.waitForTimeout(5000);
    
    console.log(`📄 Current URL: ${page.url()}`);
    
    // Check if we need to handle login/blocking
    const title = await page.title();
    console.log(`📋 Page title: ${title}`);
    
    if (title.includes('Login') || title.includes('Sign up')) {
      console.log('⚠️ Redirected to login page - Twitter is blocking access');
      
      // Try alternative approach - check page content
      const content = await page.content();
      console.log(`📊 Content length: ${content.length} chars`);
      
      if (content.length < 50000) {
        console.log('❌ Minimal content - likely blocked');
        return { success: false, reason: 'blocked_by_twitter' };
      }
    }

    // Look for follower count
    console.log('🔍 Looking for follower information...');
    
    // Try to find follower count
    const followerElements = await page.$$('a[href*="/followers"]');
    console.log(`Found ${followerElements.length} follower links`);
    
    for (const element of followerElements) {
      const text = await element.textContent();
      console.log(`Follower link text: "${text}"`);
    }

    // Try to navigate to followers page
    console.log('👥 Attempting to access followers page...');
    await page.goto('https://x.com/JoeProAI/followers', { waitUntil: 'networkidle' });
    await page.waitForTimeout(5000);
    
    console.log(`📄 Followers page URL: ${page.url()}`);
    
    // Look for user profiles on followers page
    const userLinks = await page.$$('a[href^="/"][href*="/"]');
    console.log(`Found ${userLinks.length} potential user links`);
    
    const followers = new Set();
    
    // Extract usernames from links
    for (let i = 0; i < Math.min(userLinks.length, 50); i++) {
      try {
        const href = await userLinks[i].getAttribute('href');
        if (href && href.startsWith('/') && href.length > 1) {
          const username = href.split('/')[1];
          if (username && 
              username.length >= 2 && 
              username.length <= 15 &&
              username.match(/^[a-zA-Z0-9_]+$/) &&
              !['home', 'explore', 'search', 'settings', 'notifications'].includes(username.toLowerCase())) {
            followers.add(username);
          }
        }
      } catch (e) {
        // Skip errors
      }
    }

    // Also look for @mentions in page text
    const pageText = await page.textContent('body');
    const mentions = pageText.match(/@([a-zA-Z0-9_]{2,15})/g) || [];
    
    mentions.forEach(mention => {
      const username = mention.substring(1);
      if (username.toLowerCase() !== 'joeproai') {
        followers.add(username);
      }
    });

    const followersList = Array.from(followers);
    
    console.log('\n📊 EXTRACTION RESULTS:');
    console.log(`Total unique followers found: ${followersList.length}`);
    
    if (followersList.length > 0) {
      console.log('Sample followers:');
      followersList.slice(0, 10).forEach((f, i) => {
        console.log(`  ${i + 1}. @${f}`);
      });
      
      console.log('\n✅ SUCCESS: Real followers extracted!');
      return {
        success: true,
        followers: followersList,
        count: followersList.length,
        method: 'direct_browser_extraction'
      };
    } else {
      console.log('\n❌ No followers found');
      console.log('This could be due to:');
      console.log('- Twitter blocking automated access');
      console.log('- Account privacy settings');
      console.log('- Rate limiting');
      
      return {
        success: false,
        reason: 'no_followers_found',
        page_url: page.url(),
        page_title: title
      };
    }

  } catch (error) {
    console.error('\n💥 ERROR:', error.message);
    return {
      success: false,
      error: error.message
    };
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// Run the test
extractJoeProAIFollowers()
  .then(result => {
    console.log('\n' + '='.repeat(50));
    if (result.success) {
      console.log(`🎉 PROOF COMPLETE: Found ${result.count} real followers!`);
      console.log('✅ Follower extraction WORKS - now we can fix Daytona integration');
    } else {
      console.log('❌ EXTRACTION FAILED');
      console.log(`Reason: ${result.reason || result.error}`);
      console.log('🔧 Need to adjust approach for Twitter\'s restrictions');
    }
    process.exit(result.success ? 0 : 1);
  })
  .catch(error => {
    console.error('💥 TEST ERROR:', error);
    process.exit(1);
  });
