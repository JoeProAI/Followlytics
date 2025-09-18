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
    // This script will run independently and save results to a file
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
  
  // ENHANCED APPROACH: Navigate to X.com first, then authenticate, then go to followers
  console.log('🔐 Step 1: Going to X.com and injecting authentication...');
  await page.goto('https://x.com', { waitUntil: 'networkidle0' });
  
  // Inject OAuth tokens into the main X.com domain first
  await page.evaluate((token, secret) => {
    localStorage.setItem('twitter_oauth_token', token);
    localStorage.setItem('oauth_token', token);
    localStorage.setItem('oauth_token_secret', secret);
    
    // Also try setting cookies
    document.cookie = \`auth_token=\${token}; domain=.x.com; path=/\`;
    document.cookie = \`oauth_token=\${token}; domain=.x.com; path=/\`;
    
    console.log('✅ OAuth tokens injected on x.com domain');
  }, '${accessToken}', '${accessTokenSecret}');
  
  console.log('📍 Step 2: Now navigating to followers page with authentication...');
  await page.goto('https://x.com/${username}/followers', { waitUntil: 'networkidle0' });
  
  // Wait for page to load and check if we're on the right page
  await new Promise(resolve => setTimeout(resolve, 5000));
  
  // Verify we're on the followers page
  const pageCheck = await page.evaluate(() => {
    const currentUrl = window.location.href;
    const pageTitle = document.title;
    const isFollowersPage = currentUrl.includes('/followers');
    const hasLoginLinks = document.body.textContent?.includes('Log in') || false;
    
    return {
      currentUrl,
      pageTitle,
      isFollowersPage,
      hasLoginLinks,
      authenticated: !hasLoginLinks
    };
  });
  
  console.log(\`📊 Page verification: \${JSON.stringify(pageCheck, null, 2)}\`);
  
  if (!pageCheck.isFollowersPage) {
    console.log('❌ Not on followers page, trying direct navigation...');
    await page.goto('https://x.com/${username}/followers', { waitUntil: 'networkidle0' });
    await new Promise(resolve => setTimeout(resolve, 3000));
  }
  
  if (pageCheck.hasLoginLinks) {
    console.log('⚠️ Still seeing login links, authentication may not be working');
  } else {
    console.log('✅ Authentication appears to be working');
  }
  
  console.log('📜 Starting aggressive scrolling for ALL 872 followers...');
  const followers = [];
  const maxScrolls = 50; // Increased to get ALL followers (872 total)
  
  for (let i = 0; i < maxScrolls; i++) {
    console.log(\`📜 Scroll \${i + 1}/\${maxScrolls}\`);
    
    // Take screenshot to see what's on the page
    const screenshotPath = \`/tmp/screenshot_scroll_\${i + 1}.png\`;
    await page.screenshot({ 
      path: screenshotPath, 
      fullPage: false,
      clip: { x: 0, y: 0, width: 1200, height: 800 }
    });
    console.log(\`📸 Screenshot saved: \${screenshotPath}\`);
    
    // Debug: Check what elements are actually on the page
    const pageDebug = await page.evaluate(() => {
      const userCells = document.querySelectorAll('[data-testid="UserCell"]');
      const cellInnerDivs = document.querySelectorAll('[data-testid="cellInnerDiv"]');
      const allLinks = document.querySelectorAll('a[href*="/"]');
      const profileLinks = [];
      
      allLinks.forEach(link => {
        if (link.href && (link.href.includes('x.com/') || link.href.includes('twitter.com/'))) {
          profileLinks.push({
            href: link.href,
            text: link.textContent?.trim()
          });
        }
      });
      
      return {
        userCells: userCells.length,
        cellInnerDivs: cellInnerDivs.length,
        totalLinks: allLinks.length,
        profileLinks: profileLinks.slice(0, 10), // First 10 profile links
        pageTitle: document.title,
        currentUrl: window.location.href
      };
    });
    
    console.log(\`🔍 Page debug info:\`, JSON.stringify(pageDebug, null, 2));
    
    // Extract ONLY followers (not posts, not profile content)
    const currentFollowers = await page.evaluate((targetUsername) => {
      const extracted = [];
      
      // Look specifically for UserCell elements (these should be followers)
      const userCells = document.querySelectorAll('[data-testid="UserCell"]');
      console.log(\`🔍 Found \${userCells.length} UserCell elements (these should be followers)\`);
      
      userCells.forEach((cell, index) => {
        // Look for profile links within each UserCell
        const profileLinks = cell.querySelectorAll('a[href*="x.com/"]');
        
        profileLinks.forEach(link => {
          if (link.href) {
            // Match clean profile URLs (not status, photo, etc.)
            const match = link.href.match(/x\\.com\\/([^/?#]+)$/);
            if (match && match[1]) {
              const username = match[1];
              
              // Filter out non-user pages and the target user
              if (username !== targetUsername &&
                  username !== 'home' && 
                  username !== 'explore' && 
                  username !== 'i' &&
                  username !== 'messages' &&
                  username !== 'notifications' &&
                  username !== 'search' &&
                  username !== 'hashtag' &&
                  username.length > 1 &&
                  !username.includes('status') &&
                  !username.includes('photo') &&
                  !username.includes('header_photo')) {
                
                // Get display name from the cell
                let displayName = username;
                const nameSpans = cell.querySelectorAll('span');
                for (const span of nameSpans) {
                  const spanText = span.textContent?.trim();
                  if (spanText && 
                      spanText.length > 0 && 
                      spanText.length < 50 && 
                      !spanText.includes('@') && 
                      !spanText.includes('http') &&
                      !spanText.includes('Follow') &&
                      !spanText.includes('Following') &&
                      !spanText.includes('Followers') &&
                      spanText !== username) {
                    displayName = spanText;
                    break;
                  }
                }
                
                extracted.push({
                  username: username,
                  displayName: displayName
                });
                
                console.log(\`✅ Found follower: @\${username} (\${displayName})\`);
              }
            }
          }
        });
      });
      
      // If no UserCells found, check if we're on the wrong page
      if (userCells.length === 0) {
        const currentUrl = window.location.href;
        const pageTitle = document.title;
        console.log(\`❌ No UserCell elements found. Current URL: \${currentUrl}\`);
        console.log(\`❌ Page title: \${pageTitle}\`);
        
        // Check if we're on profile page instead of followers page
        if (!currentUrl.includes('/followers')) {
          console.log(\`❌ ERROR: Not on followers page! Currently on: \${currentUrl}\`);
        }
      }
      
      console.log(\`📊 Extracted \${extracted.length} followers from this scroll\`);
      return extracted;
    }, '${username}');
    
    // Add unique followers
    const existingUsernames = new Set(followers.map(f => f.username));
    const newFollowers = currentFollowers.filter(f => !existingUsernames.has(f.username));
    followers.push(...newFollowers);
    
    console.log(\`Found \${newFollowers.length} new followers (total: \${followers.length})\`);
    
    // Stop if we have all followers
    if (followers.length >= 872) {
      console.log('🎯 Reached ALL 872 followers target!');
      break;
    }
    
    // Scroll down aggressively
    await page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight);
    });
    
    // Wait for new content (reduced wait time) - using setTimeout
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Stop if no new followers for several scrolls (but keep trying longer)
    if (newFollowers.length === 0 && i > 15) {
      console.log('No new followers found after 15+ scrolls, stopping...');
      break;
    }
  }
  
  console.log(\`📈 Final result: \${followers.length} followers extracted\`);
  
  // List all screenshots taken
  const screenshotList = [];
  for (let i = 1; i <= maxScrolls; i++) {
    const screenshotPath = \`/tmp/screenshot_scroll_\${i}.png\`;
    try {
      const fs = require('fs');
      if (fs.existsSync(screenshotPath)) {
        screenshotList.push(screenshotPath);
      }
    } catch (e) {
      // Screenshot doesn't exist, skip
    }
  }
  
  // Save results with screenshot info
  const result = {
    followers: followers,
    followerCount: followers.length,
    scanDate: new Date().toISOString(),
    status: followers.length > 0 ? 'success' : 'failed',
    username: '${username}',
    strategy: 'Simple-Aggressive-Scroll-Background-With-Screenshots',
    screenshots: screenshotList,
    totalScreenshots: screenshotList.length
  };
  
  require('fs').writeFileSync('/tmp/followers_result.json', JSON.stringify(result, null, 2));
  
  await browser.close();
  console.log(' Simple scroll extraction completed!');
  console.log('🎯 Simple scroll extraction completed!');
})().catch(console.error);
`;

    try {
      // Create and run the simple script
      console.log('📤 Creating simple scroll script...')
      const base64Script = Buffer.from(simpleScrollScript).toString('base64')
      await sandbox.process.executeCommand(`echo '${base64Script}' | base64 -d > /tmp/simple_scroll.js`)
      
      // Install puppeteer quickly 
      console.log('📦 Installing Puppeteer...')
      await sandbox.process.executeCommand('cd /tmp && npm init -y && npm install puppeteer')
      
      // Start the script in background and return immediately to avoid Vercel timeout
      console.log('🚀 Starting background scroll extraction...')
      
      // Create a background runner script that runs independently
      const backgroundRunner = `
#!/bin/bash
cd /tmp
echo "$(date): Starting background extraction" >> /tmp/extraction.log
node simple_scroll.js >> /tmp/extraction.log 2>&1 &
echo "$(date): Background process started" >> /tmp/extraction.log
`;
      
      const runnerBase64 = Buffer.from(backgroundRunner).toString('base64')
      await sandbox.process.executeCommand(`echo '${runnerBase64}' | base64 -d > /tmp/run_background.sh`)
      await sandbox.process.executeCommand('chmod +x /tmp/run_background.sh')
      
      // Start background process and return immediately
      await sandbox.process.executeCommand('/tmp/run_background.sh')
      
      console.log('✅ Background extraction started - returning immediately to avoid timeout')
      
      // Return a "in_progress" result immediately
      const scanResult = {
        followers: [],
        followerCount: 0,
        scanDate: new Date().toISOString(),
        status: 'extraction_started',
        username: username,
        strategy: 'Simple-Aggressive-Scroll-Background',
        message: 'Extraction started in background - check back in a few minutes',
        sandboxId: sandbox.id
      }
      
      console.log('🎯 Returning immediately to avoid Vercel timeout - extraction running in background')
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
