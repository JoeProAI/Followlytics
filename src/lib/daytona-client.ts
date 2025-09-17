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

async function scanWithStrategy(strategy) {
  console.log(\`🚀 Trying strategy: \${strategy.name}\`);
  
  const username = process.env.TWITTER_USERNAME;
  const accessToken = process.env.TWITTER_ACCESS_TOKEN;
  const accessTokenSecret = process.env.TWITTER_ACCESS_TOKEN_SECRET;
  
  if (!username || !accessToken || !accessTokenSecret) {
    throw new Error('Missing required environment variables');
  }
  
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

      // Extract followers using DOM parsing with scrolling
      const followers = [];
      const maxScrolls = 3; // VERY LIMITED - just test if we get ANY followers
      let consecutiveEmptyScrolls = 0;

      for (let i = 0; i < maxScrolls && consecutiveEmptyScrolls < 2; i++) {
        // Extract followers from current view
        const newFollowers = await page.evaluate((selector) => {
          const followerElements = document.querySelectorAll(selector || '[data-testid="UserCell"]');
          const extracted = [];
          
          followerElements.forEach(element => {
            try {
              let username = null;
              let displayName = null;
              
              // Extract username from links with better parsing
              const usernameLinks = element.querySelectorAll('a[href*="/"]');
              for (const link of usernameLinks) {
                if (link.href) {
                  const match = link.href.match(/(?:twitter\\.com|x\\.com)\\/([^/?#]+)/);
                  if (match && match[1] && 
                      match[1] !== 'home' && 
                      match[1] !== 'explore' && 
                      match[1] !== 'i' && 
                      match[1] !== 'search' &&
                      !match[1].includes('status') &&
                      match[1].length > 1) {
                    username = match[1];
                    break;
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
              }
            } catch (error) {
              // Ignore extraction errors for individual elements
            }
          });
          
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
      }
      
      // Scroll down faster
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(1000); // Reduced wait time for faster scrolling
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
  
  const results = [];
  let bestResult = null;
  
  // Try each strategy
  for (const strategy of strategies) {
    try {
      const result = await scanWithStrategy(strategy);
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

    console.log('🚀 Starting REAL GUI automation with Twitter login for @' + username)
    console.log('🖥️ Setting up desktop environment for human-like interaction...')
    
    try {
      // Use Daytona's computerUse for REAL GUI automation
      const result = await DaytonaSandboxManager.performRealGUIFollowerExtraction(sandbox, username, accessToken, accessTokenSecret)
      return result
      
    } catch (error: unknown) {
      console.error('❌ GUI automation failed:', error)
      throw error
    }

    // Prepare environment variables for the scan
    const envVars = {
      TWITTER_USERNAME: username,
      TWITTER_ACCESS_TOKEN: accessToken,
      TWITTER_ACCESS_TOKEN_SECRET: accessTokenSecret
    }

    console.log('🔧 Setting environment variables...')
    const envString = Object.entries(envVars)
      .filter(([_, value]) => value)
      .map(([key, value]) => `${key}="${value}"`)
      .join(' ')

    // Execute the scanner with REDUCED timeout for testing
    const timeoutMs = 2 * 60 * 1000 // 2 minutes - just test if we get ANY followers
    const startTime = Date.now()
    let result: any
    
    try {
      const workingDir = 'scanner'
      
      // Check files before execution using SDK
      console.log('📂 Checking directory contents...')
      const files = await sandbox.fs.listFiles(workingDir)
      console.log('📂 Directory listing:', files.map((f: any) => f.name))
      
      const scriptFile = files.find((f: any) => f.name === 'twitter-scanner.js')
      if (scriptFile) {
        console.log('📄 Script file info:', scriptFile)
      } else {
        throw new Error('twitter-scanner.js not found in directory')
      }
      
      // Execute the scanner with timeout from the working directory
      console.log(`🚀 Starting Twitter scanner execution from ${workingDir}...`)
      const executeCommand = `cd ${workingDir} && ${envString} node twitter-scanner.js`
      console.log(`🔧 Execute command: ${executeCommand}`)
      
      // Execute with progress monitoring
      const progressInterval = setInterval(async () => {
        try {
          const progressCheck = await sandbox.process.executeCommand('ps aux | grep node || echo "No node processes"')
          console.log('🔄 Progress check:', progressCheck.result?.substring(0, 200) + '...')
          
          // Check if results file is being created
          const fileCheck = await sandbox.process.executeCommand('ls -la /tmp/followers_result.json 2>/dev/null || echo "Results file not yet created"')
          console.log('📄 Results file status:', fileCheck.result)
          
          // Check debug log file for actual scanner progress
          const debugLogCheck = await sandbox.process.executeCommand('tail -n 10 /tmp/scanner_debug.log 2>/dev/null || echo "Debug log not found"')
          console.log('📋 Debug log (last 10 lines):', debugLogCheck.result)
          
          // Check for any error files or screenshots
          const errorFilesCheck = await sandbox.process.executeCommand('ls -la /tmp/*.png /tmp/*.log 2>/dev/null || echo "No debug files found"')
          console.log('🔍 Debug files:', errorFilesCheck.result)
          
          // Check what the scanner process is actually doing
          const processDetails = await sandbox.process.executeCommand('ps -ef | grep twitter-scanner || echo "Scanner process not found"')
          console.log('🔍 Scanner process details:', processDetails.result)
        } catch (e) {
          console.log('Progress check failed:', e)
        }
      }, 30000) // Check every 30 seconds

      try {
        result = await Promise.race([
          sandbox.process.executeCommand(executeCommand),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Scanner execution timeout')), timeoutMs)
          )
        ])
      } finally {
        clearInterval(progressInterval)
      }
      
      console.log('✅ Scanner execution completed')
      console.log('📊 Scanner output:', result)
      
    } catch (error: unknown) {
      console.error('❌ Scanner execution failed:', error)
      
      // Try to get any partial results
      try {
        const partialResult = await sandbox.process.executeCommand('cat /tmp/followers_result.json 2>/dev/null || echo "{}"')
        console.log('📄 Partial result found:', partialResult)
      } catch (e) {
        console.log('No partial results available')
      }
    }

    // Retrieve the results
    console.log('📥 Retrieving scan results...')
    try {
      const resultResponse = await sandbox.process.executeCommand('cat /tmp/followers_result.json')
      const resultContent = resultResponse.result || resultResponse.stdout || ''
      console.log('📄 Raw result content:', resultContent)
      const scanResult = JSON.parse(resultContent)
      
      console.log('📊 Scan completed successfully:', {
        followerCount: scanResult.followerCount,
        status: scanResult.status,
        strategy: scanResult.strategy || 'unknown'
      })
      
      return scanResult
      
    } catch (error: unknown) {
      console.error('❌ Failed to retrieve scan results:', error)
      
      // Handle error message safely
      const getErrorMessage = (err: unknown): string => {
        if (err instanceof Error) return err.message
        if (typeof err === 'string') return err
        return 'Unknown error'
      }
      const errorMessage = getErrorMessage(error)
      
      // Return a fallback result
      return {
        followers: [],
        followerCount: 0,
        scanDate: new Date().toISOString(),
        status: 'execution_failed',
        username: username,
        error: `Scanner execution failed: ${errorMessage}`,
        executionTime: Date.now() - startTime
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

  private static async performRealGUIFollowerExtraction(sandbox: any, username: string, accessToken: string, accessTokenSecret: string): Promise<any> {
    console.log('🖥️ Starting REAL GUI automation with Twitter login...')
    
    try {
      // Step 1: Setup desktop environment with optimized commands
      console.log('🖥️ Setting up virtual desktop...')
      await sandbox.process.executeCommand('export DISPLAY=:99 && Xvfb :99 -screen 0 1920x1080x24 -ac +extension GLX +render -noreset &')
      await sandbox.process.executeCommand('sleep 3')
      
      // Step 2: Install GUI tools in one command for speed
      console.log('📦 Installing GUI tools...')
      await sandbox.process.executeCommand('apt-get update -qq && apt-get install -y -qq firefox-esr xvfb x11-utils imagemagick xdotool')
      
      // Step 3: Start Firefox with specific profile for automation
      console.log('🌐 Starting Firefox...')
      await sandbox.process.executeCommand('export DISPLAY=:99 && firefox-esr --new-instance --no-remote --profile /tmp/firefox-profile &')
      await sandbox.process.executeCommand('sleep 5')
      
      // Step 4: Take initial screenshot
      await sandbox.process.executeCommand('export DISPLAY=:99 && import -window root /tmp/desktop_start.png')
      
      // Step 5: Navigate to Twitter and login using OAuth
      console.log('🔐 Navigating to Twitter with OAuth authentication...')
      
      // Create a script that uses OAuth tokens to authenticate and extract followers
      const authScript = `
const puppeteer = require('puppeteer');

(async () => {
  console.log('🚀 Starting authenticated Twitter extraction...');
  
  const browser = await puppeteer.launch({
    headless: false,
    executablePath: '/usr/bin/firefox-esr',
    args: ['--display=:99', '--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  
  // Set OAuth tokens in browser storage
  await page.evaluateOnNewDocument(() => {
    localStorage.setItem('twitter_oauth_token', '${accessToken}');
    localStorage.setItem('twitter_oauth_token_secret', '${accessTokenSecret}');
  });
  
  // Navigate to followers page directly with authentication
  console.log('📍 Navigating to followers page...');
  await page.goto('https://twitter.com/${username}/followers', { waitUntil: 'networkidle2' });
  
  // Wait for page to load
  await page.waitForTimeout(5000);
  
  // Extract followers by scrolling and collecting
  console.log('📜 Scrolling and extracting followers...');
  const followers = [];
  
  for (let i = 0; i < 10; i++) {
    // Scroll down
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(2000);
    
    // Extract visible followers
    const newFollowers = await page.evaluate(() => {
      const followerElements = document.querySelectorAll('[data-testid="UserCell"]');
      const extracted = [];
      
      followerElements.forEach(element => {
        const usernameElement = element.querySelector('[data-testid="UserName"] a');
        const displayNameElement = element.querySelector('[data-testid="UserName"] span');
        
        if (usernameElement && displayNameElement) {
          const username = usernameElement.href.split('/').pop();
          const displayName = displayNameElement.textContent;
          
          if (username && displayName) {
            extracted.push({ username, displayName });
          }
        }
      });
      
      return extracted;
    });
    
    followers.push(...newFollowers);
    console.log(\`📊 Extracted \${followers.length} followers so far...\`);
    
    if (followers.length > 50) break; // Stop at reasonable number for testing
  }
  
  // Remove duplicates
  const uniqueFollowers = followers.filter((follower, index, self) => 
    index === self.findIndex(f => f.username === follower.username)
  );
  
  console.log(\`✅ Final extraction: \${uniqueFollowers.length} unique followers\`);
  
  // Save results
  const result = {
    followers: uniqueFollowers,
    followerCount: uniqueFollowers.length,
    scanDate: new Date().toISOString(),
    status: 'gui_success',
    username: '${username}',
    strategy: 'Real-GUI-Automation'
  };
  
  require('fs').writeFileSync('/tmp/followers_result.json', JSON.stringify(result, null, 2));
  
  await browser.close();
  console.log('🎯 GUI extraction completed successfully!');
})().catch(console.error);
`;
      
      // Save and execute the authentication script
      await sandbox.fs.uploadFile('/tmp/auth_extract.js', authScript)
      
      // Install puppeteer and run the script
      console.log('📦 Installing Puppeteer...')
      await sandbox.process.executeCommand('cd /tmp && npm init -y && npm install puppeteer')
      
      console.log('🚀 Executing authenticated extraction...')
      const extractResult = await sandbox.process.executeCommand('cd /tmp && export DISPLAY=:99 && node auth_extract.js')
      
      console.log('📊 Extraction output:', extractResult.result)
      
      // Read the results
      const resultFile = await sandbox.fs.readFile('/tmp/followers_result.json')
      const result = JSON.parse(resultFile)
      
      console.log('✅ GUI extraction completed: ' + result.followerCount + ' followers found')
      
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
