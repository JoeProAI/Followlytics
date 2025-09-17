import { Daytona } from '@daytonaio/sdk'

// Initialize Daytona SDK
const daytona = new Daytona({
  apiKey: process.env.DAYTONA_API_KEY,
  apiUrl: process.env.DAYTONA_API_URL || 'https://app.daytona.io/api',
  target: process.env.DAYTONA_TARGET || 'us'
})

export interface SandboxConfig {
  name: string
  repository?: string
  image?: string
  envVars?: Record<string, string>
}

export interface FollowerScanResult {
  followers: Array<{
    username: string
    displayName: string
  }>
  followerCount: number
  scanDate: string
  status: string
  username: string
  strategy?: string
  error?: string
  executionTime?: number
}

export class DaytonaSandboxManager {
  static async createSandbox(config: SandboxConfig): Promise<any> {
    console.log('Creating NEW Daytona sandbox with config:', config)
    
    try {
      console.log('🚀 Creating sandbox using official Daytona SDK...')
      
      // Create sandbox using the official SDK
      const sandbox = await daytona.create({
        language: 'typescript', // Use TypeScript environment
        envVars: config.envVars || {}
      })
      
      console.log('✅ Created NEW sandbox:', sandbox.id)
      return sandbox
      
    } catch (error: unknown) {
      console.error('❌ Sandbox creation failed:', error)
      throw new Error(`Sandbox creation failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  static async setupSandboxEnvironment(sandbox: any): Promise<void> {
    console.log('Setting up sandbox environment...')
    
    try {
      console.log('🔍 Sandbox object keys:', Object.keys(sandbox))
      
      // Wait for sandbox to be fully ready
      console.log('⏳ Waiting for sandbox to be ready...')
      await new Promise(resolve => setTimeout(resolve, 5000)) // Wait 5 seconds
      
      // Install Node.js dependencies using SDK
      console.log('Installing Node.js dependencies...')
      await sandbox.process.executeCommand('npm init -y')
      await sandbox.process.executeCommand('npm install playwright puppeteer --save')
      
      // Install multiple browsers for different strategies
      console.log('Installing Playwright browsers...')
      await sandbox.process.executeCommand('npx playwright install chromium firefox webkit')
      
      // Install Puppeteer browser (separate from Playwright)
      console.log('Installing Puppeteer browser...')
      await sandbox.process.executeCommand('npx puppeteer browsers install chrome')
      
      console.log('✅ Sandbox environment setup complete')
    } catch (error: unknown) {
      console.error('Failed to setup sandbox environment:', error)
      throw new Error(`Environment setup failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  static async executeFollowerScan(
    sandbox: any,
    username: string,
    accessToken: string,
    accessTokenSecret: string
  ): Promise<FollowerScanResult> {
    console.log(`🚀 Starting multi-browser follower scan for @${username}`)

    // Create the multi-browser scanner script inline to avoid build issues
    const scannerScript = `
const fs = require('fs');

// Multi-browser scanning strategies
const strategies = [
  {
    name: 'Playwright-Stealth',
    execute: async () => {
      const { chromium } = require('playwright');
      
      const browser = await chromium.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu',
          '--disable-web-security',
          '--disable-features=VizDisplayCompositor',
          '--disable-background-networking',
          '--disable-background-timer-throttling',
          '--disable-renderer-backgrounding',
          '--disable-backgrounding-occluded-windows',
          '--disable-client-side-phishing-detection',
          '--disable-component-extensions-with-background-pages',
          '--disable-default-apps',
          '--disable-extensions',
          '--disable-features=TranslateUI',
          '--disable-hang-monitor',
          '--disable-ipc-flooding-protection',
          '--disable-popup-blocking',
          '--disable-prompt-on-repost',
          '--disable-sync',
          '--metrics-recording-only',
          '--no-default-browser-check',
          '--no-pings',
          '--password-store=basic',
          '--use-mock-keychain'
        ]
      });
      
      const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        viewport: { width: 1366, height: 768 },
        locale: 'en-US',
        timezoneId: 'America/New_York',
        extraHTTPHeaders: {
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept-Encoding': 'gzip, deflate, br',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
          'Sec-Ch-Ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
          'Sec-Ch-Ua-Mobile': '?0',
          'Sec-Ch-Ua-Platform': '"Windows"',
          'Sec-Fetch-Dest': 'document',
          'Sec-Fetch-Mode': 'navigate',
          'Sec-Fetch-Site': 'none',
          'Sec-Fetch-User': '?1',
          'Upgrade-Insecure-Requests': '1'
        }
      });
      
      const page = await context.newPage();
      
      // Remove webdriver property and other automation indicators
      await page.addInitScript(() => {
        Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
        Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
        Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });
        window.chrome = { runtime: {} };
        Object.defineProperty(navigator, 'permissions', { get: () => undefined });
      });
      
      return { browser, page };
    }
  },
  {
    name: 'Puppeteer-Stealth',
    execute: async () => {
      try {
        const puppeteer = require('puppeteer');
        
        const browser = await puppeteer.launch({
          headless: true,
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--disable-gpu',
            '--disable-web-security',
            '--disable-features=VizDisplayCompositor',
            '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
          ]
        });
        
        const page = await browser.newPage();
        
        // Set viewport and user agent
        await page.setViewport({ width: 1366, height: 768 });
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        
        // Remove automation indicators (Puppeteer compatible)
        await page.evaluateOnNewDocument(() => {
          Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
          Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
          window.chrome = { runtime: {} };
        });
        
        return { browser, page };
      } catch (error) {
        console.log('Puppeteer not available, skipping...');
        throw error;
      }
    }
  },
  {
    name: 'Firefox-Stealth',
    execute: async () => {
      const { firefox } = require('playwright');
      
      const browser = await firefox.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox'
        ]
      });
      
      const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:120.0) Gecko/20100101 Firefox/120.0',
        viewport: { width: 1366, height: 768 },
        locale: 'en-US',
        timezoneId: 'America/New_York'
      });
      
      const page = await context.newPage();
      
      // Remove automation indicators
      await page.addInitScript(() => {
        Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
      });
      
      return { browser, page };
    }
  },
  {
    name: 'Mobile-Simulation',
    execute: async () => {
      const { chromium } = require('playwright');
      
      const browser = await chromium.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
      
      const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1',
        viewport: { width: 375, height: 667 },
        deviceScaleFactor: 2,
        isMobile: true,
        hasTouch: true
      });
      
      const page = await context.newPage();
      return { browser, page };
    }
  }
];

async function scanWithStrategy(strategy, username, accessToken, accessTokenSecret) {
  if (!username || !accessToken || !accessTokenSecret) {
    throw new Error('Missing required environment variables');
  }
  
  // Initialize followers array at function scope to avoid ReferenceError
  const followers = [];
  let browser, page;
  
  try {
    const browserSetup = await strategy.execute();
    browser = browserSetup.browser;
    page = browserSetup.page;
    
    // Inject OAuth tokens (compatible with both Playwright and Puppeteer)
    if (page.addInitScript) {
      // Playwright method
      await page.addInitScript(() => {
        localStorage.setItem('twitter_access_token', '${accessToken}');
        localStorage.setItem('twitter_access_token_secret', '${accessTokenSecret}');
      });
    } else {
      // Puppeteer method
      await page.evaluateOnNewDocument(() => {
        localStorage.setItem('twitter_access_token', '${accessToken}');
        localStorage.setItem('twitter_access_token_secret', '${accessTokenSecret}');
      });
    }
    
    console.log(\`✓ \${strategy.name} browser initialized\`);
    
    // Try multiple URL variations
    const urlVariations = [
      \`https://twitter.com/\${username}/followers\`,
      \`https://x.com/\${username}/followers\`,
      \`https://mobile.twitter.com/\${username}/followers\`,
      \`https://m.twitter.com/\${username}/followers\`
    ];
    
    let pageLoaded = false;
    
    for (const url of urlVariations) {
      try {
        console.log(\`🔍 Trying URL: \${url}\`);
        await page.goto(url, { 
          waitUntil: 'domcontentloaded', // Faster than networkidle
          timeout: 30000 // Reduced timeout
        });
        
        // Check if page loaded successfully
        const pageInfo = await page.evaluate(() => ({
          title: document.title,
          bodyText: document.body.innerText.substring(0, 300)
        }));
        
        if (!pageInfo.bodyText.includes('Something went wrong') && 
            !pageInfo.bodyText.includes('Rate limit exceeded')) {
          console.log(\`✅ Successfully loaded: \${url}\`);
          pageLoaded = true;
          break;
        } else {
          console.log(\`⚠️ Error page detected on \${url}\`);
        }
      } catch (error) {
        console.log(\`❌ Failed to load \${url}: \${error.message}\`);
      }
    }
    
    if (!pageLoaded) {
      throw new Error('All URL variations failed to load');
    }
    
    // Take screenshot for debugging
    await page.screenshot({ path: \`/tmp/\${strategy.name.toLowerCase()}_page.png\` });
    
    // Look for follower elements with comprehensive selectors
    const followerSelectors = [
      '[data-testid="UserCell"]',
      '[data-testid="cellInnerDiv"]',
      'article[data-testid="tweet"]',
      '[role="button"][data-testid="UserCell"]',
      'div[data-testid="UserCell"] div[dir="ltr"]',
      '.css-1dbjc4n[data-testid="UserCell"]',
      'div[aria-label*="Follow"]',
      'a[href*="/"][role="link"]'
    ];
    
    let foundSelector = null;
    for (const selector of followerSelectors) {
      try {
        await page.waitForSelector(selector, { timeout: 8000 });
        foundSelector = selector;
        console.log(\`✓ Found elements with selector: \${selector}\`);
        break;
      } catch (error) {
        console.log(\`Selector \${selector} not found\`);
      }
    }
    
    if (!foundSelector) {
      // Fallback: text-based extraction
      console.log('🔍 Attempting text-based username extraction...');
      const textBasedFollowers = await page.evaluate(() => {
        const pageText = document.body.innerText || '';
        const usernameRegex = /@([a-zA-Z0-9_]{1,15})/g;
        const matches = Array.from(pageText.matchAll(usernameRegex));
        const usernames = matches.map(match => match[1]).filter(username => 
          username && username.length > 2 && !username.includes('test')
        );
        return [...new Set(usernames)].slice(0, 15);
      });
      
      if (textBasedFollowers.length > 0) {
        console.log(\`✅ \${strategy.name} found \${textBasedFollowers.length} usernames via text extraction\`);
        return {
          followers: textBasedFollowers.map(username => ({ username, displayName: username })),
          followerCount: textBasedFollowers.length,
          scanDate: new Date().toISOString(),
          status: 'partial_success',
          username: username,
          strategy: strategy.name,
          note: 'Extracted via text analysis'
        };
      }

      // Extract followers using DOM parsing with scrolling (use existing followers array)
      const maxScrolls = 10; // Increased for more followers
      let consecutiveEmptyScrolls = 0;

      for (let i = 0; i < maxScrolls && consecutiveEmptyScrolls < 3; i++) {
        console.log(\`📜 Starting scroll \${i + 1}/\${maxScrolls}\`);
        
        // Scroll down FIRST to load new content
        await page.evaluate(() => {
          window.scrollTo(0, document.body.scrollHeight);
        });
        
        // Wait for new content to load
        await page.waitForTimeout(2000);
        
        // Extract followers from current view
        const newFollowers = await page.evaluate((selector) => {
          const followerElements = document.querySelectorAll(selector || '[data-testid="UserCell"]');
          const extracted = [];
          
          console.log(\`🔍 Found \${followerElements.length} follower elements to process\`);
          
          followerElements.forEach((element, index) => {
            try {
              let username = null;
              let displayName = null;
              
              // Extract username from links with better parsing
              const usernameLinks = element.querySelectorAll('a[href*="/"]');
              console.log(\`Element \${index}: Found \${usernameLinks.length} links\`);
              
              for (const link of usernameLinks) {
                if (link.href) {
                  console.log(\`  Link href: \${link.href}\`);
                  const match = link.href.match(/(?:twitter\\.com|x\\.com)\\/([^/?#]+)/);
                  if (match && match[1] && 
                      match[1] !== 'home' && 
                      match[1] !== 'explore' && 
                      match[1] !== 'i' && 
                      match[1] !== 'search' &&
                      !match[1].includes('status') &&
                      match[1].length > 1) {
                    username = match[1];
                    console.log(\`  ✅ Extracted username: \${username}\`);
                    break;
                  } else {
                    console.log(\`  ❌ Link rejected: \${match ? match[1] : 'no match'}\`);
                  }
                }
              }
              
              // Extract display name from multiple possible locations
              const nameSelectors = [
                '[data-testid="UserName"] span',
                '[dir="ltr"] span',
                '.css-1jxf684',
                'span[style*="font-weight"]'
              ];
              
              for (const selector of nameSelectors) {
                const nameElement = element.querySelector(selector);
                if (nameElement && nameElement.textContent?.trim()) {
                  displayName = nameElement.textContent.trim();
                  break;
                }
              }
              
              // Only add if we have a valid, unique username
              if (username && username.length > 1) {
                extracted.push({ username, displayName: displayName || username });
                console.log(\`✅ Added follower: \${username} (\${displayName || username})\`);
              } else {
                console.log(\`❌ No valid username found for element \${index}\`);
              }
            } catch (error) {
              console.log(\`❌ Error processing element \${index}:\`, error);
            }
          });
          
          console.log(\`📊 Total extracted: \${extracted.length} followers\`);
          return extracted;
        }, foundSelector);
      
      const existingUsernames = new Set(followers.map(f => f.username));
      const uniqueNewFollowers = newFollowers.filter(f => !existingUsernames.has(f.username));
      
      if (uniqueNewFollowers.length > 0) {
        followers.push(...uniqueNewFollowers);
        consecutiveEmptyScrolls = 0;
        console.log(\`📜 \${strategy.name} scroll \${i + 1}: found \${uniqueNewFollowers.length} new followers (total: \${followers.length})\`);
        
        // Early termination to prevent Daytona API timeout
        if (followers.length >= 100) {
          console.log(\`✅ Good progress: Found \${followers.length} followers, continuing\`);
        }
        if (followers.length >= 200) {
          console.log(\`✅ Substantial result: Found \${followers.length} followers, stopping to avoid timeout\`);
          break;
        }
      } else {
        consecutiveEmptyScrolls++;
        console.log(\`⚠️ No new followers found in scroll \${i + 1}, consecutive empty: \${consecutiveEmptyScrolls}\`);
      }
    }
  }
    console.log(\`✅ \${strategy.name} completed: \${followers.length} followers found\`);
    
    return {
      followers: followers,
      followerCount: followers.length,
      scanDate: new Date().toISOString(),
      status: 'success',
      username: username,
      strategy: strategy.name
    };
    
  } catch (error) {
    console.error(\`❌ Strategy \${strategy.name} failed:\`, error);
    throw error;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

async function scanTwitterFollowers() {
  console.log('🚀 Starting multi-browser Twitter follower scanner...');
  
  // Create debug logging
  const fs = require('fs');
  const logFile = '/tmp/scanner_debug.log';
  
  function logDebug(message) {
    const timestamp = new Date().toISOString();
    const logMessage = \`[\${timestamp}] \${message}\\n\`;
    console.log(message);
    try {
      fs.appendFileSync(logFile, logMessage);
    } catch (e) {
      console.error('Failed to write to log file:', e);
    }
  }
  
  logDebug('🚀 Scanner started');
  logDebug(\`Environment check - USERNAME: \${process.env.TWITTER_USERNAME ? 'SET' : 'NOT SET'}\`);
  logDebug(\`Environment check - ACCESS_TOKEN: \${process.env.TWITTER_ACCESS_TOKEN ? 'SET' : 'NOT SET'}\`);
  logDebug(\`Environment check - ACCESS_TOKEN_SECRET: \${process.env.TWITTER_ACCESS_TOKEN_SECRET ? 'SET' : 'NOT SET'}\`);
  
  // Get credentials from environment variables
  const username = process.env.TWITTER_USERNAME;
  const accessToken = process.env.TWITTER_ACCESS_TOKEN;
  const accessTokenSecret = process.env.TWITTER_ACCESS_TOKEN_SECRET;
  
  const results = [];
  let bestResult = null;
  
  // Try each strategy
  for (const strategy of strategies) {
    try {
      const result = await scanWithStrategy(strategy, username, accessToken, accessTokenSecret);
      results.push(result);
      
      if (!bestResult || result.followerCount > bestResult.followerCount) {
        bestResult = result;
      }
      
      // Stop if we get a good result (100+ followers) to avoid Daytona timeout
      if (result.followerCount >= 100) {
        console.log(\`✅ Good result found with \${result.followerCount} followers, stopping to avoid timeout\`);
        break;
      }
      
      // Continue with other strategies if we don't have enough followers
      if (result.status === 'success' && result.followerCount < 100) {
        console.log(\`⚠️ Partial result with \${result.followerCount} followers, trying other strategies for more\`);
      }
      
    } catch (error) {
      const errorMessage = \`❌ Strategy \${strategy.name} failed: \${error.message}\`;
      logDebug(errorMessage);
      logDebug(\`Error stack: \${error.stack}\`);
      results.push({
        strategy: strategy.name,
        status: 'failed',
        error: error.message,
        followerCount: 0
      });
    }
  }
  
  // Use the best result or create a combined result
  if (bestResult && bestResult.followerCount > 0) {
    console.log(\`📊 Best result from \${bestResult.strategy}: \${bestResult.followerCount} followers\`);
    return bestResult;
  }
  
  // If all strategies failed, return a summary
  console.log('❌ All strategies failed');
  return {
    followers: [],
    followerCount: 0,
    scanDate: new Date().toISOString(),
    status: 'all_strategies_failed',
    username: process.env.TWITTER_USERNAME,
    strategies_attempted: results.length,
    error: 'All browser strategies were blocked by Twitter'
  };
}

// Execute the scan and save results
scanTwitterFollowers()
  .then(result => {
    console.log('📊 Final result:', {
      followerCount: result.followerCount,
      status: result.status,
      username: result.username,
      strategy: result.strategy || 'none'
    });
    
    // Save results to file
    fs.writeFileSync('/tmp/followers_result.json', JSON.stringify(result, null, 2));
    console.log('💾 Results saved to /tmp/followers_result.json');
  })
  .catch(error => {
    console.error('❌ Scanner failed:', error);
    
    // Save error result
    const errorResult = {
      followers: [],
      followerCount: 0,
      scanDate: new Date().toISOString(),
      status: 'error',
      error: error.message,
      username: process.env.TWITTER_USERNAME
    };
    
    fs.writeFileSync('/tmp/followers_result.json', JSON.stringify(errorResult, null, 2));
    process.exit(1);
  });
`;

    console.log('📝 Multi-browser scanner script created')

    // Upload and execute the scanner script using the robust fallback system
    try {
      await this.uploadScriptWithFallback(sandbox, scannerScript, 'twitter-scanner.js')
      console.log('✅ Scanner script uploaded successfully')
    } catch (error: unknown) {
      console.error('❌ Failed to upload scanner script:', error)
      throw new Error(`Script upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }

    console.log('🔐 Starting SIMPLE OAuth authentication for @' + username)
    console.log('⚡ Creating focused scrolling script that actually works...')
    
    // Create a SIMPLE script that focuses ONLY on scrolling and extraction
    const simpleScrollScript = `
const puppeteer = require('puppeteer');

(async () => {
  console.log('🚀 Starting SIMPLE scroll-focused extraction...');
  
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
  
  // Navigate to followers page
  console.log('📍 Navigating to followers page...');
  await page.goto('https://twitter.com/${username}/followers', { waitUntil: 'networkidle0' });
  
  // Inject OAuth tokens
  await page.evaluate((token, secret) => {
    localStorage.setItem('twitter_oauth_token', token);
    localStorage.setItem('oauth_token', token);
    localStorage.setItem('oauth_token_secret', secret);
  }, '${accessToken}', '${accessTokenSecret}');
  
  // Reload with tokens
  await page.reload({ waitUntil: 'networkidle0' });
  
  console.log('📜 Starting aggressive scrolling for 800+ followers...');
  const followers = [];
  const maxScrolls = 30; // Reduced to avoid timeouts but still aggressive
  
  for (let i = 0; i < maxScrolls; i++) {
    console.log(\`📜 Scroll \${i + 1}/\${maxScrolls}\`);
    
    // Extract current followers
    const currentFollowers = await page.evaluate(() => {
      const elements = document.querySelectorAll('[data-testid="cellInnerDiv"], [data-testid="UserCell"]');
      const extracted = [];
      
      elements.forEach(element => {
        const links = element.querySelectorAll('a[href*="/"]');
        links.forEach(link => {
          if (link.href) {
            const match = link.href.match(/(?:twitter\\.com|x\\.com)\\/([^/?#]+)/);
            if (match && match[1] && 
                match[1] !== 'home' && 
                match[1] !== 'explore' && 
                match[1] !== 'i' &&
                match[1].length > 1) {
              extracted.push({
                username: match[1],
                displayName: link.textContent?.trim() || match[1]
              });
            }
          }
        });
      });
      
      return extracted;
    });
    
    // Add unique followers
    const existingUsernames = new Set(followers.map(f => f.username));
    const newFollowers = currentFollowers.filter(f => !existingUsernames.has(f.username));
    followers.push(...newFollowers);
    
    console.log(\`Found \${newFollowers.length} new followers (total: \${followers.length})\`);
    
    // Stop if we have enough
    if (followers.length >= 800) {
      console.log('🎯 Reached 800+ followers target!');
      break;
    }
    
    // Scroll down aggressively
    await page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight);
    });
    
    // Wait for new content (reduced wait time)
    await page.waitForTimeout(1000);
    
    // Stop if no new followers for several scrolls
    if (newFollowers.length === 0 && i > 10) {
      console.log('No new followers found, stopping...');
      break;
    }
  }
  
  console.log(\`✅ Final result: \${followers.length} followers extracted\`);
  
  // Save results
  const result = {
    followers: followers,
    followerCount: followers.length,
    scanDate: new Date().toISOString(),
    status: followers.length > 0 ? 'success' : 'failed',
    username: '${username}',
    strategy: 'Simple-Aggressive-Scroll'
  };
  
  require('fs').writeFileSync('/tmp/followers_result.json', JSON.stringify(result, null, 2));
  
  await browser.close();
  console.log('🎯 Simple scroll extraction completed!');
})().catch(console.error);
`;

    try {
      // Create and run the simple script
      console.log('📤 Creating simple scroll script...')
      const base64Script = Buffer.from(simpleScrollScript).toString('base64')
      await sandbox.process.executeCommand(`echo '${base64Script}' | base64 -d > /tmp/simple_scroll.js`)
      
      // Install puppeteer quickly (with extended timeout)
      console.log('📦 Installing Puppeteer (extended timeout)...')
      await sandbox.process.executeCommand('cd /tmp && npm init -y && npm install puppeteer')
      
      // Run the simple script (with extended timeout)
      console.log('🚀 Running simple scroll extraction (extended timeout)...')
      const result = await sandbox.process.executeCommand('cd /tmp && node simple_scroll.js')
      
      console.log('📊 Simple script output:', result.result)
      
      // Get results
      const resultResponse = await sandbox.process.executeCommand('cat /tmp/followers_result.json')
      const scanResult = JSON.parse(resultResponse.result || '{}')
      
      console.log('✅ Simple scroll completed:', scanResult.followerCount, 'followers')
      
      // Add API verification of actual follower count
      try {
        console.log('🔍 Verifying actual follower count via Twitter API...')
        const verificationScript = `
const https = require('https');
const crypto = require('crypto');

// OAuth 1.0a signature generation
function generateOAuthSignature(method, url, params, consumerSecret, tokenSecret) {
  const sortedParams = Object.keys(params).sort().map(key => \`\${key}=\${encodeURIComponent(params[key])}\`).join('&');
  const baseString = \`\${method}&\${encodeURIComponent(url)}&\${encodeURIComponent(sortedParams)}\`;
  const signingKey = \`\${encodeURIComponent(consumerSecret)}&\${encodeURIComponent(tokenSecret || '')}\`;
  return crypto.createHmac('sha1', signingKey).update(baseString).digest('base64');
}

async function verifyFollowerCount() {
  const consumerKey = 'rR0QYeVEdOabCthwyQ2vxy7ra';
  const consumerSecret = 'yhgT1ayY84BrQ9jg4isLJxPt7GCXWd9lTnxjCleD7HcMyWciRi';
  const accessToken = '${accessToken}';
  const accessTokenSecret = '${accessTokenSecret}';
  
  const method = 'GET';
  const url = 'https://api.twitter.com/1.1/users/show.json';
  
  const oauthParams = {
    oauth_consumer_key: consumerKey,
    oauth_token: accessToken,
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_nonce: crypto.randomBytes(16).toString('hex'),
    oauth_version: '1.0',
    screen_name: '${username}'
  };
  
  const signature = generateOAuthSignature(method, url, oauthParams, consumerSecret, accessTokenSecret);
  oauthParams.oauth_signature = signature;
  
  const authHeader = 'OAuth ' + Object.keys(oauthParams)
    .map(key => \`\${key}="\${encodeURIComponent(oauthParams[key])}"\`)
    .join(', ');
  
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.twitter.com',
      path: \`/1.1/users/show.json?screen_name=\${username}\`,
      method: 'GET',
      headers: {
        'Authorization': authHeader,
        'User-Agent': 'Followlytics/1.0'
      }
    };
    
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const user = JSON.parse(data);
          console.log(\`📊 API Verification - Actual follower count: \${user.followers_count}\`);
          resolve(user.followers_count);
        } catch (e) {
          console.log('❌ API verification failed:', data);
          resolve(null);
        }
      });
    });
    
    req.on('error', (e) => {
      console.log('❌ API request failed:', e.message);
      resolve(null);
    });
    
    req.end();
  });
}

verifyFollowerCount().then(count => {
  if (count) {
    console.log(\`✅ Twitter API confirms: \${count} actual followers\`);
    require('fs').writeFileSync('/tmp/api_verification.json', JSON.stringify({
      actualFollowerCount: count,
      verificationDate: new Date().toISOString()
    }));
  }
}).catch(console.error);
`;

        // Run verification (with extended timeout)
        const verificationBase64 = Buffer.from(verificationScript).toString('base64')
        await sandbox.process.executeCommand(`echo '${verificationBase64}' | base64 -d > /tmp/verify_count.js`)
        await sandbox.process.executeCommand('cd /tmp && node verify_count.js')
        
        // Get verification results
        const verificationResponse = await sandbox.process.executeCommand('cat /tmp/api_verification.json 2>/dev/null || echo "{}"')
        const verification = JSON.parse(verificationResponse.result || '{}')
        
        if (verification.actualFollowerCount) {
          scanResult.apiVerification = {
            actualFollowerCount: verification.actualFollowerCount,
            extractedCount: scanResult.followerCount,
            accuracy: Math.round((scanResult.followerCount / verification.actualFollowerCount) * 100),
            verificationDate: verification.verificationDate
          }
          console.log(`🎯 VERIFICATION: Extracted ${scanResult.followerCount} out of ${verification.actualFollowerCount} actual followers (${scanResult.apiVerification.accuracy}% accuracy)`)
        }
        
      } catch (verificationError) {
        console.log('⚠️ API verification failed, but extraction succeeded:', verificationError)
      }
      
      return scanResult
      
    } catch (error: unknown) {
      console.error('❌ Simple scroll failed:', error)
      return {
        followers: [],
        followerCount: 0,
        scanDate: new Date().toISOString(),
        status: 'simple_scroll_failed',
        username: username,
        error: `Simple scroll failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      }
    }
  }

  // Upload script using Daytona SDK file system operations
  private static async uploadScriptWithFallback(sandbox: any, scriptContent: string, filename: string): Promise<void> {
    console.log(`📤 Uploading script using Daytona SDK file system...`)
    
    try {
      // Create directory for the scanner
      const workDir = 'scanner'
      
      console.log(`📁 Creating directory: ${workDir}`)
      await sandbox.fs.createFolder(workDir, '755')
      
      // Upload the script file using SDK
      console.log(`📄 Uploading script file: ${filename}`)
      const scriptBuffer = Buffer.from(scriptContent, 'utf8')
      await sandbox.fs.uploadFile(scriptBuffer, `${workDir}/${filename}`)
      
      // Verify the file was uploaded
      console.log('✅ Verifying file upload...')
      const files = await sandbox.fs.listFiles(workDir)
      const uploadedFile = files.find((f: any) => f.name === filename)
      if (uploadedFile) {
        console.log(`📄 File size: ${uploadedFile.size} bytes`)
      } else {
        throw new Error('File not found after upload')
      }
      
      // Verify it's valid JavaScript by trying to parse it
      const result = await sandbox.process.executeCommand(`node -c "${workDir}/${filename}"`)
      if (result.exitCode === 0) {
        console.log('✅ File uploaded and verified successfully!')
      } else {
        throw new Error(`JavaScript syntax check failed: ${result.result}`)
      }
      
    } catch (error: unknown) {
      console.error('❌ File upload failed:', error)
      throw new Error(`File upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  private static async performSimpleOAuthExtraction(sandbox: any, username: string, accessToken: string, accessTokenSecret: string): Promise<any> {
    console.log('🔐 Starting OAuth-first Twitter extraction (no heavy GUI setup)...')
    
    try {
      // Skip heavy GUI setup - use lightweight OAuth approach
      console.log('⚡ Using lightweight OAuth authentication approach...')
      
      // Create a SIMPLE script that just uses OAuth tokens with headless Puppeteer
      const oauthScript = `
const puppeteer = require('puppeteer');

(async () => {
  console.log('🔐 Starting SIMPLE OAuth Twitter extraction...');
  
  // Use headless Puppeteer (already installed, no GUI setup needed)
  const browser = await puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage'
    ]
  });
  
  const page = await browser.newPage();
  
  // Set realistic user agent
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
  
  // Navigate to Twitter first to establish domain
  console.log('🌐 Establishing Twitter domain context...');
  await page.goto('https://twitter.com', { waitUntil: 'domcontentloaded' });
  
  // Inject OAuth tokens
  console.log('🔑 Injecting OAuth tokens...');
  await page.evaluate((token, secret) => {
    localStorage.setItem('twitter_oauth_token', token);
    localStorage.setItem('twitter_oauth_token_secret', secret);
    localStorage.setItem('oauth_token', token);
    localStorage.setItem('oauth_token_secret', secret);
    console.log('✅ OAuth tokens injected');
  }, '${accessToken}', '${accessTokenSecret}');
  
  // Navigate directly to followers page
  console.log('📍 Navigating to followers page with OAuth...');
  await page.goto('https://twitter.com/${username}/followers', { 
    waitUntil: 'domcontentloaded',
    timeout: 30000 
  });
  
  // Wait and check page status
  await page.waitForTimeout(3000);
  
  const pageStatus = await page.evaluate(() => ({
    title: document.title,
    hasLogin: !!document.querySelector('input[name="session[username_or_email]"]'),
    hasFollowers: !!document.querySelector('[data-testid="UserCell"]'),
    bodyText: document.body.innerText.substring(0, 300)
  }));
  
  console.log('📋 Page status:', pageStatus);
  
  // Extract followers (even if limited)
  const followers = [];
  
  try {
    // Wait for any follower elements
    await page.waitForSelector('[data-testid="UserCell"], [data-testid="cellInnerDiv"]', { timeout: 10000 });
    
    console.log('📜 Extracting visible followers...');
    const extractedFollowers = await page.evaluate(() => {
      const elements = document.querySelectorAll('[data-testid="UserCell"], [data-testid="cellInnerDiv"]');
      const results = [];
      
      elements.forEach(element => {
        try {
          const usernameLink = element.querySelector('a[href*="/"]');
          const nameSpan = element.querySelector('span[dir="ltr"]');
          
          if (usernameLink && usernameLink.href) {
            const match = usernameLink.href.match(/(?:twitter\\.com|x\\.com)\\/([^/?#]+)/);
            if (match && match[1] && match[1] !== 'home' && match[1] !== 'explore') {
              results.push({
                username: match[1],
                displayName: nameSpan ? nameSpan.textContent.trim() : match[1]
              });
            }
          }
        } catch (e) {
          // Skip problematic elements
        }
      });
      
      return results;
    });
    
    followers.push(...extractedFollowers);
    console.log(\`✅ Extracted \${followers.length} followers\`);
    
  } catch (e) {
    console.log('⚠️ No follower elements found, checking for login requirement...');
  }
  
  // Save results
  const result = {
    followers: followers,
    followerCount: followers.length,
    scanDate: new Date().toISOString(),
    status: followers.length > 0 ? 'oauth_success' : 'needs_login',
    username: '${username}',
    strategy: 'Simple-OAuth',
    pageStatus: pageStatus
  };
  
  require('fs').writeFileSync('/tmp/followers_result.json', JSON.stringify(result, null, 2));
  
  await browser.close();
  console.log('🎯 Simple OAuth extraction completed!');
})().catch(console.error);
`;
      
      // Save and execute the simple OAuth script using command approach (more reliable)
      console.log('📤 Creating OAuth script via command...')
      const base64Script = Buffer.from(oauthScript).toString('base64')
      await sandbox.process.executeCommand(`echo '${base64Script}' | base64 -d > /tmp/oauth_extract.js`)
      
      // Verify the script was created
      const verifyResult = await sandbox.process.executeCommand('ls -la /tmp/oauth_extract.js')
      console.log('📋 Script verification:', verifyResult.result)
      
      // Install puppeteer in /tmp directory
      console.log('📦 Installing Puppeteer in /tmp...')
      await sandbox.process.executeCommand('cd /tmp && npm init -y && npm install puppeteer')
      
      // Run the script
      console.log('🚀 Executing simple OAuth extraction...')
      const extractResult = await sandbox.process.executeCommand('cd /tmp && node oauth_extract.js')
      
      console.log('📊 Extraction output:', extractResult.result)
      
      // Read the results using command instead of SDK
      const resultResponse = await sandbox.process.executeCommand('cat /tmp/followers_result.json')
      const result = JSON.parse(resultResponse.result || '{}')
      
      console.log('✅ Simple OAuth extraction completed: ' + result.followerCount + ' followers found')
      console.log('📋 Page status was:', result.pageStatus)
      
      return result
      
    } catch (error: unknown) {
      console.error('❌ GUI automation failed:', error)
      throw new Error('GUI automation failed: ' + (error instanceof Error ? error.message : 'Unknown error'))
    }
  }

  static async cleanupSandbox(sandbox: any): Promise<void> {
    try {
      console.log('🧹 Cleaning up sandbox:', sandbox.id)
      await sandbox.delete()
      console.log('✅ Sandbox deleted successfully')
    } catch (error: unknown) {
      console.error('❌ Sandbox cleanup failed:', error)
      // Don't throw error for cleanup failures
    }
  }
}

export default DaytonaSandboxManager
