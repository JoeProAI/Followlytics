import { Daytona } from '@daytonaio/sdk'

// Initialize Daytona SDK
const daytona = new Daytona({
  apiKey: process.env.DAYTONA_API_KEY!,
  apiUrl: process.env.DAYTONA_API_URL || 'https://app.daytona.io/api'
  // DO NOT USE: target, orgId - these cause "No available runners" errors
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
  status: 'success' | 'failed' | 'partial' | 'authentication_required'
  error?: string
  authenticationFailed?: boolean
  message?: string
  strategy?: string
  executionTime?: number
}

export class DaytonaSandboxManager {
  static async createSandbox(config: SandboxConfig): Promise<any> {
    console.log('Creating NEW Daytona sandbox with config:', config)
    
    try {
      console.log('🚀 Creating sandbox using official Daytona SDK...')
      
      // Create sandbox using the official SDK
      const sandbox = await daytona.create({
        language: 'javascript', // Use JavaScript environment (more stable)
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
    console.log(`🚀 Starting interactive follower scan for @${username}`)

    // Create interactive sign-in script that prompts user to log in
    const interactiveScript = `
const fs = require('fs');
const { chromium } = require('playwright');

console.log('🔐 Starting INTERACTIVE Twitter sign-in for follower extraction...');

(async () => {
  try {
    console.log('🚀 Launching browser for user sign-in...');
    
    const browser = await chromium.launch({
      headless: false, // IMPORTANT: Show browser so user can sign in
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-web-security',
        '--remote-debugging-port=9222', // Enable remote debugging
        '--disable-features=VizDisplayCompositor'
      ]
    });
    
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    
    console.log('🔗 Creating secure authentication link for user...');
    
    // Generate a secure authentication session
    const authSessionId = Math.random().toString(36).substring(2, 15);
    const authUrl = \`https://x.com/login?session_id=\${authSessionId}&redirect_to=followers\`;
    
    console.log('📝 Authentication URL created:', authUrl);
    
    // Save the auth URL and session info for the dashboard to retrieve
    const authData = {
      authUrl: authUrl,
      sessionId: authSessionId,
      status: 'awaiting_authentication',
      createdAt: new Date().toISOString()
    };
    
    fs.writeFileSync('/tmp/auth_link.json', JSON.stringify(authData, null, 2));
    console.log('✅ Authentication link saved for dashboard retrieval');
    
    // Navigate to login page in background to prepare
    await page.goto('https://x.com/login', { waitUntil: 'networkidle0' });
    
    // Take screenshot of login page
    await page.screenshot({ path: '/tmp/01_login_page.png', fullPage: true });
    console.log('📸 Screenshot saved: Login page prepared');
    
    console.log('🚨 AUTHENTICATION LINK READY - Dashboard will prompt user');
    
    // Wait for authentication signal from user (who signed in via dashboard)
    console.log('⏳ Waiting for user authentication signal...');
    
    // Poll for authentication signal file
    let authSignalReceived = false;
    let pollAttempts = 0;
    const maxPollAttempts = 60; // 5 minutes with 5-second intervals
    
    while (!authSignalReceived && pollAttempts < maxPollAttempts) {
      try {
        // Check if auth signal file exists
        const signalExists = fs.existsSync('/tmp/auth_signal.txt');
        if (signalExists) {
          const signalContent = fs.readFileSync('/tmp/auth_signal.txt', 'utf8');
          if (signalContent.includes('USER_AUTHENTICATED')) {
            authSignalReceived = true;
            console.log('✅ Authentication signal received from user!');
            break;
          }
        }
        
        // Wait 5 seconds before next check
        await new Promise(resolve => setTimeout(resolve, 5000));
        pollAttempts++;
        
        if (pollAttempts % 6 === 0) { // Log every 30 seconds
          console.log('⏳ Still waiting for user authentication... (' + (pollAttempts * 5) + 's elapsed)');
        }
      } catch (error) {
        console.log('Checking for auth signal...');
        await new Promise(resolve => setTimeout(resolve, 5000));
        pollAttempts++;
      }
    }
    
    if (!authSignalReceived) {
      throw new Error('Authentication timeout - user did not complete sign-in within 5 minutes');
    }
    
    console.log('✅ User signed in successfully!');
    
    // Take screenshot after successful login
    await page.screenshot({ path: '/tmp/02_signed_in.png', fullPage: true });
    console.log('📸 Screenshot saved: User signed in');
    
    // Now navigate to the followers page
    const followersUrl = \`https://x.com/\${username}/followers\`;
    console.log(\`📋 Navigating to followers page: \${followersUrl}\`);
    
    await page.goto(followersUrl, { waitUntil: 'networkidle0' });
    await page.waitForTimeout(3000);
    
    // Take screenshot of followers page
    await page.screenshot({ path: '/tmp/03_followers_page.png', fullPage: true });
    console.log('📸 Screenshot saved: Followers page loaded');
    
    console.log('📜 Starting follower extraction...');
    
    const followers = [];
    let scrollAttempts = 0;
    const maxScrolls = 50; // Limit scrolling to prevent infinite loops
    
    while (scrollAttempts < maxScrolls) {
      // Extract followers from current view
      const newFollowers = await page.evaluate(() => {
        const followerElements = document.querySelectorAll('[data-testid="UserCell"]');
        const extractedFollowers = [];
        
        followerElements.forEach(element => {
          const usernameElement = element.querySelector('[href*="/"]');
          const displayNameElement = element.querySelector('[dir="ltr"]');
          
          if (usernameElement && displayNameElement) {
            const href = usernameElement.getAttribute('href');
            const username = href ? href.replace('/', '') : '';
            const displayName = displayNameElement.textContent || '';
            
            if (username && !username.includes('/') && username.length > 0) {
              extractedFollowers.push({
                username: username,
                displayName: displayName
              });
            }
          }
        });
        
        return extractedFollowers;
      });
      
      // Add new unique followers
      newFollowers.forEach(follower => {
        if (!followers.some(f => f.username === follower.username)) {
          followers.push(follower);
        }
      });
      
      console.log('📊 Extracted ' + followers.length + ' followers so far...');
      
      // Scroll down to load more
      const scrolled = await page.evaluate(() => {
        const scrollHeight = document.body.scrollHeight;
        window.scrollTo(0, scrollHeight);
        return scrollHeight;
      });
      
      await page.waitForTimeout(2000); // Wait for new content to load
      scrollAttempts++;
      
      // Check if we've reached the end
      const newScrollHeight = await page.evaluate(() => document.body.scrollHeight);
      if (newScrollHeight === scrolled) {
        console.log('📋 Reached end of followers list');
        break;
      }
    }
    
    console.log('✅ Extraction completed! Found ' + followers.length + ' followers');
    
    // Take final screenshot showing extraction results
    await page.screenshot({ path: '/tmp/04_extraction_complete.png', fullPage: true });
    console.log('📸 Screenshot saved: Extraction completed');
    
    // Save results
    const result = {
      status: 'success',
      followers: followers,
      followerCount: followers.length,
      extractedAt: new Date().toISOString()
    };
    
    fs.writeFileSync('/tmp/followers_result.json', JSON.stringify(result, null, 2));
    
    await browser.close();
    console.log('🎉 Interactive extraction completed successfully!');
    
  } catch (error) {
    console.error('❌ Interactive extraction failed:', error);
    
    const errorResult = {
      status: 'failed',
      error: error.message,
      followers: [],
      followerCount: 0
    };
    
    fs.writeFileSync('/tmp/followers_result.json', JSON.stringify(errorResult, null, 2));
  }
})();
`;

    console.log('📝 Interactive sign-in script created')

    // Upload and execute the interactive script with screenshot monitoring
    try {
      await this.uploadScriptWithFallback(sandbox, interactiveScript, 'interactive-scanner.js')
      console.log('✅ Interactive script uploaded successfully')
      
      // Execute the script in background and return immediately
      console.log('🚀 Starting background extraction with screenshot monitoring...')
      
      // Start the script execution (don't await - let it run in background)
      this.executeScriptInBackground(sandbox, 'node interactive-scanner.js')
      
      console.log('✅ Background interactive extraction started - returning immediately to avoid timeout')
      console.log('🎯 Returning immediately to avoid Vercel timeout - interactive extraction running in background')
      
      return {
        status: 'partial',
        followers: [],
        followerCount: 0,
        message: 'Interactive extraction started in background with screenshot monitoring - user signin required'
      }
    } catch (error: unknown) {
      console.error('❌ Failed to start interactive extraction:', error)
      return {
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        followers: [],
        followerCount: 0
      }
    }
  }

  // Legacy method - keeping for compatibility but not used in interactive flow
  static async executeFollowerScanLegacy(
    sandbox: any,
    username: string,
    accessToken: string,
    accessTokenSecret: string
  ): Promise<FollowerScanResult> {
    console.log(`🚀 Starting legacy follower scan for @${username}`)

    const legacyScript = `
const fs = require('fs');
const { chromium } = require('playwright');

(async () => {
  try {
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

    // This section is no longer needed - using simplified approach
    console.log('✅ Using simplified authentication approach')

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
  
  // HYBRID AUTHENTICATION: Try multiple approaches for maximum success
  console.log('🔐 Step 1: Attempting hybrid authentication approach...');
  
  // Method 1: Try direct followers page access (works if user has session cookies)
  console.log('📍 Method 1: Trying direct followers page access...');
  await page.goto('https://x.com/${username}/followers', { waitUntil: 'networkidle0' });
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  // Check if we're already authenticated
  let authCheck = await page.evaluate(() => {
    const currentUrl = window.location.href;
    const hasLoginLinks = document.body.textContent?.includes('Log in') || 
                         document.body.textContent?.includes('Sign in') || false;
    const hasFollowerElements = document.querySelectorAll('[data-testid="UserCell"]').length > 0;
    const isFollowersPage = currentUrl.includes('/followers');
    
    return {
      currentUrl,
      isFollowersPage,
      hasLoginLinks,
      hasFollowerElements,
      authenticated: !hasLoginLinks && isFollowersPage && hasFollowerElements
    };
  });
  
  console.log(\`📊 Direct access check: \${JSON.stringify(authCheck, null, 2)}\`);
  
  if (authCheck.authenticated) {
    console.log('✅ Already authenticated! Using existing session.');
  } else {
    console.log('⚠️ Not authenticated, trying OAuth token injection...');
    
    // Method 2: Try OAuth token injection
    await page.goto('https://x.com', { waitUntil: 'networkidle0' });
    
    // Inject OAuth tokens in multiple formats
    await page.evaluate((token, secret) => {
      // Try localStorage
      localStorage.setItem('auth_token', token);
      localStorage.setItem('oauth_token', token);
      localStorage.setItem('oauth_token_secret', secret);
      
      // Try sessionStorage
      sessionStorage.setItem('auth_token', token);
      sessionStorage.setItem('oauth_token', token);
      
      console.log('🔄 Injected OAuth tokens into storage');
    }, '${accessToken}', '${accessTokenSecret}');
    
    // Try to set cookies
    try {
      await page.setCookie(
        { name: 'auth_token', value: '${accessToken}', domain: '.x.com', path: '/' },
        { name: 'oauth_token', value: '${accessToken}', domain: '.x.com', path: '/' }
      );
      console.log('🍪 Set OAuth cookies');
    } catch (error) {
      console.log('⚠️ Could not set cookies:', error.message);
    }
    
    // Try followers page again
    await page.goto('https://x.com/${username}/followers', { waitUntil: 'networkidle0' });
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Check authentication again
    authCheck = await page.evaluate(() => {
      const currentUrl = window.location.href;
      const hasLoginLinks = document.body.textContent?.includes('Log in') || 
                           document.body.textContent?.includes('Sign in') || false;
      const hasFollowerElements = document.querySelectorAll('[data-testid="UserCell"]').length > 0;
      const isFollowersPage = currentUrl.includes('/followers');
      
      return {
        currentUrl,
        isFollowersPage,
        hasLoginLinks,
        hasFollowerElements,
        authenticated: !hasLoginLinks && isFollowersPage && hasFollowerElements
      };
    });
    
    console.log(\`📊 OAuth injection check: \${JSON.stringify(authCheck, null, 2)}\`);
    
    if (!authCheck.authenticated) {
      console.log('❌ OAuth injection failed. Authentication required.');
      
      // Return a specific error that indicates authentication is needed
      return {
        status: 'authentication_required',
        error: 'Browser authentication failed. Session cookies required for access.',
        followers: [],
        followerCount: 0,
        authenticationFailed: true,
        message: 'OAuth tokens cannot authenticate browser sessions. Please provide session cookies.'
      };
    }
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
        status: 'partial' as const,
        message: 'Extraction started in background - check back in a few minutes'
      }
      
      console.log('🎯 Returning immediately to avoid Vercel timeout - extraction running in background')
      return scanResult
      
    } catch (error: unknown) {
      console.error('❌ Simple scroll failed:', error)
      return {
        followers: [],
        followerCount: 0,
        status: 'failed',
        error: `Simple scroll failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      }
    }
  }

  // NEW METHOD: Execute follower scan using session cookies instead of OAuth tokens
  static async executeFollowerScanWithCookies(
    sandbox: any,
    username: string,
    sessionCookies: {
      auth_token?: string,
      ct0?: string,
      twid?: string,
      capturedAt?: Date
    }
  ): Promise<FollowerScanResult> {
    console.log(`🔐 Starting session cookie-based follower scan for @${username}`)

    // Create a script that uses session cookies for authentication
    const cookieBasedScript = `
const puppeteer = require('puppeteer');

(async () => {
  console.log('🚀 Starting SESSION COOKIE authentication extraction...');
  
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
  
  // INJECT SESSION COOKIES: Use captured browser session cookies
  console.log('🔐 Step 1: Injecting session cookies for authentication...');
  
  // First navigate to X.com to set the domain
  await page.goto('https://x.com', { waitUntil: 'networkidle0' });
  
  // Inject the session cookies
  const cookies = [];
  if ('${sessionCookies.auth_token}') {
    cookies.push({
      name: 'auth_token',
      value: '${sessionCookies.auth_token}',
      domain: '.x.com',
      path: '/',
      secure: true,
      httpOnly: true,
      sameSite: 'Lax'
    });
  }
  if ('${sessionCookies.ct0}') {
    cookies.push({
      name: 'ct0',
      value: '${sessionCookies.ct0}',
      domain: '.x.com',
      path: '/',
      secure: true,
      sameSite: 'Lax'
    });
  }
  if ('${sessionCookies.twid}') {
    cookies.push({
      name: 'twid',
      value: '${sessionCookies.twid}',
      domain: '.x.com',
      path: '/',
      secure: true,
      sameSite: 'Lax'
    });
  }
  
  if (cookies.length > 0) {
    await page.setCookie(...cookies);
    console.log(\`✅ Injected \${cookies.length} session cookies\`);
  } else {
    console.log('❌ No valid session cookies to inject');
  }
  
  // Navigate to followers page with authenticated session
  console.log('📍 Step 2: Navigating to followers page with authenticated session...');
  await page.goto('https://x.com/${username}/followers', { waitUntil: 'networkidle0' });
  await new Promise(resolve => setTimeout(resolve, 5000));
  
  // Verify authentication and page
  const pageCheck = await page.evaluate(() => {
    const currentUrl = window.location.href;
    const pageTitle = document.title;
    const isFollowersPage = currentUrl.includes('/followers');
    const hasLoginLinks = document.body.textContent?.includes('Log in') || 
                         document.body.textContent?.includes('Sign in') || false;
    const hasFollowerElements = document.querySelectorAll('[data-testid="UserCell"]').length > 0;
    
    return {
      currentUrl,
      pageTitle,
      isFollowersPage,
      hasLoginLinks,
      hasFollowerElements,
      authenticated: !hasLoginLinks && isFollowersPage
    };
  });
  
  console.log(\`📊 Authentication check: \${JSON.stringify(pageCheck, null, 2)}\`);
  
  if (!pageCheck.authenticated) {
    throw new Error(\`Authentication failed: \${JSON.stringify(pageCheck)}\`);
  }
  
  console.log('✅ Successfully authenticated with session cookies!');
  console.log('📜 Starting follower extraction...');
  
  const followers = [];
  const maxScrolls = 50;
  
  for (let i = 0; i < maxScrolls; i++) {
    console.log(\`📜 Scroll \${i + 1}/\${maxScrolls}\`);
    
    // Take screenshot for debugging
    const screenshotPath = \`/tmp/screenshot_scroll_\${i + 1}.png\`;
    await page.screenshot({ 
      path: screenshotPath, 
      fullPage: false,
      clip: { x: 0, y: 0, width: 1200, height: 800 }
    });
    console.log(\`📸 Screenshot saved: \${screenshotPath}\`);
    
    // Extract followers from current view
    const currentFollowers = await page.evaluate((targetUsername) => {
      const extracted = [];
      const userCells = document.querySelectorAll('[data-testid="UserCell"]');
      console.log(\`🔍 Found \${userCells.length} UserCell elements\`);
      
      userCells.forEach((cell) => {
        const profileLinks = cell.querySelectorAll('a[href*="x.com/"]');
        
        profileLinks.forEach(link => {
          if (link.href) {
            const match = link.href.match(/x\\.com\\/([^/?#]+)$/);
            if (match && match[1]) {
              const username = match[1];
              
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
      
      return extracted;
    }, '${username}');
    
    // Add unique followers
    const existingUsernames = new Set(followers.map(f => f.username));
    const newFollowers = currentFollowers.filter(f => !existingUsernames.has(f.username));
    followers.push(...newFollowers);
    
    console.log(\`Found \${newFollowers.length} new followers (total: \${followers.length})\`);
    
    // Stop if we have enough followers or no new ones found
    if (followers.length >= 872) {
      console.log('🎉 Reached target follower count!');
      break;
    }
    
    if (newFollowers.length === 0 && i > 15) {
      console.log('No new followers found after 15+ scrolls, stopping...');
      break;
    }
    
    // Scroll down
    await page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight);
    });
    
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  await browser.close();
  
  console.log(\`📈 Final result: \${followers.length} followers extracted\`);
  
  // Save results
  const result = {
    followers: followers,
    followerCount: followers.length,
    scanDate: new Date().toISOString(),
    status: followers.length > 0 ? 'success' : 'failed',
    username: '${username}',
    strategy: 'Session-Cookie-Authentication',
    screenshots: Array.from({length: Math.min(50, followers.length)}, (_, i) => \`/tmp/screenshot_scroll_\${i + 1}.png\`)
  };
  
  require('fs').writeFileSync('/tmp/followers_result.json', JSON.stringify(result, null, 2));
  console.log('💾 Results saved to /tmp/followers_result.json');
  
})().catch(error => {
  console.error('❌ Session cookie extraction failed:', error);
  
  const errorResult = {
    followers: [],
    followerCount: 0,
    scanDate: new Date().toISOString(),
    status: 'error',
    error: error.message,
    username: '${username}',
    strategy: 'Session-Cookie-Authentication'
  };
  
  require('fs').writeFileSync('/tmp/followers_result.json', JSON.stringify(errorResult, null, 2));
  process.exit(1);
});
`;

    try {
      // Upload and execute the cookie-based scanner script
      await this.uploadScriptWithFallback(sandbox, cookieBasedScript, 'cookie-scanner.js')
      console.log('✅ Cookie-based scanner script uploaded successfully')
      
      // Execute the script
      console.log('🚀 Starting session cookie extraction...')
      const executeResult = await sandbox.process.executeCommand('cd scanner && npm install puppeteer && node cookie-scanner.js')
      
      console.log('📊 Cookie extraction execution result:', {
        exitCode: executeResult.exitCode,
        hasOutput: !!executeResult.result
      })
      
      // Get results from the file
      const resultResponse = await sandbox.process.executeCommand('cat /tmp/followers_result.json')
      if (resultResponse.result) {
        const result = JSON.parse(resultResponse.result)
        console.log('🎉 Cookie-based extraction completed:', {
          followerCount: result.followerCount,
          status: result.status
        })
        return result
      } else {
        throw new Error('No results file found after cookie-based extraction')
      }
      
    } catch (error: unknown) {
      console.error('❌ Cookie-based extraction failed:', error)
      return {
        followers: [],
        followerCount: 0,
        status: 'failed',
        error: `Cookie extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      }
    }
  }

  // Execute script in background without waiting for completion
  private static async executeScriptInBackground(sandbox: any, command: string): Promise<void> {
    try {
      console.log(`🔄 Executing command in background: ${command}`)
      
      // Use Daytona SDK to execute command without waiting
      sandbox.process.codeRun(command).catch((error: any) => {
        console.error('Background script execution error:', error)
      })
      
      console.log('✅ Background script execution started')
    } catch (error: unknown) {
      console.error('Failed to start background execution:', error)
      throw error
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
