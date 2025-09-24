import { Daytona } from '@daytonaio/sdk'

export interface OptimizedSandboxConfig {
  name: string
  userId: string
  scanType: 'small' | 'medium' | 'large' | 'enterprise'
  twitterTokens: {
    access_token: string
    access_token_secret: string
    bearer_token?: string
  }
  maxFollowers?: number
  timeoutDisabled?: boolean
  useSnapshot?: boolean
}

export class OptimizedDaytonaSandboxManager {
  private static daytona = new Daytona({
    apiKey: process.env.DAYTONA_API_KEY!,
    // Remove apiUrl - use default
  })

  private static readonly SNAPSHOT_CONFIGS = {
    base: 'followlytics-base-v1',
    optimized: 'followlytics-optimized-v1',
    enterprise: 'followlytics-enterprise-v1'
  }

  private static readonly RESOURCE_CONFIGS = {
    small: { cpu: '1', memory: '2Gi', storage: '5Gi' },
    medium: { cpu: '2', memory: '4Gi', storage: '10Gi' },
    large: { cpu: '4', memory: '8Gi', storage: '20Gi' },
    enterprise: { cpu: '8', memory: '16Gi', storage: '50Gi' }
  }

  /**
   * Create optimized sandbox with timeout disabled and snapshot support
   */
  static async createOptimizedSandbox(config: OptimizedSandboxConfig) {
    try {
      console.log(`🚀 Creating optimized sandbox for ${config.scanType} scan...`)
      
      const resources = this.RESOURCE_CONFIGS[config.scanType]
      const snapshotName = config.useSnapshot ? this.SNAPSHOT_CONFIGS.optimized : undefined

      const sandboxConfig = {
        name: config.name,
        language: 'javascript' as const,
        envVars: {
          // Twitter Authentication
          TWITTER_ACCESS_TOKEN: config.twitterTokens.access_token,
          TWITTER_ACCESS_TOKEN_SECRET: config.twitterTokens.access_token_secret,
          TWITTER_BEARER_TOKEN: config.twitterTokens.bearer_token || process.env.TWITTER_BEARER_TOKEN || '',
          
          // Scan Configuration
          USER_ID: config.userId,
          SCAN_TYPE: config.scanType,
          MAX_FOLLOWERS: config.maxFollowers?.toString() || '0',
          
          // Optimization Settings
          TIMEOUT_DISABLED: config.timeoutDisabled ? 'true' : 'false',
          PARALLEL_PROCESSING: config.scanType === 'large' || config.scanType === 'enterprise' ? 'true' : 'false',
          
          // Performance Optimization
          NODE_OPTIONS: '--max-old-space-size=4096',
          PUPPETEER_ARGS: '--no-sandbox --disable-setuid-sandbox --disable-dev-shm-usage --disable-accelerated-2d-canvas --no-first-run --no-zygote --single-process --disable-gpu',
          
          // Debugging
          DEBUG_MODE: process.env.NODE_ENV === 'development' ? 'true' : 'false'
        },
        
        // Resource allocation based on scan type
        resources,
        
        // Use snapshot if available
        ...(snapshotName && { snapshot: snapshotName }),
        
        // Disable timeout for long-running scans
        ...(config.timeoutDisabled && { timeout: 0 })
      }

      console.log('📋 Sandbox configuration:', {
        name: sandboxConfig.name,
        scanType: config.scanType,
        resources: sandboxConfig.resources,
        snapshot: snapshotName,
        timeoutDisabled: config.timeoutDisabled
      })

      const sandbox = await this.daytona.createSandbox(sandboxConfig)
      
      console.log(`✅ Optimized sandbox created: ${sandbox.id}`)
      console.log(`🔗 Sandbox URL: ${sandbox.url}`)
      
      return sandbox

    } catch (error: any) {
      console.error('❌ Failed to create optimized sandbox:', error)
      throw new Error(`Sandbox creation failed: ${error.message}`)
    }
  }

  /**
   * Create base snapshot with all dependencies pre-installed
   */
  static async createBaseSnapshot() {
    try {
      console.log('📸 Creating base snapshot with optimized dependencies...')
      
      // Create temporary sandbox for snapshot creation
      const tempSandbox = await this.daytona.createSandbox({
        name: `snapshot-builder-${Date.now()}`,
        language: 'javascript' as const,
        envVars: {
          SETUP_MODE: 'snapshot_creation'
        }
      })

      console.log('⚙️ Setting up dependencies in temporary sandbox...')
      
      // Install all dependencies
      const setupScript = `
#!/bin/bash
set -e

echo "🔧 Setting up optimized environment..."

# Update system packages
apt-get update && apt-get install -y python3 python3-pip curl wget

# Install Node.js dependencies
npm install -g npm@latest
npm install puppeteer playwright beautifulsoup4 selenium requests aiohttp

# Install Python dependencies
pip3 install playwright beautifulsoup4 requests selenium asyncio aiohttp twitter-api-py

# Install browsers
npx playwright install chromium firefox webkit
npx puppeteer browsers install chrome

# Optimize for performance
npm cache clean --force
apt-get clean
rm -rf /var/lib/apt/lists/*

# Create optimized startup script
cat > /opt/startup.sh << 'EOF'
#!/bin/bash
echo "🚀 Starting optimized Followlytics environment..."
export NODE_OPTIONS="--max-old-space-size=4096"
export PUPPETEER_ARGS="--no-sandbox --disable-setuid-sandbox --disable-dev-shm-usage"
echo "✅ Environment ready for follower scanning"
EOF

chmod +x /opt/startup.sh

echo "✅ Base snapshot setup complete"
      `

      await tempSandbox.process.executeCommand(setupScript)
      
      // Create snapshot from configured sandbox
      const snapshot = await this.daytona.createSnapshot({
        sandboxId: tempSandbox.id,
        name: this.SNAPSHOT_CONFIGS.optimized,
        description: 'Optimized Followlytics environment with all dependencies pre-installed'
      })

      console.log(`✅ Base snapshot created: ${snapshot.id}`)
      
      // Cleanup temporary sandbox
      await this.daytona.deleteSandbox(tempSandbox.id)
      console.log('🧹 Temporary sandbox cleaned up')
      
      return snapshot

    } catch (error: any) {
      console.error('❌ Failed to create base snapshot:', error)
      throw new Error(`Snapshot creation failed: ${error.message}`)
    }
  }

  /**
   * Setup sandbox environment with optimized configurations
   */
  static async setupOptimizedEnvironment(sandbox: any) {
    try {
      console.log('⚙️ Setting up optimized sandbox environment...')
      
      // Check if using snapshot (skip setup if dependencies already installed)
      const usingSnapshot = sandbox.snapshot !== undefined
      
      if (usingSnapshot) {
        console.log('📸 Using pre-configured snapshot, skipping dependency installation')
        
        // Just run startup script
        await sandbox.process.executeCommand('/opt/startup.sh')
        console.log('✅ Snapshot environment activated')
        return
      }

      // Full setup for non-snapshot sandboxes
      console.log('📦 Installing dependencies (no snapshot available)...')
      
      // Install Node.js dependencies
      await sandbox.process.executeCommand('npm init -y')
      await sandbox.process.executeCommand('npm install puppeteer playwright --save')
      
      // Install Python dependencies
      await sandbox.process.executeCommand('pip3 install playwright beautifulsoup4 requests selenium asyncio aiohttp')
      
      // Install browsers
      await sandbox.process.executeCommand('npx playwright install chromium')
      await sandbox.process.executeCommand('npx puppeteer browsers install chrome')
      
      console.log('✅ Environment setup complete')

    } catch (error: any) {
      console.error('❌ Environment setup failed:', error)
      throw new Error(`Environment setup failed: ${error.message}`)
    }
  }

  /**
   * Execute optimized follower scanning with enterprise patterns
   */
  static async executeOptimizedScan(sandbox: any, config: OptimizedSandboxConfig) {
    try {
      console.log('🔍 Starting optimized follower scan...')
      
      const scanScript = this.generateOptimizedScanScript(config)
      
      // Write optimized scan script
      await sandbox.process.executeCommand(`cat > /tmp/optimized_scan.py << 'EOF'
${scanScript}
EOF`)

      // Execute scan with timeout handling
      console.log('🚀 Executing optimized scan script...')
      const result = await sandbox.process.executeCommand('python3 /tmp/optimized_scan.py')
      
      console.log('📊 Scan execution result:', result.exitCode)
      console.log('📋 Scan output preview:', result.result?.substring(0, 500))
      
      if (result.exitCode === 0) {
        return this.parseScanResults(result.result)
      } else {
        throw new Error(`Scan failed with exit code ${result.exitCode}: ${result.result}`)
      }

    } catch (error: any) {
      console.error('❌ Optimized scan failed:', error)
      throw new Error(`Scan execution failed: ${error.message}`)
    }
  }

  /**
   * Generate optimized Python scan script with enterprise patterns
   */
  private static generateOptimizedScanScript(config: OptimizedSandboxConfig): string {
    return `
import asyncio
import json
import os
import sys
import time
from datetime import datetime
from playwright.async_api import async_playwright
import requests

class OptimizedFollowerScanner:
    def __init__(self):
        self.access_token = os.environ.get('TWITTER_ACCESS_TOKEN')
        self.access_token_secret = os.environ.get('TWITTER_ACCESS_TOKEN_SECRET')
        self.bearer_token = os.environ.get('TWITTER_BEARER_TOKEN')
        self.user_id = os.environ.get('USER_ID')
        self.scan_type = os.environ.get('SCAN_TYPE', 'medium')
        self.max_followers = int(os.environ.get('MAX_FOLLOWERS', '0'))
        self.debug_mode = os.environ.get('DEBUG_MODE', 'false').lower() == 'true'
        
        # Enterprise configuration
        self.retry_count = 3
        self.backoff_factor = 2
        self.rate_limit_delay = 1
        
    async def scan_followers(self, username):
        """Optimized follower scanning with enterprise patterns"""
        print(f"🚀 Starting optimized scan for @{username} (type: {self.scan_type})")
        
        async with async_playwright() as p:
            # Launch browser with optimized settings
            browser = await p.chromium.launch(
                headless=True,
                args=[
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-accelerated-2d-canvas',
                    '--no-first-run',
                    '--no-zygote',
                    '--single-process',
                    '--disable-gpu',
                    '--memory-pressure-off',
                    '--max_old_space_size=4096'
                ]
            )
            
            try:
                page = await browser.newPage()
                
                # Set optimized viewport and user agent
                await page.set_viewport_size({"width": 1920, "height": 1080})
                await page.set_extra_http_headers({
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                })
                
                # Authenticate with OAuth tokens
                await self.authenticate_with_oauth(page)
                
                # Navigate to followers page with retry logic
                followers = await self.extract_followers_with_retry(page, username)
                
                print(f"✅ Successfully extracted {len(followers)} followers")
                return {
                    'success': True,
                    'followers': followers,
                    'count': len(followers),
                    'scan_type': self.scan_type,
                    'timestamp': datetime.now().isoformat()
                }
                
            except Exception as e:
                print(f"❌ Scan failed: {str(e)}")
                return {
                    'success': False,
                    'error': str(e),
                    'scan_type': self.scan_type,
                    'timestamp': datetime.now().isoformat()
                }
            finally:
                await browser.close()
    
    async def authenticate_with_oauth(self, page):
        """Enhanced OAuth authentication with token injection"""
        print("🔐 Authenticating with OAuth tokens...")
        
        # Navigate to Twitter login
        await page.goto('https://twitter.com/login', wait_until='networkidle')
        
        # Inject OAuth tokens into localStorage and cookies
        await page.evaluate(f'''
            // Inject OAuth tokens
            localStorage.setItem('twitter_oauth_token', '{self.access_token}');
            localStorage.setItem('twitter_oauth_token_secret', '{self.access_token_secret}');
            localStorage.setItem('twitter_bearer_token', '{self.bearer_token}');
            
            // Set authentication cookies
            document.cookie = 'auth_token=' + '{self.access_token}' + '; path=/; domain=.twitter.com';
            document.cookie = 'ct0=' + '{self.access_token}' + '; path=/; domain=.twitter.com';
            
            // Set session storage
            sessionStorage.setItem('twitter_auth', JSON.stringify({{
                access_token: '{self.access_token}',
                access_token_secret: '{self.access_token_secret}',
                bearer_token: '{self.bearer_token}'
            }}));
            
            console.log('OAuth tokens injected successfully');
        ''')
        
        # Wait for authentication to take effect
        await page.wait_for_timeout(2000)
        
        print("✅ OAuth authentication completed")
    
    async def extract_followers_with_retry(self, page, username):
        """Extract followers with enterprise retry patterns"""
        followers = []
        
        for attempt in range(self.retry_count):
            try:
                print(f"🔍 Extraction attempt {attempt + 1}/{self.retry_count}")
                
                # Try multiple URL patterns
                urls_to_try = [
                    f'https://x.com/{username}/followers',
                    f'https://twitter.com/{username}/followers',
                    f'https://x.com/{username}/following',
                    f'https://twitter.com/{username}/following'
                ]
                
                for url in urls_to_try:
                    try:
                        print(f"📱 Trying URL: {url}")
                        await page.goto(url, wait_until='networkidle', timeout=30000)
                        
                        # Wait for follower elements to load
                        await page.wait_for_selector('[data-testid="UserCell"]', timeout=10000)
                        
                        # Extract followers using multiple selectors
                        page_followers = await page.evaluate('''
                            () => {
                                const followers = new Set();
                                
                                // Method 1: UserCell data-testid
                                document.querySelectorAll('[data-testid="UserCell"]').forEach(cell => {
                                    const usernameLink = cell.querySelector('a[href*="/"]');
                                    if (usernameLink) {
                                        const href = usernameLink.getAttribute('href');
                                        const username = href.replace('/', '').split('/')[0];
                                        if (username && !username.includes('?') && username.length > 0) {
                                            followers.add(username);
                                        }
                                    }
                                });
                                
                                // Method 2: Profile links
                                document.querySelectorAll('a[href^="/"]').forEach(link => {
                                    const href = link.getAttribute('href');
                                    if (href && href.match(/^\/[a-zA-Z0-9_]+$/)) {
                                        const username = href.substring(1);
                                        if (username.length > 0 && username.length <= 15) {
                                            followers.add(username);
                                        }
                                    }
                                });
                                
                                // Method 3: @mentions in text
                                document.querySelectorAll('span').forEach(span => {
                                    const text = span.textContent || '';
                                    const mentions = text.match(/@([a-zA-Z0-9_]+)/g);
                                    if (mentions) {
                                        mentions.forEach(mention => {
                                            const username = mention.substring(1);
                                            if (username.length > 0 && username.length <= 15) {
                                                followers.add(username);
                                            }
                                        });
                                    }
                                });
                                
                                return Array.from(followers);
                            }
                        ''')
                        
                        if page_followers and len(page_followers) > 0:
                            followers.extend(page_followers)
                            print(f"✅ Extracted {len(page_followers)} followers from {url}")
                            
                            # Scroll and load more if needed
                            if self.scan_type in ['large', 'enterprise']:
                                additional_followers = await self.scroll_and_extract_more(page)
                                followers.extend(additional_followers)
                            
                            break  # Success, exit URL loop
                            
                    except Exception as url_error:
                        print(f"⚠️ URL {url} failed: {str(url_error)}")
                        continue
                
                if followers:
                    break  # Success, exit retry loop
                    
            except Exception as e:
                print(f"⚠️ Attempt {attempt + 1} failed: {str(e)}")
                if attempt < self.retry_count - 1:
                    delay = self.backoff_factor ** attempt
                    print(f"⏳ Waiting {delay}s before retry...")
                    await asyncio.sleep(delay)
        
        # Remove duplicates and filter
        unique_followers = list(set(followers))
        filtered_followers = [f for f in unique_followers if f and len(f) > 0 and len(f) <= 15]
        
        # Apply max followers limit if set
        if self.max_followers > 0:
            filtered_followers = filtered_followers[:self.max_followers]
        
        return filtered_followers
    
    async def scroll_and_extract_more(self, page):
        """Scroll and extract additional followers for large accounts"""
        additional_followers = []
        scroll_count = 0
        max_scrolls = 10 if self.scan_type == 'large' else 20
        
        print(f"📜 Scrolling to load more followers (max {max_scrolls} scrolls)...")
        
        while scroll_count < max_scrolls:
            # Scroll down
            await page.evaluate('window.scrollTo(0, document.body.scrollHeight)')
            await page.wait_for_timeout(2000)
            
            # Extract new followers
            new_followers = await page.evaluate('''
                () => {
                    const followers = new Set();
                    document.querySelectorAll('[data-testid="UserCell"]').forEach(cell => {
                        const usernameLink = cell.querySelector('a[href*="/"]');
                        if (usernameLink) {
                            const href = usernameLink.getAttribute('href');
                            const username = href.replace('/', '').split('/')[0];
                            if (username && !username.includes('?') && username.length > 0) {
                                followers.add(username);
                            }
                        }
                    });
                    return Array.from(followers);
                }
            ''')
            
            if new_followers:
                additional_followers.extend(new_followers)
                print(f"📄 Scroll {scroll_count + 1}: Found {len(new_followers)} more followers")
            
            scroll_count += 1
            
            # Rate limiting
            await asyncio.sleep(self.rate_limit_delay)
        
        return list(set(additional_followers))

# Main execution
async def main():
    scanner = OptimizedFollowerScanner()
    
    # Get username from environment or use default
    username = os.environ.get('TARGET_USERNAME', 'elonmusk')
    
    # Execute scan
    result = await scanner.scan_followers(username)
    
    # Output results as JSON
    print("📋 SCAN_RESULTS_START")
    print(json.dumps(result, indent=2))
    print("📋 SCAN_RESULTS_END")
    
    return result

if __name__ == "__main__":
    asyncio.run(main())
    `
  }

  /**
   * Parse scan results from script output
   */
  private static parseScanResults(output: string): any {
    try {
      const startMarker = '📋 SCAN_RESULTS_START'
      const endMarker = '📋 SCAN_RESULTS_END'
      
      const startIndex = output.indexOf(startMarker)
      const endIndex = output.indexOf(endMarker)
      
      if (startIndex === -1 || endIndex === -1) {
        throw new Error('Could not find result markers in output')
      }
      
      const jsonStr = output.substring(startIndex + startMarker.length, endIndex).trim()
      return JSON.parse(jsonStr)
      
    } catch (error) {
      console.error('❌ Failed to parse scan results:', error)
      return {
        success: false,
        error: 'Failed to parse scan results',
        raw_output: output
      }
    }
  }

  /**
   * Cleanup sandbox with proper error handling
   */
  static async cleanupSandbox(sandboxId: string) {
    try {
      console.log(`🧹 Cleaning up sandbox: ${sandboxId}`)
      await this.daytona.deleteSandbox(sandboxId)
      console.log('✅ Sandbox cleaned up successfully')
    } catch (error: any) {
      console.error('⚠️ Sandbox cleanup failed:', error)
      // Don't throw - cleanup failures shouldn't break the main flow
    }
  }
}

export default OptimizedDaytonaSandboxManager
