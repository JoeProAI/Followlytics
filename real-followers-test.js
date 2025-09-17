// Real followers test using x.com URL like before
const { Daytona } = require('@daytonaio/sdk');

async function realFollowersTest() {
  try {
    console.log('🚀 Starting REAL followers test on x.com...');
    
    const daytona = new Daytona({
      apiKey: process.env.DAYTONA_API_KEY || 'dtn_30f485a820500d1c393ac4bfcac84be84ce23f87d79b5ba5a8e20f364d4ba567',
      apiUrl: process.env.DAYTONA_API_URL || 'https://app.daytona.io/api'
    });

    console.log('📦 Creating test sandbox...');
    const sandbox = await daytona.create({
      language: 'javascript',
      envVars: {}
    });
    
    console.log('✅ Sandbox created:', sandbox.id);
    
    // Create script using x.com URL like we did before
    const realFollowersScript = `
const puppeteer = require('puppeteer');

(async () => {
  console.log('🚀 Starting REAL followers extraction on X.com...');
  
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
  
  // Navigate to X.com followers page (the current Twitter URL)
  console.log('📍 Navigating to https://x.com/JoeProAI/followers...');
  await page.goto('https://x.com/JoeProAI/followers', { waitUntil: 'networkidle0' });
  
  // Inject OAuth tokens
  console.log('🔐 Injecting OAuth tokens...');
  await page.evaluate((token, secret) => {
    localStorage.setItem('twitter_oauth_token', token);
    localStorage.setItem('oauth_token', token);
    localStorage.setItem('oauth_token_secret', secret);
    // Also try cookies
    document.cookie = \`auth_token=\${token}; domain=.x.com; path=/\`;
    document.cookie = \`oauth_token=\${token}; domain=.x.com; path=/\`;
  }, '1767231492793434113-HxoSuS6TdD2lpXH5OzcoAg4XjetBrY', '9NUJaZuwepp2qoZyqUEWdfr23vWYKThtSVJmHBue7X6KC');
  
  // Reload with tokens
  console.log('🔄 Reloading page with OAuth tokens...');
  await page.reload({ waitUntil: 'networkidle0' });
  
  // Wait for content to load
  await page.waitFor(5000);
  
  // Check current page status
  const pageTitle = await page.title();
  const currentUrl = await page.url();
  console.log('📄 Page title:', pageTitle);
  console.log('🌐 Current URL:', currentUrl);
  
  // Check if we're authenticated
  const isAuthenticated = await page.evaluate(() => {
    const bodyText = document.body.textContent || '';
    const isLoginPage = bodyText.includes('Sign in to X') || 
                       bodyText.includes('Log in') || 
                       bodyText.includes('Enter your phone');
    return !isLoginPage;
  });
  
  console.log('🔐 Authentication status:', isAuthenticated ? 'SUCCESS' : 'FAILED');
  
  if (!isAuthenticated) {
    console.log('❌ Not authenticated - trying alternative approach...');
    
    // Try going to home first, then followers
    console.log('🏠 Trying to go to home page first...');
    await page.goto('https://x.com/home', { waitUntil: 'networkidle0' });
    await page.waitFor(3000);
    
    console.log('👥 Now navigating to followers page...');
    await page.goto('https://x.com/JoeProAI/followers', { waitUntil: 'networkidle0' });
    await page.waitFor(3000);
  }
  
  console.log('📜 Extracting followers from current page...');
  
  // Extract followers using the method that worked before
  const followers = await page.evaluate(() => {
    // Try multiple selectors that work on X.com
    const selectors = [
      '[data-testid="UserCell"]',
      '[data-testid="cellInnerDiv"]',
      'article[data-testid="tweet"]',
      '[role="button"][data-testid*="user"]'
    ];
    
    let allElements = [];
    selectors.forEach(selector => {
      const elements = document.querySelectorAll(selector);
      console.log(\`Selector "\${selector}": \${elements.length} elements\`);
      allElements.push(...Array.from(elements));
    });
    
    const extracted = [];
    const seen = new Set();
    
    allElements.forEach((element, index) => {
      // Look for profile links
      const links = element.querySelectorAll('a[href*="/"]');
      
      links.forEach(link => {
        if (link.href) {
          // Match X.com profile URLs
          const match = link.href.match(/(?:x\\.com|twitter\\.com)\\/([^/?#]+)$/);
          if (match && match[1]) {
            const username = match[1];
            
            // Filter out non-user pages and the account owner
            if (username !== 'JoeProAI' && 
                username !== 'home' && 
                username !== 'explore' && 
                username !== 'i' && 
                username !== 'messages' &&
                username !== 'notifications' &&
                username !== 'search' &&
                username.length > 1 &&
                !username.includes('status') &&
                !seen.has(username)) {
              
              seen.add(username);
              
              // Get display name
              let displayName = username;
              const textContent = link.textContent?.trim();
              if (textContent && textContent.length > 0 && textContent.length < 50) {
                displayName = textContent;
              }
              
              // Look for better display name in parent elements
              let parent = element;
              for (let i = 0; i < 3; i++) {
                const spans = parent.querySelectorAll('span');
                for (const span of spans) {
                  const spanText = span.textContent?.trim();
                  if (spanText && spanText.length > 0 && spanText.length < 50 && 
                      !spanText.includes('@') && !spanText.includes('http') &&
                      spanText !== username) {
                    displayName = spanText;
                    break;
                  }
                }
                parent = parent.parentElement;
                if (!parent) break;
              }
              
              extracted.push({
                username: username,
                displayName: displayName,
                profileUrl: link.href
              });
              
              console.log(\`✅ Found follower: @\${username} (\${displayName})\`);
            }
          }
        }
      });
    });
    
    console.log(\`📊 Total unique followers extracted: \${extracted.length}\`);
    return extracted;
  });
  
  console.log('🎯 REAL FOLLOWERS TEST RESULTS:');
  console.log('Total followers found:', followers.length);
  
  if (followers.length > 0) {
    console.log('\\n👥 ACTUAL FOLLOWER DATA:');
    followers.forEach((follower, index) => {
      console.log(\`\${index + 1}. @\${follower.username} - \${follower.displayName}\`);
    });
    
    // Save results
    const result = {
      followers: followers,
      followerCount: followers.length,
      scanDate: new Date().toISOString(),
      status: 'success',
      url: 'https://x.com/JoeProAI/followers',
      authenticated: true
    };
    
    require('fs').writeFileSync('/tmp/real_followers_results.json', JSON.stringify(result, null, 2));
    console.log('\\n💾 Results saved to /tmp/real_followers_results.json');
    
  } else {
    console.log('❌ No followers found');
    
    // Debug info
    const debugInfo = await page.evaluate(() => {
      return {
        bodyText: document.body.textContent?.substring(0, 500),
        title: document.title,
        url: window.location.href,
        userCells: document.querySelectorAll('[data-testid="UserCell"]').length,
        cellInnerDivs: document.querySelectorAll('[data-testid="cellInnerDiv"]').length,
        allLinks: document.querySelectorAll('a').length
      };
    });
    
    console.log('🔍 Debug info:', JSON.stringify(debugInfo, null, 2));
  }
  
  await browser.close();
  console.log('🎯 Real followers test completed!');
})().catch(console.error);
`;

    console.log('📤 Creating real followers test script...');
    const base64Script = Buffer.from(realFollowersScript).toString('base64');
    await sandbox.process.executeCommand(`echo '${base64Script}' | base64 -d > /tmp/real_followers_test.js`);
    
    console.log('📦 Installing Puppeteer...');
    await sandbox.process.executeCommand('cd /tmp && npm init -y && npm install puppeteer');
    
    console.log('🚀 Running real followers test on x.com...');
    const result = await sandbox.process.executeCommand('cd /tmp && node real_followers_test.js');
    
    console.log('📊 REAL FOLLOWERS TEST OUTPUT:');
    console.log(result.result);
    
    console.log('\n📄 Getting saved results...');
    const resultResponse = await sandbox.process.executeCommand('cat /tmp/real_followers_results.json 2>/dev/null || echo "no_results"');
    const resultContent = resultResponse.result || '';
    
    if (resultContent !== 'no_results') {
      console.log('\n🎉 SAVED REAL FOLLOWERS RESULTS:');
      const savedResults = JSON.parse(resultContent);
      console.log('Status:', savedResults.status);
      console.log('Followers found:', savedResults.followerCount);
      console.log('URL used:', savedResults.url);
      
      if (savedResults.followers && savedResults.followers.length > 0) {
        console.log('\n👥 REAL FOLLOWERS DATA:');
        savedResults.followers.forEach((follower, index) => {
          console.log(`${index + 1}. @${follower.username} - ${follower.displayName}`);
        });
      }
    }
    
  } catch (error) {
    console.error('❌ Real followers test failed:', error.message);
  }
}

realFollowersTest();
