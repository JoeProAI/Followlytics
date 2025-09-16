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
    const scraperScript = `
const fs = require('fs');

console.log('=== Twitter Scraper Test Script ===');
console.log('Node.js version:', process.version);
console.log('Environment check:');
console.log('- TWITTER_USERNAME:', !!process.env.TWITTER_USERNAME);
console.log('- TWITTER_ACCESS_TOKEN:', !!process.env.TWITTER_ACCESS_TOKEN);
console.log('- TWITTER_ACCESS_TOKEN_SECRET:', !!process.env.TWITTER_ACCESS_TOKEN_SECRET);

async function testPlaywright() {
  try {
    console.log('Testing Playwright import...');
    const { chromium } = require('playwright');
    console.log('✓ Playwright imported successfully');
    
    console.log('Testing browser launch...');
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
    console.log('✓ Browser launched successfully');
    
    console.log('Testing page creation...');
    const page = await browser.newPage();
    console.log('✓ Page created successfully');
    
    console.log('Testing navigation...');
    await page.goto('https://httpbin.org/json', { waitUntil: 'networkidle' });
    console.log('✓ Navigation successful');
    
    await browser.close();
    console.log('✓ Browser closed successfully');
    
    return true;
  } catch (error) {
    console.error('✗ Playwright test failed:', error.message);
    console.error('Stack trace:', error.stack);
    return false;
  }
}

async function main() {
  try {
    console.log('Starting diagnostic tests...');
    
    // Test environment variables
    const username = process.env.TWITTER_USERNAME;
    const accessToken = process.env.TWITTER_ACCESS_TOKEN;
    const accessTokenSecret = process.env.TWITTER_ACCESS_TOKEN_SECRET;
    
    if (!username) {
      throw new Error('TWITTER_USERNAME environment variable is required');
    }
    
    if (!accessToken || !accessTokenSecret) {
      throw new Error('Twitter OAuth tokens are required for authentication');
    }
    
    console.log('✓ Environment variables validated');
    
    // Test Playwright
    const playwrightWorking = await testPlaywright();
    
    if (!playwrightWorking) {
      throw new Error('Playwright test failed');
    }
    
    // Save success result
    const result = {
      status: 'test_completed',
      message: 'All diagnostic tests passed',
      timestamp: new Date().toISOString(),
      tests: {
        environment: true,
        playwright: true,
        browser: true,
        navigation: true
      }
    };
    
    fs.writeFileSync('/tmp/followers_result.json', JSON.stringify(result, null, 2));
    console.log('✓ All tests completed successfully');
    
  } catch (error) {
    console.error('✗ Test failed:', error.message);
    console.error('Stack trace:', error.stack);
    
    const errorResult = {
      status: 'test_failed',
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    };
    
    fs.writeFileSync('/tmp/followers_result.json', JSON.stringify(errorResult, null, 2));
    process.exit(1);
  }
}

main();
`;

    // Upload the scraper script to the sandbox
    await sandbox.fs.uploadFile(Buffer.from(scraperScript), 'twitter-scraper.js')
    
    return sandbox
  }

  /**
   * Execute follower scan in the sandbox
   */
  static async executeFollowerScan(
    sandbox: any, 
    twitterUsername: string, 
    oauthTokens?: { accessToken: string, accessTokenSecret: string }
  ): Promise<FollowerScanResult> {
    try {
      console.log('Executing follower scan for:', twitterUsername)
      console.log('OAuth tokens provided:', !!oauthTokens?.accessToken && !!oauthTokens?.accessTokenSecret)

      // Set environment variables for the scraper
      const envVars = {
        TWITTER_USERNAME: twitterUsername,
        TWITTER_ACCESS_TOKEN: oauthTokens?.accessToken || '',
        TWITTER_ACCESS_TOKEN_SECRET: oauthTokens?.accessTokenSecret || ''
      }

      // Create a session for running the scraper
      const sessionId = 'follower-scan-session'
      console.log('Creating sandbox session...')
      await sandbox.process.createSession(sessionId)

      // Set environment variables in the session
      console.log('Setting environment variables...')
      for (const [key, value] of Object.entries(envVars)) {
        await sandbox.process.executeSessionCommand(sessionId, {
          command: `export ${key}="${value}"`,
          async: false
        })
      }

      // Execute the scraper
      console.log('Executing scraper script...')
      const result = await sandbox.process.executeSessionCommand(sessionId, {
        command: 'node twitter-scraper.js',
        async: false
      })

      console.log('Scraper execution result:', {
        exitCode: result.exitCode,
        output: result.result?.substring(0, 500) + '...'
      })

      if (result.exitCode !== 0) {
        console.error('Scraper failed with exit code:', result.exitCode)
        console.error('Error output:', result.result)
        throw new Error(`Scraper failed with exit code ${result.exitCode}: ${result.result}`)
      }

      // Download the results file
      console.log('Downloading results file...')
      const resultsContent = await sandbox.fs.downloadFile('/tmp/followers_result.json')
      const scanResult = JSON.parse(resultsContent.toString())

      console.log('Scan completed successfully:', {
        followerCount: scanResult.followerCount,
        status: scanResult.status
      })

      return {
        followers: scanResult.followers,
        followerCount: scanResult.followerCount,
        scanDate: new Date(scanResult.scanDate),
        status: scanResult.status,
        error: scanResult.error
      }

    } catch (error) {
      console.error('Follower scan execution failed:', error)
      return {
        followers: [],
        followerCount: 0,
        scanDate: new Date(),
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error'
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
