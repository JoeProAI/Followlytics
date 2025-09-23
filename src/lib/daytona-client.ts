import { Daytona } from '@daytonaio/sdk'

// Initialize Daytona SDK (corrected configuration)
const daytona = new Daytona({
  apiKey: process.env.DAYTONA_API_KEY!
  // Removed apiUrl as per SDK best practices - let SDK use default
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
      
      // Install Node.js dependencies using SDK with retry logic
      console.log('Installing Node.js dependencies...')
      await this.executeCommandWithRetry(sandbox, 'npm init -y')
      await this.executeCommandWithRetry(sandbox, 'npm install playwright puppeteer --save')
      
      // Install Playwright system dependencies first
      console.log('🔧 Installing Playwright system dependencies...')
      try {
        await this.executeCommandWithRetry(sandbox, 'npx playwright install-deps')
        console.log('✅ Playwright system dependencies installed')
      } catch (depsError) {
        console.log('⚠️ Playwright install-deps failed, trying apt-get...')
        
        // Fallback to manual apt-get installation
        try {
          await this.executeCommandWithRetry(sandbox, `
            apt-get update && apt-get install -y \\
            libnspr4 \\
            libnss3 \\
            libdbus-1-3 \\
            libatk1.0-0 \\
            libatk-bridge2.0-0 \\
            libatspi2.0-0 \\
            libxcomposite1 \\
            libxdamage1 \\
            libxfixes3 \\
            libxrandr2 \\
            libgbm1 \\
            libxkbcommon0 \\
            libasound2
          `)
          console.log('✅ System dependencies installed via apt-get')
        } catch (aptError) {
          console.log('⚠️ System dependencies installation failed, continuing anyway...')
        }
      }
      
      // Install multiple browsers for different strategies
      console.log('Installing Playwright browsers...')
      await this.executeCommandWithRetry(sandbox, 'npx playwright install chromium firefox webkit')
      
      // Install Puppeteer browser (separate from Playwright)
      console.log('Installing Puppeteer browser...')
      await this.executeCommandWithRetry(sandbox, 'npx puppeteer browsers install chrome')
      
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
    accessTokenSecret: string,
    scanId?: string,
    sessionData?: any
  ): Promise<FollowerScanResult> {
    console.log(`🚀 Starting minimal test scan for @${username}`)

    // Create interactive script with OAuth authentication and screenshot monitoring
    const interactiveScript = `
const fs = require('fs');
const { chromium } = require('playwright');

console.log('🔐 Starting OAuth-authenticated X follower extraction...');
console.log('👤 Target username: ${username}');
console.log('🔑 X OAuth tokens received:');
console.log('  Access token: ' + ('${accessToken}'.substring(0, 15) + '...'));
console.log('  Secret token: ' + ('${accessTokenSecret}'.substring(0, 15) + '...'));

// X OAuth tokens for authentication (7-step method)
const accessToken = '${accessToken}';
const accessTokenSecret = '${accessTokenSecret}';
const targetUsername = '${username}';

console.log('🎯 Implementing 7-Step X OAuth Injection Method...');

// Screenshot helper function
async function takeScreenshot(page, step, description) {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = \`/tmp/screenshot_\${step}_\${timestamp}.png\`;
    await page.screenshot({ path: filename, fullPage: true });
    console.log(\`📸 Screenshot saved: \${step} - \${description}\`);
    
    // Save debug data as JSON
    const debugData = {
      step: step,
      description: description,
      timestamp: timestamp,
      url: page.url(),
      title: await page.title()
    };
    
    fs.writeFileSync(\`/tmp/debug_\${step}_\${timestamp}.json\`, JSON.stringify(debugData, null, 2));
    console.log(\`📋 Debug data saved: \${step}\`);
    
    return filename;
  } catch (error) {
    console.log(\`⚠️ Screenshot failed for \${step}: \${error.message}\`);
    return null;
  }
}

(async () => {
  try {
    console.log('🚀 Launching browser with OAuth authentication...');
    
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
    
    // Take initial screenshot
    await takeScreenshot(page, '01_browser_startup', 'Browser launched successfully');
    
    console.log('🔑 Attempting to reach Twitter with multiple fallback URLs...');
    
    // Try multiple Twitter URLs with different strategies
    const twitterUrls = [
      'https://x.com/login',
      'https://twitter.com/login', 
      'https://mobile.twitter.com/login',
      'https://x.com',
      'https://twitter.com'
    ];
    
    let loginPageLoaded = false;
    let currentUrl = '';
    
    for (const url of twitterUrls) {
      try {
        console.log(\`🌐 Trying URL: \${url}\`);
        
        // Use longer timeout and different wait strategies
        await page.goto(url, { 
          waitUntil: 'domcontentloaded', // Less strict than networkidle0
          timeout: 60000 // Increased to 60 seconds
        });
        
        currentUrl = page.url();
        console.log(\`✅ Successfully loaded: \${currentUrl}\`);
        
        // Wait a bit for page to stabilize
        await page.waitForTimeout(3000);
        
        loginPageLoaded = true;
        break;
        
      } catch (urlError) {
        console.log(\`❌ Failed to load \${url}: \${urlError.message}\`);
        await page.waitForTimeout(2000); // Wait before trying next URL
      }
    }
    
    if (!loginPageLoaded) {
      throw new Error('Failed to load any Twitter URL - all attempts timed out');
    }
    
    await takeScreenshot(page, '02_login_page', \`Twitter page loaded: \${currentUrl}\`);
    
    // STEP 5: Inject captured X session data (cookies + localStorage + sessionStorage)
    console.log('🔑 STEP 5: Injecting captured X session data into browser...');
    
    // Use passed session data or fallback to OAuth tokens
    const hasSessionData = sessionData && sessionData.cookies && Object.keys(sessionData.cookies).length > 0;
    console.log(hasSessionData ? '✅ Using captured X session data' : '⚠️ No session data, using OAuth tokens as fallback');
    
    if (sessionData && sessionData.cookies && Object.keys(sessionData.cookies).length > 0) {
      console.log('🎯 Using captured X session data for authentication...');
      
      await page.evaluate((session) => {
        console.log('🔐 Injecting captured X session...');
        
        // Inject captured cookies
        Object.entries(session.cookies).forEach(([name, value]) => {
          document.cookie = \`\${name}=\${value}; domain=.x.com; path=/; secure\`;
          document.cookie = \`\${name}=\${value}; domain=.twitter.com; path=/; secure\`;
        });
        
        // Inject captured localStorage
        Object.entries(session.localStorage).forEach(([key, value]) => {
          localStorage.setItem(key, value);
        });
        
        // Inject captured sessionStorage
        Object.entries(session.sessionStorage || {}).forEach(([key, value]) => {
          sessionStorage.setItem(key, value);
        });
        
        console.log('✅ Captured X session injected successfully');
        console.log(\`🍪 Cookies: \${Object.keys(session.cookies).length}\`);
        console.log(\`💾 localStorage: \${Object.keys(session.localStorage).length}\`);
        console.log(\`🗂️ sessionStorage: \${Object.keys(session.sessionStorage || {}).length}\`);
        
        return { 
          success: true, 
          method: 'captured_session',
          cookieCount: Object.keys(session.cookies).length,
          localStorageCount: Object.keys(session.localStorage).length
        };
      }, sessionData);
      
    } else {
      console.log('🔄 Fallback: Using OAuth token injection...');
      
      await page.evaluate((tokens) => {
        const { accessToken, accessTokenSecret } = tokens;
        
        console.log('🎯 Implementing OAuth token fallback injection...');
        
        // OAuth token injection as fallback
        localStorage.setItem('twitter_access_token', accessToken);
        localStorage.setItem('twitter_access_token_secret', accessTokenSecret);
        localStorage.setItem('x_access_token', accessToken);
        localStorage.setItem('x_access_token_secret', accessTokenSecret);
        
        document.cookie = \`auth_token=\${accessToken}; domain=.x.com; path=/; secure; samesite=none\`;
        document.cookie = \`auth_token=\${accessToken}; domain=.twitter.com; path=/; secure; samesite=none\`;
        document.cookie = \`ct0=\${accessToken}; domain=.x.com; path=/; secure; samesite=lax\`;
        document.cookie = \`ct0=\${accessToken}; domain=.twitter.com; path=/; secure; samesite=lax\`;
        
        console.log('✅ OAuth tokens injected as fallback');
        
        return { 
          success: true, 
          method: 'oauth_fallback',
          tokenLength: accessToken ? accessToken.length : 0
        };
      }, { accessToken, accessTokenSecret });
    }
    
    await takeScreenshot(page, '03_oauth_injected', 'OAuth tokens injected into browser');
    
    // STEP 6: Test X authentication with injected tokens
    console.log('🔐 STEP 6: Testing X authentication with injected tokens...');
    console.log('🌐 Navigating to X followers page...');
    
    // Try multiple X followers page URLs (prioritize X.com)
    const followersUrls = [
      \`https://x.com/\${targetUsername}/followers\`,
      \`https://x.com/\${targetUsername}/verified_followers\`,
      \`https://twitter.com/\${targetUsername}/followers\`,
      \`https://mobile.x.com/\${targetUsername}/followers\`,
      \`https://mobile.twitter.com/\${targetUsername}/followers\`
    ];
    
    let followersPageLoaded = false;
    let finalUrl = '';
    
    for (const url of followersUrls) {
      try {
        console.log(\`🎯 Trying followers URL: \${url}\`);
        
        await page.goto(url, { 
          waitUntil: 'domcontentloaded',
          timeout: 60000 
        });
        
        finalUrl = page.url();
        console.log(\`✅ Followers page loaded: \${finalUrl}\`);
        
        // Wait for page to stabilize
        await page.waitForTimeout(5000);
        
        followersPageLoaded = true;
        break;
        
      } catch (urlError) {
        console.log(\`❌ Failed to load \${url}: \${urlError.message}\`);
        await page.waitForTimeout(2000);
      }
    }
    
    if (!followersPageLoaded) {
      throw new Error('Failed to load any followers page URL - all attempts timed out');
    }
    
    await takeScreenshot(page, '04_followers_page', \`Followers page loaded: \${finalUrl}\`);
    
    // STEP 7: Extract real followers data from authenticated X session
    console.log('👥 STEP 7: Extracting followers data from authenticated X session...');
    console.log('🔍 Looking for follower elements on the page...');
    
    const authStatus = await page.evaluate(() => {
      const body = document.body.textContent || '';
      const url = window.location.href;
      
      return {
        isLoginPage: url.includes('/login') || body.includes('Sign in to X'),
        isFollowersPage: url.includes('/followers'),
        currentUrl: url,
        pageTitle: document.title,
        hasFollowerElements: document.querySelectorAll('[data-testid="UserCell"]').length > 0
      };
    });
    
    console.log('🔍 Authentication status:', JSON.stringify(authStatus, null, 2));
    
    if (authStatus.isLoginPage) {
      console.log('❌ Still on login page - OAuth authentication failed');
      await takeScreenshot(page, '05_auth_failed', 'OAuth authentication failed - still on login');
      
      // Save failure result
      const result = {
        status: 'authentication_failed',
        error: 'OAuth token injection failed - redirected to login page',
        followers: [],
        followerCount: 0,
        authStatus: authStatus
      };
      
      fs.writeFileSync('/tmp/followers_result.json', JSON.stringify(result, null, 2));
      await browser.close();
      return;
    }
    
    if (!authStatus.isFollowersPage) {
      console.log('⚠️ Not on followers page - checking current location');
      await takeScreenshot(page, '05_wrong_page', 'Not on expected followers page');
    }
    
    console.log('✅ Authentication successful - extracting followers...');
    await takeScreenshot(page, '06_extraction_start', 'Starting follower extraction');
    
    // Extract followers
    const followers = [];
    let scrollAttempts = 0;
    const maxScrolls = 10; // Limit for testing
    
    while (scrollAttempts < maxScrolls) {
      console.log(\`🔍 Extraction attempt \${scrollAttempts + 1}/\${maxScrolls}\`);
      
      const newFollowers = await page.evaluate(() => {
        const followerElements = document.querySelectorAll('[data-testid="UserCell"] a[href^="/"]');
        const extracted = [];
        
        followerElements.forEach((element, index) => {
          if (index >= 20) return; // Limit per scroll
          
          const href = element.getAttribute('href');
          if (href && href.startsWith('/')) {
            const username = href.substring(1);
            if (username && username.length > 0 && username.length <= 15) {
              extracted.push({
                username: username,
                displayName: element.textContent || username
              });
            }
          }
        });
        
        return extracted;
      });
      
      // Add unique followers
      const existingUsernames = new Set(followers.map(f => f.username));
      const uniqueNewFollowers = newFollowers.filter(f => !existingUsernames.has(f.username));
      
      if (uniqueNewFollowers.length > 0) {
        followers.push(...uniqueNewFollowers);
        console.log(\`📊 Found \${uniqueNewFollowers.length} new followers (total: \${followers.length})\`);
      } else {
        console.log('📭 No new followers found');
      }
      
      // Scroll for more
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(2000);
      
      scrollAttempts++;
      
      // Stop if no new followers for several attempts
      if (uniqueNewFollowers.length === 0 && scrollAttempts > 3) {
        console.log('🛑 No new followers found, stopping extraction');
        break;
      }
    }
    
    console.log(\`🎉 Extraction completed! Found \${followers.length} followers\`);
    await takeScreenshot(page, '07_extraction_complete', \`Extraction completed - \${followers.length} followers found\`);
    
    // Save results
    const result = {
      status: 'completed',
      followers: followers,
      followerCount: followers.length,
      extractionTime: new Date().toISOString(),
      authStatus: authStatus
    };
    
    fs.writeFileSync('/tmp/followers_result.json', JSON.stringify(result, null, 2));
    
    await browser.close();
    console.log('✅ OAuth extraction completed successfully!');
    
  } catch (error) {
    console.error('❌ OAuth extraction failed:', error);
    
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
      
      // Start the script execution in true background mode
      this.executeScriptInBackgroundAsync(sandbox, 'cd scanner && node interactive-scanner.js', scanId)
      
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
        console.log(\`📜 \${strategy.name} scroll \${i + 1}: no new followers found (consecutive empty: \${consecutiveEmptyScrolls})\`);
      }
    }
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
    status: 'success', // Always success if extraction completes without errors
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
    
    // If no new followers found in multiple attempts, try alternative strategies
    if (newFollowers.length === 0) {
      noNewFollowersCount++
      console.log(\`⚠️ No new followers found (attempt \${noNewFollowersCount}/\${maxNoNewFollowers})\`)
      
      // Try alternative extraction strategies
      if (noNewFollowersCount === 2) {
        console.log('🔄 Trying alternative extraction strategy...');
        
        // Strategy 1: Look for any text that looks like usernames
        const alternativeFollowers = await page.evaluate(() => {
          const textNodes = document.evaluate(
            "//text()[contains(., '@')]",
            document,
            null,
            XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE,
            null
          );
          
          const usernames = [];
          for (let i = 0; i < textNodes.snapshotLength; i++) {
            const node = textNodes.snapshotItem(i);
            const text = node?.textContent || '';
            const matches = text.match(/@([a-zA-Z0-9_]+)/g);
            if (matches) {
              matches.forEach(match => {
                const username = match.substring(1); // Remove @
                if (username.length > 0 && username.length < 16) {
                  usernames.push({
                    username: username,
                    displayName: username
                  });
                }
              });
            }
          }
          
          console.log(\`Alternative strategy found \${usernames.length} potential usernames\`);
          return usernames;
        });
        
        // Add alternative followers if found
        alternativeFollowers.forEach(follower => {
          if (!followers.some(f => f.username === follower.username)) {
            followers.push(follower);
            console.log(\`Added alternative follower: @\${follower.username}\`);
          }
        });
      }
      
      if (noNewFollowersCount >= maxNoNewFollowers) {
        console.log('🛑 No new followers found after multiple attempts and alternative strategies, stopping extraction')
        break
      }
    } else {
      noNewFollowersCount = 0 // Reset counter when followers are found
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
    status: 'success', // Always success if extraction completes without errors
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
  private static async executeCommandWithRetry(sandbox: any, command: string, maxRetries: number = 3): Promise<any> {
    let retryCount = 0
    
    while (retryCount < maxRetries) {
      try {
        console.log(`🔄 Executing: ${command} (attempt ${retryCount + 1}/${maxRetries})`)
        const result = await sandbox.process.executeCommand(command)
        console.log(`✅ Command executed successfully`)
        return result
      } catch (apiError: any) {
        retryCount++
        console.error(`❌ Attempt ${retryCount}/${maxRetries} failed:`, apiError?.message || 'Unknown error')
        
        // Check if it's a 502 error (Bad Gateway) - Daytona service issue
        if (apiError?.statusCode === 502 || apiError?.message?.includes('502')) {
          console.log('🔄 Daytona API returned 502 - service may be temporarily unavailable')
          
          if (retryCount < maxRetries) {
            const delay = retryCount * 2000 // 2s, 4s, 6s delays
            console.log(`⏳ Waiting ${delay}ms before retry...`)
            await new Promise(resolve => setTimeout(resolve, delay))
            continue
          }
        }
        
        // If not a retryable error or max retries reached, throw
        if (retryCount >= maxRetries) {
          throw new Error(`Command failed after ${maxRetries} attempts: ${command}. Last error: ${apiError?.message || 'Unknown error'}`)
        }
      }
    }
  }

  private static executeScriptInBackgroundAsync(sandbox: any, command: string, scanId?: string): void {
    // Execute script asynchronously without blocking
    (async () => {
      try {
        console.log(`🔄 Executing command in true background: ${command}`)
        
        // Execute the command and let it run
        const result = await sandbox.process.executeCommand(command)
        console.log('📊 Background script execution completed')
        console.log('Exit code:', result.exitCode)
        console.log('Output preview:', result.result?.substring(0, 500) + '...')
        
        // Try to read results and update database
        try {
          const resultsCmd = await sandbox.process.executeCommand('cat /tmp/followers_result.json 2>/dev/null || echo "No results yet"')
          if (resultsCmd.exitCode === 0 && !resultsCmd.result.includes('No results yet')) {
            console.log('📋 Background extraction results available')
            console.log('Results preview:', resultsCmd.result.substring(0, 300) + '...')
            
            // Parse results and update database if scanId provided
            if (scanId) {
              try {
                const scanResults = JSON.parse(resultsCmd.result)
                console.log(`🔄 Updating database for scan ${scanId}...`)
                
                // Import Firebase Admin here to avoid circular dependencies
                const { adminDb } = await import('@/lib/firebase-admin')
                
                const updateData: any = {
                  status: scanResults.status === 'completed' ? 'completed' : 'failed',
                  followerCount: scanResults.followerCount || 0,
                  completedAt: new Date(),
                  updatedAt: new Date()
                }
                
                if (scanResults.followers && scanResults.followers.length > 0) {
                  updateData.followers = scanResults.followers
                }
                
                if (scanResults.error) {
                  updateData.error = scanResults.error
                }
                
                if (scanResults.authStatus) {
                  updateData.authStatus = scanResults.authStatus
                }
                
                await adminDb.collection('follower_scans').doc(scanId).update(updateData)
                console.log(`✅ Database updated for scan ${scanId}: ${scanResults.status}, ${scanResults.followerCount || 0} followers`)
                
              } catch (dbError: any) {
                console.error('❌ Failed to update database:', dbError.message)
              }
            }
          } else {
            console.log('⚠️ No results file found - script may have failed')
            
            // Update database with failure if scanId provided
            if (scanId) {
              try {
                const { adminDb } = await import('@/lib/firebase-admin')
                await adminDb.collection('follower_scans').doc(scanId).update({
                  status: 'failed',
                  error: 'No results file generated - script execution failed',
                  completedAt: new Date(),
                  updatedAt: new Date()
                })
                console.log(`❌ Database updated with failure for scan ${scanId}`)
              } catch (dbError: any) {
                console.error('❌ Failed to update database with failure:', dbError.message)
              }
            }
          }
        } catch (resultsError: any) {
          console.log('⚠️ Could not read results:', resultsError.message)
        }
        
      } catch (error: any) {
        console.error('❌ Background script execution failed:', error.message)
        
        // Update database with execution failure if scanId provided
        if (scanId) {
          try {
            const { adminDb } = await import('@/lib/firebase-admin')
            await adminDb.collection('follower_scans').doc(scanId).update({
              status: 'failed',
              error: `Script execution failed: ${error.message}`,
              completedAt: new Date(),
              updatedAt: new Date()
            })
            console.log(`❌ Database updated with execution failure for scan ${scanId}`)
          } catch (dbError: any) {
            console.error('❌ Failed to update database with execution failure:', dbError.message)
          }
        }
      }
    })().catch(error => {
      console.error('❌ Async background execution error:', error.message)
    })
  }

  private static async executeScriptInBackground(sandbox: any, command: string): Promise<void> {
    try {
      console.log(`🔄 Executing command in background: ${command}`)
      
      // Add retry logic for Daytona API calls
      let retryCount = 0
      const maxRetries = 3
      
      while (retryCount < maxRetries) {
        try {
          // Use Daytona SDK executeCommand (more reliable than codeRun)
          await sandbox.process.executeCommand(command)
          console.log('✅ Background script execution started successfully')
          return
        } catch (apiError: any) {
          retryCount++
          console.error(`❌ Attempt ${retryCount}/${maxRetries} failed:`, apiError)
          
          // Check if it's a 502 error (Bad Gateway) - Daytona service issue
          if (apiError?.statusCode === 502 || apiError?.message?.includes('502')) {
            console.log('🔄 Daytona API returned 502 - service may be temporarily unavailable')
            
            if (retryCount < maxRetries) {
              const delay = retryCount * 2000 // 2s, 4s, 6s delays
              console.log(`⏳ Waiting ${delay}ms before retry...`)
              await new Promise(resolve => setTimeout(resolve, delay))
              continue
            }
          }
          
          // If not a retryable error or max retries reached, throw
          if (retryCount >= maxRetries) {
            throw new Error(`Failed after ${maxRetries} attempts. Last error: ${apiError?.message || 'Unknown error'}`)
          }
        }
      }
      
    } catch (error: unknown) {
      console.error('Failed to start background execution after retries:', error)
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
      
      // Execute the OAuth script
      console.log('🚀 Executing OAuth script...')
      const oauthResult = await sandbox.process.executeCommand('node /tmp/oauth_extract.js')
      console.log('📊 OAuth execution result:', oauthResult.exitCode)
      
      return { status: 'oauth_attempted', result: oauthResult }
      
    } catch (error: unknown) {
      console.error('❌ OAuth extraction failed:', error)
      throw new Error('OAuth extraction failed: ' + (error instanceof Error ? error.message : 'Unknown error'))
    }
  }

  static async captureOAuthSession(sandbox: any, userId: string): Promise<any> {
    try {
      console.log('🔐 Starting OAuth session capture in sandbox...')
      
      // Create OAuth capture script
      const oauthScript = `
const puppeteer = require('puppeteer');

async function captureOAuthSession() {
  console.log('🚀 Starting OAuth session capture...');
  
  const browser = await puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--single-process',
      '--disable-gpu'
    ]
  });
  
  try {
    const page = await browser.newPage();
    
    // Set user agent
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    
    // Build OAuth URL
    const clientId = process.env.TWITTER_CLIENT_ID;
    const redirectUri = encodeURIComponent(process.env.CALLBACK_URL);
    const state = process.env.USER_ID;
    const scope = encodeURIComponent('tweet.read users.read follows.read offline.access');
    
    const oauthUrl = \`https://twitter.com/i/oauth2/authorize?response_type=code&client_id=\${clientId}&redirect_uri=\${redirectUri}&scope=\${scope}&state=\${state}&code_challenge=challenge&code_challenge_method=plain\`;
    
    console.log('📱 Navigating to OAuth URL...');
    await page.goto(oauthUrl, { 
      waitUntil: 'networkidle2',
      timeout: 30000 
    });
    
    // Wait for OAuth consent screen
    console.log('⏳ Waiting for OAuth consent screen...');
    await page.waitForSelector('[data-testid="OAuth_Consent_Button"], [data-testid="login"], input[name="text"]', { timeout: 15000 });
    
    // Check if we need to login first
    const needsLogin = await page.$('input[name="text"]');
    if (needsLogin) {
      console.log('🔑 OAuth requires login - this should redirect to login page');
      // In a real implementation, this would handle the login flow
      // For now, we'll capture what we can from the OAuth consent screen
    }
    
    // Look for consent screen elements
    const consentButton = await page.$('[data-testid="OAuth_Consent_Button"]');
    if (consentButton) {
      console.log('✅ Found OAuth consent screen');
      
      // Take screenshot for debugging
      await page.screenshot({ path: '/tmp/oauth_consent.png' });
      
      // Click authorize button
      await consentButton.click();
      console.log('🔓 Clicked OAuth authorize button');
      
      // Wait for redirect or callback
      await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 });
    }
    
    // Extract any session data we can get
    console.log('📊 Extracting session data...');
    const sessionData = await page.evaluate(() => {
      // Get cookies
      const cookies = {};
      document.cookie.split(';').forEach(cookie => {
        const [name, value] = cookie.trim().split('=');
        if (name && value) cookies[name] = value;
      });
      
      // Get localStorage
      const localStorage = {};
      try {
        for (let i = 0; i < window.localStorage.length; i++) {
          const key = window.localStorage.key(i);
          if (key) localStorage[key] = window.localStorage.getItem(key);
        }
      } catch (e) {}
      
      // Get sessionStorage
      const sessionStorage = {};
      try {
        for (let i = 0; i < window.sessionStorage.length; i++) {
          const key = window.sessionStorage.key(i);
          if (key) sessionStorage[key] = window.sessionStorage.getItem(key);
        }
      } catch (e) {}
      
      return {
        cookies,
        localStorage,
        sessionStorage,
        url: window.location.href,
        timestamp: new Date().toISOString()
      };
    });
    
    console.log('✅ OAuth session data extracted');
    console.log('📊 Data summary:', {
      cookieCount: Object.keys(sessionData.cookies).length,
      localStorageCount: Object.keys(sessionData.localStorage).length,
      sessionStorageCount: Object.keys(sessionData.sessionStorage).length,
      currentUrl: sessionData.url
    });
    
    return {
      success: true,
      sessionData,
      oauthTokens: {
        // OAuth tokens would be extracted from the callback URL or stored tokens
        extracted: 'from_oauth_flow'
      },
      message: 'OAuth session captured successfully'
    };
    
  } catch (error) {
    console.error('❌ OAuth capture failed:', error.message);
    return {
      success: false,
      error: error.message,
      message: 'OAuth session capture failed'
    };
  } finally {
    await browser.close();
  }
}

// Execute OAuth capture
captureOAuthSession()
  .then(result => {
    console.log('📋 Final OAuth result:', JSON.stringify(result, null, 2));
    process.exit(result.success ? 0 : 1);
  })
  .catch(error => {
    console.error('💥 OAuth script error:', error);
    process.exit(1);
  });
      `
      
      // Write the OAuth capture script to sandbox
      console.log('📝 Writing OAuth capture script...')
      await sandbox.process.executeCommand(`cat > /tmp/oauth_capture.js << 'EOF'
${oauthScript}
EOF`)
      
      // Install Puppeteer
      console.log('📦 Installing Puppeteer...')
      const installResult = await sandbox.process.executeCommand('npm install puppeteer')
      console.log('📦 Puppeteer installation:', installResult.exitCode === 0 ? 'Success' : 'Failed')
      
      if (installResult.exitCode !== 0) {
        throw new Error('Failed to install Puppeteer: ' + installResult.result)
      }
      
      // Execute the OAuth capture script
      console.log('🚀 Executing OAuth capture...')
      const captureResult = await sandbox.process.executeCommand('node /tmp/oauth_capture.js')
      console.log('📊 OAuth capture result:', captureResult.exitCode)
      console.log('📋 OAuth output:', captureResult.result)
      
      if (captureResult.exitCode === 0) {
        // Parse the result to extract session data
        try {
          const lines = captureResult.result.split('\n')
          const resultLine = lines.find((line: string) => line.includes('Final OAuth result:'))
          if (resultLine) {
            const resultJson = resultLine.substring(resultLine.indexOf('{'))
            const parsedResult = JSON.parse(resultJson)
            return parsedResult
          }
        } catch (parseError) {
          console.error('❌ Failed to parse OAuth result:', parseError)
        }
        
        return {
          success: true,
          message: 'OAuth capture completed',
          sessionData: null,
          oauthTokens: null
        }
      } else {
        return {
          success: false,
          error: 'OAuth script failed with exit code: ' + captureResult.exitCode,
          output: captureResult.result
        }
      }
      
    } catch (error: unknown) {
      console.error('❌ OAuth session capture failed:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        message: 'OAuth session capture failed'
      }
    }
  }

  static async captureXSession(sandbox: any, xUsername: string, xPassword: string): Promise<any> {
    try {
      console.log('🔐 Starting X session capture in sandbox...')
      
      // Create X session capture script
      const captureScript = `
const puppeteer = require('puppeteer');

async function captureXSession() {
  console.log('🚀 Starting X session capture...');
  
  const browser = await puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--single-process',
      '--disable-gpu'
    ]
  });
  
  try {
    const page = await browser.newPage();
    
    // Set user agent
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    
    console.log('📱 Navigating to X.com login...');
    await page.goto('https://x.com/i/flow/login', { 
      waitUntil: 'networkidle2',
      timeout: 30000 
    });
    
    // Wait for and fill username
    console.log('👤 Entering username...');
    await page.waitForSelector('input[name="text"]', { timeout: 15000 });
    await page.type('input[name="text"]', '${xUsername}');
    
    // Click next button
    await page.click('[role="button"]:has-text("Next")');
    await page.waitForTimeout(2000);
    
    // Wait for and fill password
    console.log('🔑 Entering password...');
    await page.waitForSelector('input[name="password"]', { timeout: 15000 });
    await page.type('input[name="password"]', '${xPassword}');
    
    // Click login button
    await page.click('[data-testid="LoginForm_Login_Button"]');
    
    // Wait for successful login (home page)
    console.log('⏳ Waiting for login success...');
    await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 });
    
    // Extract session data
    console.log('📊 Extracting session data...');
    const sessionData = await page.evaluate(() => {
      // Get cookies
      const cookies = {};
      document.cookie.split(';').forEach(cookie => {
        const [name, value] = cookie.trim().split('=');
        if (name && value) cookies[name] = value;
      });
      
      // Get localStorage
      const localStorage = {};
      for (let i = 0; i < window.localStorage.length; i++) {
        const key = window.localStorage.key(i);
        if (key) localStorage[key] = window.localStorage.getItem(key);
      }
      
      // Get sessionStorage
      const sessionStorage = {};
      for (let i = 0; i < window.sessionStorage.length; i++) {
        const key = window.sessionStorage.key(i);
        if (key) sessionStorage[key] = window.sessionStorage.getItem(key);
      }
      
      return {
        cookies,
        localStorage,
        sessionStorage,
        url: window.location.href,
        timestamp: new Date().toISOString()
      };
    });
    
    console.log('✅ Session data extracted successfully');
    console.log('📊 Data summary:', {
      cookieCount: Object.keys(sessionData.cookies).length,
      localStorageCount: Object.keys(sessionData.localStorage).length,
      sessionStorageCount: Object.keys(sessionData.sessionStorage).length
    });
    
    return {
      success: true,
      sessionData,
      message: 'Session captured successfully'
    };
    
  } catch (error) {
    console.error('❌ Capture failed:', error.message);
    return {
      success: false,
      error: error.message,
      message: 'Session capture failed'
    };
  } finally {
    await browser.close();
  }
}

// Execute capture
captureXSession()
  .then(result => {
    console.log('📋 Final result:', JSON.stringify(result, null, 2));
    process.exit(result.success ? 0 : 1);
  })
  .catch(error => {
    console.error('💥 Script error:', error);
    process.exit(1);
  });
      `
      
      // Write the capture script to sandbox
      console.log('📝 Writing X session capture script...')
      await sandbox.process.executeCommand(`cat > /tmp/x_session_capture.js << 'EOF'
${captureScript}
EOF`)
      
      // Install Puppeteer
      console.log('📦 Installing Puppeteer...')
      const installResult = await sandbox.process.executeCommand('npm install puppeteer')
      console.log('📦 Puppeteer installation:', installResult.exitCode === 0 ? 'Success' : 'Failed')
      
      if (installResult.exitCode !== 0) {
        throw new Error('Failed to install Puppeteer: ' + installResult.result)
      }
      
      // Execute the capture script
      console.log('🚀 Executing X session capture...')
      const captureResult = await sandbox.process.executeCommand('node /tmp/x_session_capture.js')
      console.log('📊 Capture execution result:', captureResult.exitCode)
      console.log('📋 Capture output:', captureResult.result)
      
      if (captureResult.exitCode === 0) {
        // Parse the result to extract session data
        try {
          const lines = captureResult.result.split('\n')
          const resultLine = lines.find((line: string) => line.includes('Final result:'))
          if (resultLine) {
            const resultJson = resultLine.substring(resultLine.indexOf('{'))
            const parsedResult = JSON.parse(resultJson)
            return parsedResult
          }
        } catch (parseError) {
          console.error('❌ Failed to parse capture result:', parseError)
        }
        
        return {
          success: true,
          message: 'Session capture completed',
          sessionData: null // Will be extracted from logs if needed
        }
      } else {
        return {
          success: false,
          error: 'Capture script failed with exit code: ' + captureResult.exitCode,
          output: captureResult.result
        }
      }
      
    } catch (error: unknown) {
      console.error('❌ X session capture failed:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        message: 'Session capture failed'
      }
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
