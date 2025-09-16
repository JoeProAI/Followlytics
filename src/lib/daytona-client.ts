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
    
    // Create the Twitter scraper script
    const scraperScript = `
const { chromium } = require('playwright');
const fs = require('fs');

class TwitterFollowerScraper {
  constructor() {
    this.browser = null;
    this.page = null;
    this.followers = [];
  }

  async initialize() {
    this.browser = await chromium.launch({
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
    
    this.page = await this.browser.newPage();
    
    // Set user agent to avoid detection
    await this.page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
  }

  async authenticateWithOAuth(accessToken, accessTokenSecret) {
    // Navigate to Twitter login page
    await this.page.goto('https://twitter.com/login', { waitUntil: 'networkidle' });
    
    // Inject OAuth tokens into localStorage for authentication
    await this.page.evaluate((tokens) => {
      localStorage.setItem('twitter_oauth_token', tokens.accessToken);
      localStorage.setItem('twitter_oauth_token_secret', tokens.accessTokenSecret);
      
      // Also try setting as cookies for broader compatibility
      document.cookie = \`oauth_token=\${tokens.accessToken}; domain=.twitter.com; path=/\`;
      document.cookie = \`oauth_token_secret=\${tokens.accessTokenSecret}; domain=.twitter.com; path=/\`;
    }, { accessToken, accessTokenSecret });
    
    // Try to navigate to home page to verify authentication
    await this.page.goto('https://twitter.com/home', { waitUntil: 'networkidle' });
    await this.page.waitForTimeout(2000);
  }

  async navigateToFollowersPage(username) {
    const followersUrl = \`https://twitter.com/\${username}/followers\`;
    await this.page.goto(followersUrl, { waitUntil: 'networkidle' });
    
    // Wait for the page to load
    await this.page.waitForTimeout(3000);
    
    // Check if we're logged in
    const isLoggedIn = await this.page.locator('[data-testid="primaryColumn"]').isVisible();
    if (!isLoggedIn) {
      throw new Error('Not authenticated - please provide valid Twitter session cookies');
    }
  }

  async scrapeFollowers(maxFollowers = 1000) {
    const followers = new Set();
    let scrollAttempts = 0;
    const maxScrollAttempts = 50;
    
    while (followers.size < maxFollowers && scrollAttempts < maxScrollAttempts) {
      // Get current follower elements
      const followerElements = await this.page.locator('[data-testid="cellInnerDiv"]').all();
      
      for (const element of followerElements) {
        try {
          const usernameElement = await element.locator('a[href*="/"]').first();
          const href = await usernameElement.getAttribute('href');
          
          if (href && href.startsWith('/') && href.length > 1) {
            const username = href.substring(1);
            if (username && !username.includes('/') && username.length > 0) {
              followers.add(username);
            }
          }
        } catch (error) {
          // Skip invalid elements
          continue;
        }
      }
      
      // Scroll down to load more followers
      await this.page.evaluate(() => {
        window.scrollTo(0, document.body.scrollHeight);
      });
      
      // Wait for new content to load
      await this.page.waitForTimeout(2000);
      scrollAttempts++;
      
      // Progress logging
      console.log(\`Scraped \${followers.size} followers so far...\`);
    }
    
    return Array.from(followers);
  }

  async cleanup() {
    if (this.browser) {
      await this.browser.close();
    }
  }
}

async function main() {
  const scraper = new TwitterFollowerScraper();
  
  try {
    await scraper.initialize();
    
    // Get environment variables
    const username = process.env.TWITTER_USERNAME;
    const accessToken = process.env.TWITTER_ACCESS_TOKEN;
    const accessTokenSecret = process.env.TWITTER_ACCESS_TOKEN_SECRET;
    
    if (!username) {
      throw new Error('TWITTER_USERNAME environment variable is required');
    }
    
    if (!accessToken || !accessTokenSecret) {
      throw new Error('Twitter OAuth tokens are required for authentication');
    }
    
    // Navigate to Twitter login and inject OAuth tokens
    await scraper.authenticateWithOAuth(accessToken, accessTokenSecret);
    await scraper.navigateToFollowersPage(username);
    
    const followers = await scraper.scrapeFollowers();
    
    // Save results
    const result = {
      followers,
      followerCount: followers.length,
      scanDate: new Date().toISOString(),
      status: 'completed',
      username
    };
    
    fs.writeFileSync('/tmp/followers_result.json', JSON.stringify(result, null, 2));
    console.log(\`Successfully scraped \${followers.length} followers for @\${username}\`);
    
  } catch (error) {
    const errorResult = {
      followers: [],
      followerCount: 0,
      scanDate: new Date().toISOString(),
      status: 'failed',
      error: error.message
    };
    
    fs.writeFileSync('/tmp/followers_result.json', JSON.stringify(errorResult, null, 2));
    console.error('Scraping failed:', error.message);
    process.exit(1);
  } finally {
    await scraper.cleanup();
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
