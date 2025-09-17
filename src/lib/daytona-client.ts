// Direct HTTP API approach to avoid SDK compatibility issues
async function makeDaytonaRequest(endpoint: string, method: string = 'GET', body?: any) {
  const apiKey = process.env.DAYTONA_API_KEY
  const apiUrl = process.env.DAYTONA_API_URL || 'https://app.daytona.io/api'
  
  if (!apiKey) {
    throw new Error('DAYTONA_API_KEY is required')
  }

  const response = await fetch(`${apiUrl}${endpoint}`, {
    method,
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: body ? JSON.stringify(body) : undefined
  })

  if (!response.ok) {
    throw new Error(`Daytona API error: ${response.status} ${response.statusText}`)
  }

  return response.json()
}

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
      // Create a fresh new sandbox each time
      const createPayload = {
        name: config.name,
        repository: config.repository || 'https://github.com/microsoft/vscode-dev-containers',
        image: config.image || 'node:18'
      }
      
      console.log('Creating new sandbox:', createPayload)
      const sandbox = await makeDaytonaRequest('/sandbox', 'POST', createPayload)
      
      // Add the process.executeCommand method to the sandbox object
      sandbox.process = {
        executeCommand: async (command: string) => {
          console.log(`Executing command in sandbox ${sandbox.id}: ${command}`)
          const result = await makeDaytonaRequest(`/toolbox/${sandbox.id}/toolbox/process/execute`, 'POST', {
            command: command
          })
          return result
        }
      }
      
      console.log('✅ Created NEW sandbox:', sandbox.id)
      return sandbox
    } catch (error) {
      console.error('❌ Failed to create sandbox:', error)
      throw new Error(`Sandbox creation failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  static async setupSandboxEnvironment(sandbox: any): Promise<void> {
    console.log('Setting up sandbox environment...')
    
    try {
      // Install Node.js dependencies
      console.log('Installing Node.js dependencies...')
      await sandbox.process.executeCommand('npm init -y')
      await sandbox.process.executeCommand('npm install playwright puppeteer --save')
      
      // Install Playwright browsers
      console.log('Installing Playwright browsers...')
      await sandbox.process.executeCommand('npx playwright install chromium')
      
      console.log('✅ Sandbox environment setup complete')
    } catch (error) {
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
        
        // Remove automation indicators
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
    
    // Inject OAuth tokens
    await page.addInitScript(() => {
      localStorage.setItem('twitter_access_token', '${accessToken}');
      localStorage.setItem('twitter_access_token_secret', '${accessTokenSecret}');
    });
    
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
          waitUntil: 'networkidle',
          timeout: 45000 
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
      } catch (error: any) {
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
      
      throw new Error('No follower elements or usernames found');
    }
    
    // Extract followers with scrolling
    let followers = [];
    const maxScrolls = 100;
    let consecutiveEmptyScrolls = 0;
    
    for (let i = 0; i < maxScrolls && consecutiveEmptyScrolls < 10; i++) {
      const newFollowers = await page.evaluate((selector) => {
        const elements = document.querySelectorAll(selector);
        const extracted = [];
        
        elements.forEach(element => {
          try {
            let username = null;
            let displayName = null;
            
            // Extract username from links
            const usernameLink = element.querySelector('a[href*="/"]');
            if (usernameLink && usernameLink.href) {
              const match = usernameLink.href.match(/(?:twitter\\.com|x\\.com)\\/([^/?]+)/);
              if (match && match[1] !== 'home' && match[1] !== 'explore') {
                username = match[1];
              }
            }
            
            // Extract display name
            const nameElement = element.querySelector('[dir="ltr"]') || 
                              element.querySelector('span');
            if (nameElement) {
              displayName = nameElement.textContent?.trim();
            }
            
            if (username && username.length > 0) {
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
      } else {
        consecutiveEmptyScrolls++;
      }
      
      // Scroll down
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(1500);
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
      
      // If we get a good result, we can stop early
      if (result.followerCount > 50) {
        console.log(\`🎯 Strategy \${strategy.name} found \${result.followerCount} followers - using this result\`);
        break;
      }
      
    } catch (error) {
      console.log(\`❌ Strategy \${strategy.name} failed: \${error.message}\`);
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
    } catch (error) {
      console.error('❌ Failed to upload scanner script:', error)
      throw new Error(`Script upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }

    // Set environment variables for the scan
    const envVars = {
      TWITTER_USERNAME: username,
      TWITTER_ACCESS_TOKEN: accessToken,
      TWITTER_ACCESS_TOKEN_SECRET: accessTokenSecret
    }

    console.log('🔧 Setting environment variables...')
    for (const [key, value] of Object.entries(envVars)) {
      if (value) {
        await sandbox.process.executeCommand(`export ${key}="${value}"`)
      }
    }

    console.log('🚀 Executing multi-browser Twitter scanner...')
    
    // First, check where we are and where the file is
    await sandbox.process.executeCommand('pwd && ls -la && ls -la twitter-scanner.js')
    
    // Execute the scanner with timeout
    const timeoutMs = 10 * 60 * 1000 // 10 minutes
    const startTime = Date.now()
    
    try {
      const result = await Promise.race([
        sandbox.process.executeCommand('node ./twitter-scanner.js'),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Scanner execution timeout')), timeoutMs)
        )
      ])
      
      console.log('✅ Scanner execution completed')
      console.log('📊 Scanner output:', result)
      
    } catch (error) {
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
      const resultContent = await sandbox.process.executeCommand('cat /tmp/followers_result.json')
      const scanResult = JSON.parse(resultContent as string)
      
      console.log('📊 Scan completed successfully:', {
        followerCount: scanResult.followerCount,
        status: scanResult.status,
        strategy: scanResult.strategy || 'unknown'
      })
      
      return scanResult
      
    } catch (error) {
      console.error('❌ Failed to retrieve scan results:', error)
      
      // Return a fallback result
      return {
        followers: [],
        followerCount: 0,
        scanDate: new Date().toISOString(),
        status: 'execution_failed',
        username: username,
        error: `Scanner execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        executionTime: Date.now() - startTime
      }
    }
  }

  // Robust script upload with multiple fallback methods
  private static async uploadScriptWithFallback(sandbox: any, scriptContent: string, filename: string): Promise<void> {
    const methods = [
      {
        name: 'Direct file write',
        execute: async () => {
          await sandbox.process.executeCommand(`cat > ${filename} << 'SCRIPT_EOF'\n${scriptContent}\nSCRIPT_EOF`)
        }
      },
      {
        name: 'Base64 upload',
        execute: async () => {
          const base64Content = Buffer.from(scriptContent).toString('base64')
          await sandbox.process.executeCommand(`echo "${base64Content}" | base64 -d > ${filename}`)
        }
      },
      {
        name: 'Echo method',
        execute: async () => {
          // Split into smaller chunks to avoid command line length limits
          const chunks = scriptContent.match(/.{1,1000}/g) || []
          await sandbox.process.executeCommand(`echo -n "" > ${filename}`) // Create empty file
          
          for (const chunk of chunks) {
            const escapedChunk = chunk.replace(/'/g, "'\"'\"'")
            await sandbox.process.executeCommand(`echo -n '${escapedChunk}' >> ${filename}`)
          }
        }
      }
    ]

    for (const method of methods) {
      try {
        console.log(`📤 Trying upload method: ${method.name}`)
        await method.execute()
        
        // Verify the file was created and has content
        const fileCheck = await sandbox.process.executeCommand(`ls -la ${filename} && head -n 5 ${filename}`)
        console.log(`✅ ${method.name} succeeded:`, fileCheck)
        return
        
      } catch (error) {
        console.log(`❌ ${method.name} failed:`, error)
      }
    }
    
    throw new Error('All upload methods failed')
  }

  static async cleanupSandbox(sandbox: any): Promise<void> {
    try {
      console.log('🧹 Cleaning up sandbox:', sandbox.id)
      await makeDaytonaRequest(`/sandbox/${sandbox.id}?force=true`, 'DELETE')
      console.log('✅ Sandbox deleted successfully')
    } catch (error) {
      console.error('❌ Sandbox cleanup failed:', error)
      // Don't throw error on cleanup failure - it's not critical
    }
  }
}

export default DaytonaSandboxManager
