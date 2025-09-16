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
    const lsResult = await sandbox.process.executeCommand('ls -la twitter-scraper.js')
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
    const headResult = await sandbox.process.executeCommand('head -10 twitter-scraper.js')
    console.log('📄 Script preview:', { 
      exitCode: headResult.exitCode, 
      preview: headResult.result?.substring(0, 300) 
    })

    // Build environment variable string for command execution
    const envString = Object.entries(envVars)
      .map(([key, value]) => `${key}="${value}"`)
      .join(' ')

    console.log('🚀 Executing scraper script with environment variables...')
    const result = await sandbox.process.executeCommand(`${envString} node twitter-scraper.js`)

    console.log('📋 Script execution result:', {
      exitCode: result.exitCode,
      hasResult: !!result.result,
      resultLength: result.result?.length || 0,
      resultPreview: result.result?.substring(0, 500)
    })

    if (result.exitCode !== 0) {
      console.error('❌ Scraper failed:', {
        exitCode: result.exitCode,
        result: result.result,
        fullOutput: result.result
      })
      
      // Try to get more error details
      console.log('🔍 Checking for error logs...')
      const errorLogResult = await sandbox.process.executeCommand('cat /tmp/error.log 2>/dev/null || echo "No error log found"')
      console.log('📝 Error log check:', errorLogResult.result)
      
      throw new Error(`Scraper failed with exit code ${result.exitCode}: ${result.result}`)
    }

    console.log('📁 Downloading scan results...')
    const resultsContent = await sandbox.fs.downloadFile('/tmp/followers_result.json')
    const scanResult = JSON.parse(resultsContent.toString())

    console.log('✅ Scan completed successfully:', {
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
