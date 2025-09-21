// Test OAuth token injection and Twitter authentication directly
const { Daytona } = require('@daytonaio/sdk');
const fs = require('fs');

const daytona = new Daytona({
  apiKey: process.env.DAYTONA_API_KEY || 'dtn_30f485a820500d1c393ac4bfcac84be84ce23f87d79b5ba5a8e20f364d4ba567'
});

async function testOAuthInjection() {
  let sandbox = null;
  
  try {
    console.log('🚀 Creating test sandbox for OAuth injection...');
    
    // Create sandbox
    sandbox = await daytona.create({
      name: `oauth-test-${Date.now()}`,
      image: 'node:18',
      language: 'javascript'
    });
    
    console.log(`✅ Sandbox created: ${sandbox.id}`);
    
    // Wait for sandbox to be ready
    console.log('⏳ Waiting for sandbox to start...');
    await new Promise(resolve => setTimeout(resolve, 10000));
    
    // Install dependencies
    console.log('📦 Installing dependencies...');
    const installResult = await sandbox.process.executeCommand('npm install playwright');
    console.log('Install result:', installResult.exitCode === 0 ? 'Success' : 'Failed');
    
    // Install Playwright browsers
    console.log('🌐 Installing Playwright browsers...');
    const browserResult = await sandbox.process.executeCommand('npx playwright install chromium');
    console.log('Browser install result:', browserResult.exitCode === 0 ? 'Success' : 'Failed');
    
    // Create test script with OAuth injection
    const testScript = `
const { chromium } = require('playwright');
const fs = require('fs');

console.log('🔐 Testing OAuth token injection...');

// Test OAuth tokens (these are example tokens - replace with real ones for testing)
const accessToken = 'test_access_token_123';
const accessTokenSecret = 'test_access_token_secret_456';
const testUsername = 'JoeProAI';

async function takeScreenshot(page, step, description) {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = \`/tmp/test_\${step}_\${timestamp}.png\`;
    await page.screenshot({ path: filename, fullPage: true });
    console.log(\`📸 Screenshot: \${step} - \${description}\`);
    
    const debugData = {
      step: step,
      description: description,
      timestamp: timestamp,
      url: page.url(),
      title: await page.title()
    };
    
    fs.writeFileSync(\`/tmp/test_\${step}_\${timestamp}.json\`, JSON.stringify(debugData, null, 2));
    return filename;
  } catch (error) {
    console.log(\`⚠️ Screenshot failed: \${error.message}\`);
    return null;
  }
}

(async () => {
  try {
    console.log('🚀 Launching browser for OAuth test...');
    
    const browser = await chromium.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor'
      ]
    });
    
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    });
    
    const page = await context.newPage();
    
    await takeScreenshot(page, '01_browser_start', 'Browser launched');
    
    console.log('🌐 Testing Twitter URL access...');
    
    // Try multiple Twitter URLs
    const twitterUrls = [
      'https://x.com',
      'https://twitter.com',
      'https://mobile.twitter.com'
    ];
    
    let successfulUrl = null;
    
    for (const url of twitterUrls) {
      try {
        console.log(\`🎯 Trying: \${url}\`);
        
        await page.goto(url, { 
          waitUntil: 'domcontentloaded',
          timeout: 60000 
        });
        
        console.log(\`✅ Successfully loaded: \${page.url()}\`);
        successfulUrl = url;
        break;
        
      } catch (urlError) {
        console.log(\`❌ Failed: \${url} - \${urlError.message}\`);
        await page.waitForTimeout(2000);
      }
    }
    
    if (!successfulUrl) {
      throw new Error('Failed to load any Twitter URL');
    }
    
    await takeScreenshot(page, '02_twitter_loaded', \`Twitter loaded: \${successfulUrl}\`);
    
    console.log('🔑 Injecting OAuth tokens...');
    
    // Inject OAuth tokens
    await page.evaluate((accessToken, accessTokenSecret) => {
      // Set OAuth tokens in localStorage
      localStorage.setItem('twitter_access_token', accessToken);
      localStorage.setItem('twitter_access_token_secret', accessTokenSecret);
      
      // Set authentication cookies for both domains
      document.cookie = \`auth_token=\${accessToken}; domain=.twitter.com; path=/; secure; samesite=none\`;
      document.cookie = \`auth_token=\${accessToken}; domain=.x.com; path=/; secure; samesite=none\`;
      
      // Additional authentication cookies that Twitter might use
      document.cookie = \`ct0=\${accessToken}; domain=.twitter.com; path=/; secure; samesite=lax\`;
      document.cookie = \`ct0=\${accessToken}; domain=.x.com; path=/; secure; samesite=lax\`;
      
      console.log('✅ OAuth tokens injected');
      return {
        localStorage: Object.keys(localStorage).length,
        cookies: document.cookie.length
      };
    }, accessToken, accessTokenSecret);
    
    await takeScreenshot(page, '03_oauth_injected', 'OAuth tokens injected');
    
    console.log('🎯 Testing followers page access...');
    
    // Try to access followers page
    const followersUrls = [
      \`https://x.com/\${testUsername}/followers\`,
      \`https://twitter.com/\${testUsername}/followers\`,
      \`https://mobile.twitter.com/\${testUsername}/followers\`
    ];
    
    let followersPageLoaded = false;
    
    for (const url of followersUrls) {
      try {
        console.log(\`🔍 Trying followers URL: \${url}\`);
        
        await page.goto(url, { 
          waitUntil: 'domcontentloaded',
          timeout: 60000 
        });
        
        const finalUrl = page.url();
        console.log(\`✅ Followers page loaded: \${finalUrl}\`);
        
        await page.waitForTimeout(5000); // Wait for page to stabilize
        
        followersPageLoaded = true;
        break;
        
      } catch (urlError) {
        console.log(\`❌ Failed followers URL: \${url} - \${urlError.message}\`);
        await page.waitForTimeout(2000);
      }
    }
    
    await takeScreenshot(page, '04_followers_attempt', followersPageLoaded ? 'Followers page loaded' : 'Followers page failed');
    
    // Check authentication status
    const authStatus = await page.evaluate(() => {
      const body = document.body.textContent || '';
      const url = window.location.href;
      
      return {
        currentUrl: url,
        pageTitle: document.title,
        isLoginPage: url.includes('/login') || body.includes('Sign in to X') || body.includes('Log in'),
        isFollowersPage: url.includes('/followers'),
        hasFollowerElements: document.querySelectorAll('[data-testid="UserCell"]').length,
        bodyTextPreview: body.substring(0, 500),
        localStorage: Object.keys(localStorage).length,
        cookies: document.cookie.length
      };
    });
    
    console.log('🔍 Authentication Status:');
    console.log(\`  Current URL: \${authStatus.currentUrl}\`);
    console.log(\`  Page Title: \${authStatus.pageTitle}\`);
    console.log(\`  Is Login Page: \${authStatus.isLoginPage}\`);
    console.log(\`  Is Followers Page: \${authStatus.isFollowersPage}\`);
    console.log(\`  Follower Elements: \${authStatus.hasFollowerElements}\`);
    console.log(\`  LocalStorage Items: \${authStatus.localStorage}\`);
    console.log(\`  Cookies Length: \${authStatus.cookies}\`);
    
    // Save detailed results
    const testResults = {
      status: followersPageLoaded && !authStatus.isLoginPage ? 'success' : 'failed',
      successfulTwitterUrl: successfulUrl,
      followersPageLoaded: followersPageLoaded,
      authStatus: authStatus,
      timestamp: new Date().toISOString()
    };
    
    fs.writeFileSync('/tmp/oauth_test_results.json', JSON.stringify(testResults, null, 2));
    
    await takeScreenshot(page, '05_final_status', \`Test completed: \${testResults.status}\`);
    
    await browser.close();
    
    console.log(\`🎉 OAuth injection test completed: \${testResults.status}\`);
    
  } catch (error) {
    console.error('❌ OAuth test failed:', error.message);
    
    const errorResult = {
      status: 'error',
      error: error.message,
      timestamp: new Date().toISOString()
    };
    
    fs.writeFileSync('/tmp/oauth_test_results.json', JSON.stringify(errorResult, null, 2));
  }
})();
`;

    console.log('📝 Uploading OAuth test script...');
    await sandbox.process.executeCommand(`cat > oauth_test.js << 'EOF'
${testScript}
EOF`);
    
    console.log('🚀 Running OAuth injection test...');
    const testResult = await sandbox.process.executeCommand('node oauth_test.js');
    
    console.log('📊 Test Results:');
    console.log('Exit code:', testResult.exitCode);
    console.log('Output:', testResult.result);
    
    // Get test results
    console.log('📋 Retrieving test results...');
    const resultsCmd = await sandbox.process.executeCommand('cat /tmp/oauth_test_results.json 2>/dev/null || echo "No results file"');
    if (resultsCmd.exitCode === 0 && !resultsCmd.result.includes('No results file')) {
      console.log('🎯 OAuth Test Results:');
      try {
        const results = JSON.parse(resultsCmd.result);
        console.log(JSON.stringify(results, null, 2));
        
        // Save results locally
        fs.writeFileSync(`oauth_test_results_${Date.now()}.json`, resultsCmd.result);
        console.log('💾 Results saved locally');
      } catch (parseError) {
        console.log('❌ Failed to parse results');
      }
    }
    
    // Get screenshots
    console.log('📸 Retrieving screenshots...');
    const screenshotList = await sandbox.process.executeCommand('find /tmp -name "test_*.png" | sort');
    if (screenshotList.exitCode === 0 && screenshotList.result.trim()) {
      const screenshots = screenshotList.result.split('\n').filter(f => f.trim());
      
      for (const screenshot of screenshots) {
        try {
          const screenshotData = await sandbox.process.executeCommand(`base64 "${screenshot}"`);
          if (screenshotData.exitCode === 0) {
            const base64Data = screenshotData.result.replace(/\n/g, '');
            const buffer = Buffer.from(base64Data, 'base64');
            const filename = `oauth_test_${screenshot.split('/').pop()}`;
            fs.writeFileSync(filename, buffer);
            console.log(`📸 Screenshot saved: ${filename}`);
          }
        } catch (screenshotError) {
          console.log(`❌ Failed to save screenshot: ${screenshot}`);
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    // Cleanup sandbox
    if (sandbox) {
      try {
        console.log('🧹 Cleaning up test sandbox...');
        await daytona.delete(sandbox.id);
        console.log('✅ Test sandbox cleaned up');
      } catch (cleanupError) {
        console.log('⚠️ Cleanup failed:', cleanupError.message);
      }
    }
  }
}

testOAuthInjection().catch(console.error);
