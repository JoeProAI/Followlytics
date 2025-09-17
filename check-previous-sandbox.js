// Check the previous sandbox that was working
const { Daytona } = require('@daytonaio/sdk');

const previousSandboxId = '52917708-d2f8-44dc-9995-24b4e3b12663'; // The one that found 22 followers

async function checkPreviousSandbox() {
  try {
    console.log('🔍 Checking previous sandbox that found 22 followers...');
    console.log('Sandbox ID:', previousSandboxId);
    
    const daytona = new Daytona({
      apiKey: process.env.DAYTONA_API_KEY || 'dtn_30f485a820500d1c393ac4bfcac84be84ce23f87d79b5ba5a8e20f364d4ba567',
      apiUrl: process.env.DAYTONA_API_URL || 'https://app.daytona.io/api'
    });

    console.log('📡 Connecting to previous sandbox...');
    const sandbox = await daytona.get(previousSandboxId);
    
    if (!sandbox) {
      console.log('❌ Previous sandbox not found or expired');
      return;
    }
    
    console.log('✅ Connected to previous sandbox');
    console.log('Sandbox state:', sandbox.state);
    
    // Create a quick script to extract followers on x.com with the working method
    const quickScript = `
const puppeteer = require('puppeteer');

(async () => {
  console.log('🚀 Quick extraction on x.com with working method...');
  
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
  
  // Use x.com URL
  console.log('📍 Going to https://x.com/JoeProAI/followers...');
  await page.goto('https://x.com/JoeProAI/followers', { waitUntil: 'networkidle0' });
  
  // Inject OAuth tokens
  await page.evaluate((token, secret) => {
    localStorage.setItem('twitter_oauth_token', token);
    localStorage.setItem('oauth_token', token);
    localStorage.setItem('oauth_token_secret', secret);
  }, '1767231492793434113-HxoSuS6TdD2lpXH5OzcoAg4XjetBrY', '9NUJaZuwepp2qoZyqUEWdfr23vWYKThtSVJmHBue7X6KC');
  
  await page.reload({ waitUntil: 'networkidle0' });
  await page.waitFor(3000);
  
  // Extract using the method that found 22 followers before
  const followers = await page.evaluate(() => {
    const elements = document.querySelectorAll('[data-testid="cellInnerDiv"], [data-testid="UserCell"]');
    const extracted = [];
    
    console.log('🔍 Found', elements.length, 'elements to check');
    
    elements.forEach((element, index) => {
      const links = element.querySelectorAll('a[href*="/"]');
      links.forEach(link => {
        if (link.href) {
          const match = link.href.match(/(?:x\\.com|twitter\\.com)\\/([^/?#]+)$/);
          if (match && match[1] && 
              match[1] !== 'home' && 
              match[1] !== 'explore' && 
              match[1] !== 'i' &&
              match[1] !== 'JoeProAI' &&
              match[1].length > 1) {
            
            let displayName = link.textContent?.trim() || match[1];
            
            extracted.push({
              username: match[1],
              displayName: displayName,
              profileUrl: link.href
            });
            
            console.log(\`✅ Found: @\${match[1]} (\${displayName})\`);
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
    
    return unique;
  });
  
  console.log(\`🎯 FOUND \${followers.length} REAL FOLLOWERS:\`);
  followers.forEach((follower, index) => {
    console.log(\`\${index + 1}. @\${follower.username} - \${follower.displayName}\`);
  });
  
  // Save results
  const result = {
    followers: followers,
    followerCount: followers.length,
    scanDate: new Date().toISOString(),
    status: 'success',
    method: 'quick_x_com_extraction'
  };
  
  require('fs').writeFileSync('/tmp/quick_results.json', JSON.stringify(result, null, 2));
  
  await browser.close();
  console.log('✅ Quick extraction completed!');
})().catch(console.error);
`;

    console.log('📤 Creating quick extraction script...');
    const base64Script = Buffer.from(quickScript).toString('base64');
    await sandbox.process.executeCommand(`echo '${base64Script}' | base64 -d > /tmp/quick_extract.js`);
    
    console.log('🚀 Running quick extraction...');
    const result = await sandbox.process.executeCommand('cd /tmp && node quick_extract.js');
    
    console.log('📊 QUICK EXTRACTION OUTPUT:');
    console.log(result.result);
    
    // Get results
    const resultResponse = await sandbox.process.executeCommand('cat /tmp/quick_results.json 2>/dev/null || echo "no_results"');
    const resultContent = resultResponse.result || '';
    
    if (resultContent !== 'no_results') {
      console.log('\n🎉 QUICK RESULTS:');
      const quickResults = JSON.parse(resultContent);
      console.log('✅ Status:', quickResults.status);
      console.log('👥 Followers found:', quickResults.followerCount);
      
      if (quickResults.followers && quickResults.followers.length > 0) {
        console.log('\n📝 REAL FOLLOWERS FROM X.COM:');
        quickResults.followers.forEach((follower, index) => {
          console.log(`${index + 1}. @${follower.username} - ${follower.displayName}`);
        });
      }
    }
    
  } catch (error) {
    console.error('❌ Failed to check previous sandbox:', error.message);
  }
}

checkPreviousSandbox();
