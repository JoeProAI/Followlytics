// Quick test to show actual follower data being extracted
const { Daytona } = require('@daytonaio/sdk');

async function testExtraction() {
  try {
    console.log('🚀 Starting quick follower extraction test...');
    
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
    
    // Create a simple test script that shows real data
    const testScript = `
const puppeteer = require('puppeteer');

(async () => {
  console.log('🚀 Starting QUICK test extraction...');
  
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
  
  // Navigate to JoeProAI followers page
  console.log('📍 Navigating to @JoeProAI followers page...');
  await page.goto('https://twitter.com/JoeProAI/followers', { waitUntil: 'networkidle0' });
  
  // Inject OAuth tokens
  await page.evaluate((token, secret) => {
    localStorage.setItem('twitter_oauth_token', token);
    localStorage.setItem('oauth_token', token);
    localStorage.setItem('oauth_token_secret', secret);
  }, '1767231492793434113-HxoSuS6TdD2lpXH5OzcoAg4XjetBrY', '9NUJaZuwepp2qoZyqUEWdfr23vWYKThtSVJmHBue7X6KC');
  
  // Reload with tokens
  await page.reload({ waitUntil: 'networkidle0' });
  
  console.log('📜 Extracting visible followers (QUICK TEST)...');
  
  // Extract followers from current view
  const followers = await page.evaluate(() => {
    const elements = document.querySelectorAll('[data-testid="cellInnerDiv"], [data-testid="UserCell"]');
    const extracted = [];
    
    console.log('🔍 Found', elements.length, 'potential follower elements');
    
    elements.forEach((element, index) => {
      const links = element.querySelectorAll('a[href*="/"]');
      
      links.forEach(link => {
        if (link.href) {
          const match = link.href.match(/(?:twitter\\.com|x\\.com)\\/([^/?#]+)/);
          if (match && match[1] && 
              match[1] !== 'home' && 
              match[1] !== 'explore' && 
              match[1] !== 'i' &&
              match[1].length > 1) {
            
            // Get display name from the link text or nearby text
            let displayName = link.textContent?.trim() || match[1];
            
            // Try to find a better display name in the element
            const nameElements = element.querySelectorAll('span, div');
            for (const nameEl of nameElements) {
              const text = nameEl.textContent?.trim();
              if (text && text.length > 0 && text.length < 50 && !text.includes('@') && !text.includes('http')) {
                displayName = text;
                break;
              }
            }
            
            extracted.push({
              username: match[1],
              displayName: displayName,
              profileUrl: link.href,
              elementIndex: index
            });
            
            console.log(\`✅ Found follower: @\${match[1]} (\${displayName})\`);
          }
        }
      });
    });
    
    // Remove duplicates
    const unique = [];
    const seen = new Set();
    extracted.forEach(follower => {
      if (!seen.has(follower.username)) {
        seen.add(follower.username);
        unique.push(follower);
      }
    });
    
    console.log(\`📊 Total unique followers found: \${unique.length}\`);
    return unique;
  });
  
  console.log('🎯 QUICK TEST RESULTS:');
  console.log('Total followers found:', followers.length);
  
  if (followers.length > 0) {
    console.log('\\n📝 ACTUAL FOLLOWER DATA:');
    followers.forEach((follower, index) => {
      console.log(\`\${index + 1}. @\${follower.username}\`);
      console.log(\`   Name: \${follower.displayName}\`);
      console.log(\`   URL: \${follower.profileUrl}\`);
      console.log('');
    });
  } else {
    console.log('❌ No followers found - checking page content...');
    
    const pageTitle = await page.title();
    console.log('Page title:', pageTitle);
    
    const pageUrl = await page.url();
    console.log('Current URL:', pageUrl);
    
    // Check if we're on login page
    const isLoginPage = await page.evaluate(() => {
      return document.body.textContent.includes('Sign in') || 
             document.body.textContent.includes('Log in') ||
             document.body.textContent.includes('Enter your phone');
    });
    
    if (isLoginPage) {
      console.log('❌ Redirected to login page - OAuth tokens not working');
    } else {
      console.log('✅ Not on login page - checking for follower elements...');
      
      const allElements = await page.evaluate(() => {
        const selectors = ['[data-testid="cellInnerDiv"]', '[data-testid="UserCell"]', 'article', 'div[role="button"]'];
        let total = 0;
        selectors.forEach(selector => {
          const count = document.querySelectorAll(selector).length;
          console.log(\`Selector "\${selector}": \${count} elements\`);
          total += count;
        });
        return total;
      });
      
      console.log('Total elements found with various selectors:', allElements);
    }
  }
  
  // Save results
  const result = {
    followers: followers,
    followerCount: followers.length,
    scanDate: new Date().toISOString(),
    status: followers.length > 0 ? 'success' : 'no_followers_found',
    testType: 'quick_extraction_test'
  };
  
  require('fs').writeFileSync('/tmp/test_results.json', JSON.stringify(result, null, 2));
  
  await browser.close();
  console.log('🎯 Quick test completed!');
})().catch(console.error);
`;

    console.log('📤 Creating test script...');
    const base64Script = Buffer.from(testScript).toString('base64');
    await sandbox.process.executeCommand(`echo '${base64Script}' | base64 -d > /tmp/test_extraction.js`);
    
    console.log('📦 Installing Puppeteer...');
    await sandbox.process.executeCommand('cd /tmp && npm init -y && npm install puppeteer');
    
    console.log('🚀 Running quick extraction test...');
    const result = await sandbox.process.executeCommand('cd /tmp && node test_extraction.js');
    
    console.log('📊 TEST OUTPUT:');
    console.log(result.result);
    
    console.log('\n📄 Getting saved results...');
    const resultResponse = await sandbox.process.executeCommand('cat /tmp/test_results.json 2>/dev/null || echo "no_results"');
    const resultContent = resultResponse.result || '';
    
    if (resultContent !== 'no_results') {
      console.log('\n🎉 SAVED RESULTS:');
      const savedResults = JSON.parse(resultContent);
      console.log('Status:', savedResults.status);
      console.log('Followers found:', savedResults.followerCount);
      
      if (savedResults.followers && savedResults.followers.length > 0) {
        console.log('\n👥 ACTUAL FOLLOWERS DATA:');
        savedResults.followers.forEach((follower, index) => {
          console.log(`${index + 1}. @${follower.username} (${follower.displayName})`);
        });
      }
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testExtraction();
