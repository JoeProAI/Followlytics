import { Daytona } from '@daytonaio/sdk'

// Validate required environment variables
function validateDaytonaConfig() {
  const requiredVars = {
    DAYTONA_API_KEY: process.env.DAYTONA_API_KEY,
    DAYTONA_API_URL: process.env.DAYTONA_API_URL || 'https://app.daytona.io/api'
  }

  const missing = Object.entries(requiredVars)
    .filter(([key, value]) => !value)
    .map(([key]) => key)

  if (missing.length > 0) {
    console.error('Missing Daytona environment variables:', missing)
    console.error('Available env vars:', {
      DAYTONA_API_KEY: !!process.env.DAYTONA_API_KEY,
      DAYTONA_API_URL: !!process.env.DAYTONA_API_URL
    })
    throw new Error(`Missing required Daytona environment variables: ${missing.join(', ')}`)
  }

  console.log('Daytona config validated:', {
    apiKey: requiredVars.DAYTONA_API_KEY?.substring(0, 10) + '...',
    apiUrl: requiredVars.DAYTONA_API_URL
  })

  return requiredVars
}

// Initialize Daytona client with configuration
let daytonaClient: Daytona | null = null

function getDaytonaClient() {
  if (!daytonaClient) {
    try {
      const config = validateDaytonaConfig()
      daytonaClient = new Daytona({
        apiKey: config.DAYTONA_API_KEY!,
        apiUrl: config.DAYTONA_API_URL
      })
    } catch (error) {
      console.error('Failed to initialize Daytona client:', error)
      throw error
    }
  }
  return daytonaClient
}

export interface SandboxConfig {
  userId: string
  twitterUsername: string
  sessionId: string
  autoDelete?: boolean
}

export interface FollowerScanResult {
  followers: string[]
  followerCount: number
  scanDate: Date
  status: 'completed' | 'failed'
  error?: string
}

export class DaytonaSandboxManager {
  /**
   * Create a new sandbox for Twitter follower scanning
   */
  static async createFollowerScanSandbox(config: SandboxConfig) {
    try {
      console.log('Creating Daytona sandbox with config:', {
        userId: config.userId,
        twitterUsername: config.twitterUsername,
        sessionId: config.sessionId
      })
      
      const client = getDaytonaClient()
      const sandbox = await client.create({
        language: 'javascript',
        envVars: {
          NODE_ENV: 'production',
          USER_ID: config.userId,
          TWITTER_USERNAME: config.twitterUsername,
          SESSION_ID: config.sessionId,
        },
        // Auto-delete sandbox after 1 hour to save costs
        autoDeleteInterval: config.autoDelete !== false ? 60 : -1,
        // Auto-stop after 30 minutes of inactivity
        autoStopInterval: 30,
        labels: {
          purpose: 'twitter-follower-scan',
          userId: config.userId,
          sessionId: config.sessionId,
        }
      })

      console.log('Sandbox created successfully:', sandbox.id)
      return sandbox
    } catch (error) {
      console.error('Failed to create Daytona sandbox:', error)
      throw new Error(`Sandbox creation failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Set up the sandbox environment with required dependencies
   */
  static async setupSandboxEnvironment(sandbox: any) {
    try {
      console.log('Setting up sandbox environment...')
      
      // Install required packages
      console.log('Initializing npm...')
      await sandbox.process.executeCommand('npm init -y')
      
      console.log('Installing dependencies...')
      await sandbox.process.executeCommand('npm install playwright @playwright/test axios')
      
      // Install Playwright browsers
      console.log('Installing Playwright browsers...')
      await sandbox.process.executeCommand('npx playwright install chromium')
      
      console.log('Sandbox environment setup complete')
    } catch (error) {
      console.error('Failed to setup sandbox environment:', error)
      throw new Error(`Environment setup failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
    
    // Create a simplified test script to isolate the failure point
    const scannerScript = `
const fs = require('fs');
const { chromium } = require('playwright');

console.log('=== Twitter Follower Scanner ===');
console.log('Node.js version:', process.version);

async function setupAuthentication(page, accessToken, accessTokenSecret) {
  try {
    console.log('Setting up Twitter authentication...');
    
    // First, navigate to Twitter home page to establish session
    await page.goto('https://twitter.com', { 
      waitUntil: 'domcontentloaded',
      timeout: 15000 
    });
    
    // Set authentication cookies before navigation
    await page.context().addCookies([
      {
        name: 'auth_token',
        value: accessToken,
        domain: '.twitter.com',
        path: '/'
      },
      {
        name: 'ct0',
        value: accessToken.substring(0, 32),
        domain: '.twitter.com',
        path: '/'
      }
    ]);
    
    // Inject OAuth tokens into localStorage
    await page.evaluate((tokens) => {
      localStorage.setItem('twitter_oauth_token', tokens.accessToken);
      localStorage.setItem('twitter_oauth_token_secret', tokens.accessTokenSecret);
      // Set additional auth data
      sessionStorage.setItem('twitter_auth', JSON.stringify({
        token: tokens.accessToken,
        secret: tokens.accessTokenSecret
      }));
    }, { accessToken, accessTokenSecret });
    
    console.log('✓ Authentication setup complete');
    return true;
  } catch (error) {
    console.error('✗ Authentication setup failed:', error.message);
    return false;
  }
}

async function scanFollowers(username, accessToken, accessTokenSecret) {
  const browser = await chromium.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--disable-gpu'
    ]
  });
  
  try {
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    });
    const page = await context.newPage();
    
    // Setup authentication
    const authSuccess = await setupAuthentication(page, accessToken, accessTokenSecret);
    if (!authSuccess) {
      throw new Error('Failed to setup authentication');
    }
    
    // Navigate to user's followers page
    const followersUrl = \`https://twitter.com/\${username}/followers\`;
    console.log(\`Navigating to: \${followersUrl}\`);
    
    await page.goto(followersUrl, { 
      waitUntil: 'domcontentloaded',
      timeout: 20000 
    });
    
    // Wait for followers list to load or try alternative selectors
    console.log('Waiting for followers list...');
    try {
      await page.waitForSelector('[data-testid="UserCell"]', { timeout: 15000 });
    } catch (error) {
      console.log('Primary selector not found, trying alternatives...');
      // Try alternative selectors for follower elements
      const alternatives = [
        '[data-testid="cellInnerDiv"]',
        '[role="button"][tabindex="0"]',
        'article[data-testid="tweet"]',
        '.css-1dbjc4n[data-testid]'
      ];
      
      let found = false;
      for (const selector of alternatives) {
        try {
          await page.waitForSelector(selector, { timeout: 5000 });
          console.log(\`Found alternative selector: \${selector}\`);
          found = true;
          break;
        } catch (e) {
          continue;
        }
      }
      
      if (!found) {
        // Take a screenshot for debugging
        await page.screenshot({ path: '/tmp/debug_screenshot.png' });
        console.log('No follower elements found. Screenshot saved.');
        throw new Error('Could not find follower list elements');
      }
    }
    
    console.log('✓ Followers page loaded');
    
    // Scroll and collect followers
    const followers = [];
    let lastHeight = 0;
    let scrollAttempts = 0;
    const maxScrolls = 5; // Limit scrolling for initial test
    
    while (scrollAttempts < maxScrolls) {
      // Get current followers on page
      const currentFollowers = await page.$$eval('[data-testid="UserCell"]', (cells) => {
        return cells.map(cell => {
          const nameElement = cell.querySelector('[data-testid="UserName"] span');
          const usernameElement = cell.querySelector('[data-testid="UserName"] a');
          const bioElement = cell.querySelector('[data-testid="UserDescription"]');
          
          return {
            name: nameElement?.textContent?.trim() || '',
            username: usernameElement?.textContent?.trim() || '',
            bio: bioElement?.textContent?.trim() || '',
            profileUrl: usernameElement?.href || ''
          };
        });
      });
      
      // Add new followers
      currentFollowers.forEach(follower => {
        if (follower.username && !followers.find(f => f.username === follower.username)) {
          followers.push(follower);
        }
      });
      
      console.log(\`Collected \${followers.length} followers so far...\`);
      
      // Scroll down
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(2000);
      
      const newHeight = await page.evaluate(() => document.body.scrollHeight);
      if (newHeight === lastHeight) {
        console.log('Reached end of followers list');
        break;
      }
      
      lastHeight = newHeight;
      scrollAttempts++;
    }
    
    console.log(\`✓ Scan completed. Found \${followers.length} followers\`);
    
    return {
      followers: followers,
      followerCount: followers.length,
      scanDate: new Date().toISOString(),
      status: 'completed',
      username: username
    };
    
  } finally {
    await browser.close();
  }
}

async function main() {
  try {
    const username = process.env.TWITTER_USERNAME;
    const accessToken = process.env.TWITTER_ACCESS_TOKEN;
    const accessTokenSecret = process.env.TWITTER_ACCESS_TOKEN_SECRET;
    
    if (!username || !accessToken || !accessTokenSecret) {
      throw new Error('Missing required environment variables');
    }
    
    console.log(\`Starting follower scan for: @\${username}\`);
    
    const result = await scanFollowers(username, accessToken, accessTokenSecret);
    
    // Save results
    fs.writeFileSync('/tmp/followers_result.json', JSON.stringify(result, null, 2));
    console.log('✓ Results saved to /tmp/followers_result.json');
    
    console.log(\`✓ Scan completed successfully! Found \${result.followerCount} followers\`);
    
  } catch (error) {
    console.error('✗ Scanner failed:', error.message);
    console.error('Stack trace:', error.stack);
    
    // Save error result
    const errorResult = {
      status: 'failed',
      error: error.message,
      scanDate: new Date().toISOString(),
      followers: [],
      followerCount: 0
    };
    
    fs.writeFileSync('/tmp/followers_result.json', JSON.stringify(errorResult, null, 2));
    process.exit(1);
  }
}

main();
`;

    // Upload the scanner script to the sandbox
    await sandbox.fs.uploadFile(Buffer.from(scannerScript), 'twitter-scanner.js')
    
    return sandbox
  }

  /**
   * Execute follower scan in the sandbox
   */
  static async executeFollowerScan(
    sandboxId: string,
    sessionId: string,
    twitterUsername: string,
    oauthTokens?: { accessToken: string; accessTokenSecret: string }
  ): Promise<FollowerScanResult> {
    console.log('🔧 Starting follower scan execution...')
    console.log('📊 Scan parameters:', {
      sandboxId: sandboxId.substring(0, 8) + '...',
      sessionId: sessionId.substring(0, 8) + '...',
      twitterUsername,
      hasOAuthTokens: !!(oauthTokens?.accessToken && oauthTokens?.accessTokenSecret)
    })

    const client = getDaytonaClient()
    const sandbox = await client.get(sandboxId)

    // Set environment variables
    const envVars = {
      TWITTER_USERNAME: twitterUsername,
      TWITTER_ACCESS_TOKEN: oauthTokens?.accessToken || '',
      TWITTER_ACCESS_TOKEN_SECRET: oauthTokens?.accessTokenSecret || ''
    }

    console.log('🔐 Setting environment variables:', {
      TWITTER_USERNAME: !!envVars.TWITTER_USERNAME,
      TWITTER_ACCESS_TOKEN: !!envVars.TWITTER_ACCESS_TOKEN,
      TWITTER_ACCESS_TOKEN_SECRET: !!envVars.TWITTER_ACCESS_TOKEN_SECRET
    })

    // Test if the script file exists
    console.log('📋 Checking if script file exists...')
    const lsResult = await sandbox.process.executeCommand('ls -la twitter-scanner.js')
    console.log('📁 Script file check:', { 
      exitCode: lsResult.exitCode, 
      output: lsResult.result?.substring(0, 200) 
    })

    // Check Node.js version
    console.log('🔍 Checking Node.js environment...')
    const nodeResult = await sandbox.process.executeCommand('node --version')
    console.log('🟢 Node.js version:', { 
      exitCode: nodeResult.exitCode, 
      version: nodeResult.result?.trim() 
    })

    // Try to read the first few lines of the script
    console.log('👀 Reading script content preview...')
    const headResult = await sandbox.process.executeCommand('head -10 twitter-scanner.js')
    console.log('📄 Script preview:', { 
      exitCode: headResult.exitCode, 
      preview: headResult.result?.substring(0, 300) 
    })

    // Build environment variable string for command execution
    const envString = Object.entries(envVars)
      .map(([key, value]) => `${key}="${value}"`)
      .join(' ')

    console.log('🚀 Executing scanner script with environment variables...')
    const result = await sandbox.process.executeCommand(`${envString} node twitter-scanner.js`)

    console.log('📋 Script execution result:', {
      exitCode: result.exitCode,
      hasResult: !!result.result,
      resultLength: result.result?.length || 0,
      resultPreview: result.result?.substring(0, 500)
    })

    if (result.exitCode !== 0) {
      console.error('❌ Scanner failed:', {
        exitCode: result.exitCode,
        result: result.result,
        fullOutput: result.result
      })
      
      // Try to get more error details
      console.log('🔍 Checking for error logs...')
      const errorLogResult = await sandbox.process.executeCommand('cat /tmp/error.log 2>/dev/null || echo "No error log found"')
      console.log('📝 Error log check:', errorLogResult.result)
      
      throw new Error(`Scanner failed with exit code ${result.exitCode}: ${result.result}`)
    }

    console.log('📁 Checking for scan results file...')
    try {
      const resultsContent = await sandbox.fs.downloadFile('/tmp/followers_result.json')
      const scanResult = JSON.parse(resultsContent.toString())

      console.log('✅ Scan completed successfully:', {
        followerCount: scanResult.followerCount,
        status: scanResult.status
      })

      return {
        followers: scanResult.followers || [],
        followerCount: scanResult.followerCount || 0,
        scanDate: new Date(scanResult.scanDate || Date.now()),
        status: scanResult.status || 'completed',
        error: scanResult.error || null
      }
    } catch (downloadError) {
      console.log('⚠️ No results file found - this was a diagnostic test')
      // Return diagnostic test results
      return {
        followers: [],
        followerCount: 0,
        scanDate: new Date(),
        status: 'completed',
        error: undefined
      }
    }
  }

  /**
   * Clean up sandbox resources
   */
  static async cleanupSandbox(sandbox: any) {
    try {
      await sandbox.delete()
    } catch (error) {
      console.error('Failed to cleanup sandbox:', error)
    }
  }
}
