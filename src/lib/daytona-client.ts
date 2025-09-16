import { Daytona } from '@daytonaio/sdk'

// Initialize Daytona client with configuration
export const daytonaClient = new Daytona({
  apiKey: process.env.DAYTONA_API_KEY!,
  apiUrl: 'https://app.daytona.io/api',
  target: 'us'
})

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
    const sandbox = await daytonaClient.create({
      language: 'typescript',
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

    return sandbox
  }

  /**
   * Set up the sandbox environment with required dependencies
   */
  static async setupSandboxEnvironment(sandbox: any) {
    // Install required packages
    await sandbox.process.executeCommand('npm init -y')
    await sandbox.process.executeCommand('npm install playwright @playwright/test axios')
    
    // Install Playwright browsers
    await sandbox.process.executeCommand('npx playwright install chromium')
    
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

  async authenticateWithCookies(cookies) {
    if (cookies && cookies.length > 0) {
      await this.page.context().addCookies(cookies);
    }
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
    const cookiesJson = process.env.TWITTER_COOKIES;
    
    if (!username) {
      throw new Error('TWITTER_USERNAME environment variable is required');
    }
    
    // Parse cookies if provided
    let cookies = [];
    if (cookiesJson) {
      try {
        cookies = JSON.parse(cookiesJson);
      } catch (error) {
        console.warn('Failed to parse cookies, proceeding without authentication');
      }
    }
    
    // Authenticate and scrape
    await scraper.authenticateWithCookies(cookies);
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
    twitterCookies?: any[]
  ): Promise<FollowerScanResult> {
    try {
      // Set environment variables for the scraper
      const envVars = {
        TWITTER_USERNAME: twitterUsername,
        TWITTER_COOKIES: twitterCookies ? JSON.stringify(twitterCookies) : ''
      }

      // Create a session for running the scraper
      const sessionId = 'follower-scan-session'
      await sandbox.process.createSession(sessionId)

      // Set environment variables in the session
      for (const [key, value] of Object.entries(envVars)) {
        await sandbox.process.executeSessionCommand(sessionId, {
          command: `export ${key}="${value}"`,
          async: false
        })
      }

      // Execute the scraper
      const result = await sandbox.process.executeSessionCommand(sessionId, {
        command: 'node twitter-scraper.js',
        async: false
      })

      if (result.exitCode !== 0) {
        throw new Error(`Scraper failed with exit code ${result.exitCode}: ${result.result}`)
      }

      // Download the results file
      const resultsContent = await sandbox.fs.downloadFile('/tmp/followers_result.json')
      const scanResult = JSON.parse(resultsContent.toString())

      return {
        followers: scanResult.followers,
        followerCount: scanResult.followerCount,
        scanDate: new Date(scanResult.scanDate),
        status: scanResult.status,
        error: scanResult.error
      }

    } catch (error) {
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
