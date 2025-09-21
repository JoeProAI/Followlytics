// Test if user OAuth tokens can access X followers page in browser
const { chromium } = require('playwright');

async function testUserOAuthAccess() {
  console.log('🔍 Testing user OAuth token access to X followers page...');
  
  // These would be the real user OAuth tokens from Firebase
  // For testing, you'd need to get actual tokens from a user's x_tokens document
  const testTokens = {
    accessToken: 'USER_ACCESS_TOKEN_HERE', // Real user token from Firebase
    accessTokenSecret: 'USER_ACCESS_TOKEN_SECRET_HERE', // Real user secret from Firebase
    username: 'TEST_USERNAME_HERE' // Username to test followers access
  };
  
  console.log('⚠️ NOTE: You need to replace the test tokens above with real user OAuth tokens from Firebase');
  console.log('📝 To get real tokens, check the x_tokens collection in Firebase for a user who has completed X OAuth');
  
  if (testTokens.accessToken === 'USER_ACCESS_TOKEN_HERE') {
    console.log('❌ Please update testTokens with real user OAuth tokens before running this test');
    return;
  }
  
  const browser = await chromium.launch({ headless: false }); // Show browser for debugging
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  });
  const page = await context.newPage();
  
  try {
    console.log('🌐 Loading X.com...');
    await page.goto('https://x.com', { waitUntil: 'domcontentloaded', timeout: 30000 });
    
    console.log('🔑 Injecting user OAuth tokens...');
    await page.evaluate((tokens) => {
      const { accessToken, accessTokenSecret } = tokens;
      
      // Set OAuth tokens in localStorage
      localStorage.setItem('twitter_access_token', accessToken);
      localStorage.setItem('twitter_access_token_secret', accessTokenSecret);
      
      // Set authentication cookies for X domains
      document.cookie = `auth_token=${accessToken}; domain=.x.com; path=/; secure; samesite=none`;
      document.cookie = `ct0=${accessToken}; domain=.x.com; path=/; secure; samesite=lax`;
      
      console.log('✅ User OAuth tokens injected into browser session');
      return { success: true, tokenLength: accessToken ? accessToken.length : 0 };
    }, testTokens);
    
    console.log('📸 Taking screenshot after token injection...');
    await page.screenshot({ path: 'oauth_injection_test.png', fullPage: true });
    
    console.log('🎯 Attempting to access followers page...');
    const followersUrl = `https://x.com/${testTokens.username}/followers`;
    await page.goto(followersUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    
    console.log('📸 Taking screenshot of followers page...');
    await page.screenshot({ path: 'followers_page_test.png', fullPage: true });
    
    // Check if we successfully reached followers page
    const currentUrl = page.url();
    const pageTitle = await page.title();
    
    console.log('📊 Results:');
    console.log(`  Current URL: ${currentUrl}`);
    console.log(`  Page Title: ${pageTitle}`);
    
    if (currentUrl.includes('/followers') && !currentUrl.includes('/login')) {
      console.log('✅ SUCCESS: User OAuth tokens successfully accessed followers page!');
      console.log('🎯 This confirms user-level OAuth tokens work for browser authentication');
    } else if (currentUrl.includes('/login') || currentUrl.includes('/i/flow/login')) {
      console.log('❌ FAILED: Redirected to login page - OAuth tokens not working for browser auth');
      console.log('⚠️ This means we need a different authentication approach');
    } else {
      console.log('⚠️ UNCLEAR: Reached different page - need to investigate');
    }
    
  } catch (error) {
    console.error('❌ Error testing OAuth access:', error.message);
  } finally {
    await browser.close();
  }
}

console.log('🧪 X OAuth Access Test');
console.log('📋 This test verifies if user OAuth tokens can access followers pages in browser');
console.log('');

testUserOAuthAccess();
