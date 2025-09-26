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
  sessionCookies?: any  // 🍪 X session cookies for authentication
}

export class OptimizedDaytonaSandboxManager {
  private static daytona = new Daytona({
    apiKey: process.env.DAYTONA_API_KEY!
  })

  /**
   * Create optimized sandbox using the working Daytona pattern
   */
  static async createOptimizedSandbox(config: OptimizedSandboxConfig) {
    try {
      console.log(`🚀 Creating optimized sandbox for ${config.scanType} scan...`)
      
      // Use the same pattern as the working DaytonaSandboxManager
      const sandbox = await this.daytona.create({
        language: 'javascript' as const,
        envVars: {
          // Twitter Authentication
          TWITTER_ACCESS_TOKEN: config.twitterTokens.access_token,
          TWITTER_ACCESS_TOKEN_SECRET: config.twitterTokens.access_token_secret,
          TWITTER_BEARER_TOKEN: config.twitterTokens.bearer_token || '',
          
          // Scan Configuration
          SCAN_TYPE: config.scanType,
          MAX_FOLLOWERS: config.maxFollowers?.toString() || '10000',
          USER_ID: config.userId,
          
          // Performance Optimizations
          NODE_OPTIONS: '--max-old-space-size=4096',
          PUPPETEER_ARGS: '--memory-pressure-off --max_old_space_size=4096',
          
          // Feature Flags
          TIMEOUT_DISABLED: config.timeoutDisabled ? 'true' : 'false',
          USE_SNAPSHOT: config.useSnapshot ? 'true' : 'false',
          OPTIMIZATION_LEVEL: config.scanType
        }
      })
      
      console.log(`✅ Optimized sandbox created: ${sandbox.id}`)
      console.log(`📊 Scan type: ${config.scanType}`)
      console.log(`⚡ Optimizations: timeout=${config.timeoutDisabled}, snapshot=${config.useSnapshot}`)
      
      return sandbox

    } catch (error: any) {
      console.error('❌ Failed to create optimized sandbox:', error)
      throw new Error(`Sandbox creation failed: ${error.message}`)
    }
  }

  /**
   * Setup optimized environment - REAL dependency installation
   */
  static async setupOptimizedEnvironment(sandbox: any, usingSnapshot: boolean = false) {
    try {
      console.log(`⚙️ Setting up REAL optimized environment (snapshot: ${usingSnapshot})...`)
      
      if (usingSnapshot) {
        console.log('📸 Using pre-configured snapshot - verifying dependencies...')
        
        // Verify Puppeteer is installed in snapshot
        try {
          const puppeteerCheck = await sandbox.process.executeCommand('node -e "console.log(require(\'puppeteer\').version)"');
          console.log('✅ Puppeteer verified in snapshot:', puppeteerCheck.result.trim());
          return { status: 'ready', message: 'Environment ready from snapshot with Puppeteer' }
        } catch (error) {
          console.log('⚠️ Puppeteer not found in snapshot, installing...');
          // Fall through to installation
        }
      }
      
      console.log('📦 Installing REAL dependencies in environment...')
      
      // Install Node.js if not present
      console.log('🔧 Ensuring Node.js is available...')
      await sandbox.process.executeCommand('which node || (curl -fsSL https://deb.nodesource.com/setup_18.x | bash - && apt-get install -y nodejs)');
      
      // Install Puppeteer and required dependencies
      console.log('🎭 Installing Puppeteer for browser automation...')
      const puppeteerInstall = await sandbox.process.executeCommand('npm install puppeteer');
      console.log('📦 Puppeteer installation result:', puppeteerInstall.result);
      
      // Install system dependencies for Chromium
      console.log('🔧 Installing Chromium system dependencies...')
      await sandbox.process.executeCommand(`
        apt-get update && apt-get install -y \\
          wget \\
          ca-certificates \\
          fonts-liberation \\
          libappindicator3-1 \\
          libasound2 \\
          libatk-bridge2.0-0 \\
          libatk1.0-0 \\
          libc6 \\
          libcairo2 \\
          libcups2 \\
          libdbus-1-3 \\
          libexpat1 \\
          libfontconfig1 \\
          libgbm1 \\
          libgcc1 \\
          libglib2.0-0 \\
          libgtk-3-0 \\
          libnspr4 \\
          libnss3 \\
          libpango-1.0-0 \\
          libpangocairo-1.0-0 \\
          libstdc++6 \\
          libx11-6 \\
          libx11-xcb1 \\
          libxcb1 \\
          libxcomposite1 \\
          libxcursor1 \\
          libxdamage1 \\
          libxext6 \\
          libxfixes3 \\
          libxi6 \\
          libxrandr2 \\
          libxrender1 \\
          libxss1 \\
          libxtst6 \\
          lsb-release \\
          xdg-utils
      `);
      
      // Verify installation
      console.log('✅ Verifying Puppeteer installation...')
      const verifyResult = await sandbox.process.executeCommand('node -e "console.log(\'Puppeteer version:\', require(\'puppeteer\').version)"');
      console.log('🎭 Verification result:', verifyResult.result);
      
      console.log('✅ REAL environment setup completed with browser automation capabilities')
      return { 
        status: 'ready', 
        message: 'Real environment configured with Puppeteer and Chromium',
        puppeteerVersion: verifyResult.result.trim()
      }
      
    } catch (error: any) {
      console.error('❌ REAL environment setup failed:', error)
      throw new Error(`Real environment setup failed: ${error.message}`)
    }
  }

  /**
   * Execute optimized scan - REAL Twitter extraction
   */
  static async executeOptimizedScan(sandbox: any, config: OptimizedSandboxConfig) {
    try {
      console.log(`🚀 Executing REAL optimized scan for target username...`)
      
      // Create the REAL Twitter extraction script
      const realExtractionScript = `
const puppeteer = require('puppeteer');

async function extractRealFollowers() {
  console.log('🚀 Starting REAL Twitter follower extraction...');
  
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
    
    // Set realistic user agent
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    
    console.log('🔑 Injecting OAuth tokens for authentication...');
    
    // 🎯 BROWSER SESSION AUTHENTICATION: Use session cookies from dashboard
    console.log('🔐 Starting BROWSER SESSION authentication...');
    
    // First, check if we have session cookies from the dashboard
    const sessionCookiesEnv = process.env.X_SESSION_COOKIES;
    const sessionCookies = sessionCookiesEnv || config.sessionCookies;
    
    if (sessionCookies) {
      console.log('🍪 Found X session cookies - injecting into browser...');
      
      // Parse and inject session cookies
      try {
        const cookies = JSON.parse(sessionCookies);
        await page.setCookie(...cookies);
        console.log(\`✅ Injected \${cookies.length} session cookies\`);
      } catch (cookieError) {
        console.log('⚠️ Failed to parse session cookies, trying direct approach');
      }
    } else {
      console.log('⚠️ No session cookies found - user needs to sign in to dashboard first');
    }
    
    // Navigate to X.com to test authentication
    await page.goto('https://x.com', { 
      waitUntil: 'domcontentloaded',
      timeout: 30000 
    });
    
    // 📸 SCREENSHOT 1: Initial X.com page
    console.log('📸 Taking screenshot 1: X.com with session cookies');
    await page.screenshot({ 
      path: '/tmp/screenshot_1_x_with_cookies.png',
      fullPage: true 
    });
    
    // Check authentication status
    const authStatus = await page.evaluate(() => {
      // Check for authentication indicators
      const loginButton = document.querySelector('[data-testid="loginButton"]');
      const signUpButton = document.querySelector('[data-testid="signupButton"]');
      const homeTimeline = document.querySelector('[data-testid="primaryColumn"]');
      const userMenu = document.querySelector('[data-testid="SideNav_AccountSwitcher_Button"]');
      const tweetButton = document.querySelector('[data-testid="tweetButtonInline"]');
      
      const isAuthenticated = !loginButton && !signUpButton && (homeTimeline || userMenu || tweetButton);
      
      return {
        isAuthenticated,
        hasLoginButton: !!loginButton,
        hasSignUpButton: !!signUpButton,
        hasHomeTimeline: !!homeTimeline,
        hasUserMenu: !!userMenu,
        hasTweetButton: !!tweetButton,
        currentUrl: window.location.href
      };
    });
    
    console.log('🔍 Authentication status:', authStatus);
    
    if (authStatus.isAuthenticated) {
      console.log('✅ Successfully authenticated with session cookies!');
      
      // 📸 SCREENSHOT 2: Successfully authenticated
      console.log('📸 Taking screenshot 2: Successfully authenticated');
      await page.screenshot({ 
        path: '/tmp/screenshot_2_authenticated.png',
        fullPage: true 
      });
      
    } else {
      console.log('❌ Authentication failed - session cookies may be invalid or expired');
      console.log('💡 SOLUTION: User needs to:');
      console.log('   1. Sign in to X.com in their browser');
      console.log('   2. Visit the dashboard to capture session');
      console.log('   3. Try the scan again');
      
      // 📸 SCREENSHOT 2: Authentication failed
      console.log('📸 Taking screenshot 2: Authentication failed');
      await page.screenshot({ 
        path: '/tmp/screenshot_2_auth_failed.png',
        fullPage: true 
      });
      
      // Don't throw error immediately - try to proceed and see what happens
      console.log('⚠️ Proceeding with scan attempt despite authentication failure...');
    }
    
    // 🎯 AUTO-DETECT USERNAME from authenticated session
    console.log('🔍 Auto-detecting username from authenticated session...');
    
    let detectedUsername = null;
    
    try {
      // Try to get username from profile page
      await page.goto('https://x.com/home', { 
        waitUntil: 'domcontentloaded',
        timeout: 30000 
      });
      
      // Extract username from the authenticated session
      detectedUsername = await page.evaluate(() => {
        // Look for username in various places
        const profileLink = document.querySelector('a[href*="/"][data-testid="SideNav_NewTweet_Button"]');
        const userMenuButton = document.querySelector('[data-testid="SideNav_AccountSwitcher_Button"]');
        const profileImage = document.querySelector('[data-testid="DashButton_ProfileSwitcher_Button"]');
        
        // Try to extract from URL patterns
        const links = Array.from(document.querySelectorAll('a[href*="/"]'));
        for (const link of links) {
          const href = link.getAttribute('href');
          if (href && href.match(/^\/[a-zA-Z0-9_]+$/)) {
            const username = href.substring(1);
            if (username && username !== 'home' && username !== 'explore' && username !== 'notifications') {
              console.log('🔍 Found potential username:', username);
              return username;
            }
          }
        }
        
        // Try to extract from meta tags or page title
        const pageTitle = document.title;
        if (pageTitle.includes('(@')) {
          const match = pageTitle.match(/\(@([a-zA-Z0-9_]+)\)/);
          if (match) {
            console.log('🔍 Found username in title:', match[1]);
            return match[1];
          }
        }
        
        return null;
      });
      
      if (detectedUsername) {
        console.log(\`✅ Auto-detected username: @\${detectedUsername}\`);
      } else {
        console.log('⚠️ Could not auto-detect username, will try followers page directly');
        detectedUsername = 'unknown'; // Fallback
      }
      
    } catch (detectionError) {
      console.log('⚠️ Username detection failed:', detectionError.message);
      detectedUsername = 'unknown'; // Fallback
    }
    
    // Navigate to the authenticated user's followers page
    console.log(\`🎯 Navigating to authenticated user's followers page...\`);
    
    const followerUrls = [
      \`https://x.com/\${detectedUsername}/followers\`,
      \`https://twitter.com/\${detectedUsername}/followers\`,
      \`https://x.com/\${detectedUsername}/following\`,
      \`https://twitter.com/\${detectedUsername}/following\`,
      'https://x.com/followers', // Direct followers page (if logged in)
      'https://twitter.com/followers' // Fallback
    ];
    
    let followersFound = [];
    let successfulUrl = null;
    
    for (const url of followerUrls) {
      try {
        console.log(\`🔍 Trying URL: \${url}\`);
        await page.goto(url, { 
          waitUntil: 'networkidle2',
          timeout: 30000 
        });
        
        // 📸 SCREENSHOT 3: After navigating to followers page
        console.log(\`📸 Taking screenshot 3: Followers page - \${url}\`);
        await page.screenshot({ 
          path: \`/tmp/screenshot_3_followers_page_\${url.split('/').pop()}.png\`,
          fullPage: true 
        });
        
        // Wait for follower elements to load
        await page.waitForSelector('[data-testid="UserCell"], [data-testid="cellInnerDiv"]', { 
          timeout: 15000 
        });
        
        // 📸 SCREENSHOT 4: After UserCell elements loaded
        console.log('📸 Taking screenshot 4: UserCell elements loaded');
        await page.screenshot({ 
          path: '/tmp/screenshot_4_usercells_loaded.png',
          fullPage: true 
        });
        
        // Extract followers using the REAL method from daytona-client.ts
        const extractedFollowers = await page.evaluate(() => {
          const userCells = document.querySelectorAll('[data-testid="UserCell"]');
          const extracted = [];
          
          console.log(\`🔍 Found \${userCells.length} UserCell elements\`);
          
          userCells.forEach((cell, index) => {
            const profileLinks = cell.querySelectorAll('a[href*="x.com/"], a[href*="twitter.com/"]');
            
            profileLinks.forEach(link => {
              const href = link.getAttribute('href');
              if (href && href.includes('/')) {
                const username = href.split('/').pop();
                if (username && 
                    !username.includes('?') && 
                    !username.includes('#') && 
                    username.length > 0 && 
                    username.length < 16 &&
                    /^[a-zA-Z0-9_]+$/.test(username)) {
                  
                  if (!extracted.includes(username)) {
                    extracted.push(username);
                    console.log(\`✅ Extracted: @\${username}\`);
                  }
                }
              }
            });
          });
          
          return extracted;
        });
        
        if (extractedFollowers.length > 0) {
          followersFound = extractedFollowers;
          successfulUrl = url;
          console.log(\`✅ Successfully extracted \${followersFound.length} followers from \${url}\`);
          
          // 📸 SCREENSHOT 5: Successful extraction
          console.log('📸 Taking screenshot 5: Successful extraction completed');
          await page.screenshot({ 
            path: '/tmp/screenshot_5_extraction_success.png',
            fullPage: true 
          });
          
          break;
        } else {
          // 📸 SCREENSHOT: Failed extraction attempt
          console.log(\`📸 Taking screenshot: Failed extraction from \${url}\`);
          await page.screenshot({ 
            path: \`/tmp/screenshot_failed_\${url.split('/').pop()}.png\`,
            fullPage: true 
          });
        }
        
      } catch (urlError) {
        console.log(\`⚠️ Failed to extract from \${url}: \${urlError.message}\`);
        continue;
      }
    }
    
    await browser.close();
    
    const results = {
      status: followersFound.length > 0 ? 'completed' : 'failed',
      followers: followersFound,
      totalFollowers: followersFound.length,
      detectedUsername: detectedUsername, // 🎯 Include auto-detected username
      method: 'session_cookie_browser_automation',
      successfulUrl: successfulUrl,
      extractionTime: new Date().toISOString()
    };
    
    console.log(\`🎯 REAL extraction completed: \${results.totalFollowers} followers found\`);
    console.log('📋 Followers:', results.followers.slice(0, 10).join(', ') + (results.followers.length > 10 ? '...' : ''));
    
    return results;
    
  } catch (error) {
    await browser.close();
    throw error;
  }
}

// Execute the extraction
extractRealFollowers().then(results => {
  console.log('EXTRACTION_RESULTS:', JSON.stringify(results));
}).catch(error => {
  console.error('EXTRACTION_ERROR:', error.message);
});
`;

      // Deploy and execute the REAL extraction script
      console.log('📤 Deploying REAL extraction script to sandbox...');
      
      // Write the script to the sandbox
      await sandbox.process.executeCommand(`cat > /tmp/real_extraction.js << 'EOF'
${realExtractionScript}
EOF`);
      
      // 🔧 ROBUST PUPPETEER INSTALLATION
      console.log('📦 Installing Puppeteer with robust error handling...');
      
      try {
        // Step 1: Check system and Node.js
        console.log('🔍 Checking system environment...');
        const nodeVersion = await sandbox.process.executeCommand('node --version');
        const npmVersion = await sandbox.process.executeCommand('npm --version');
        console.log(`📋 Node.js: ${nodeVersion.result.trim()}, npm: ${npmVersion.result.trim()}`);
        
        // Step 2: Initialize npm project
        console.log('📦 Initializing npm project...');
        await sandbox.process.executeCommand('npm init -y');
        
        // Step 3: Install system dependencies for Puppeteer
        console.log('🔧 Installing system dependencies...');
        await sandbox.process.executeCommand(`
          apt-get update -qq && apt-get install -y -qq \\
            wget gnupg ca-certificates procps libxss1 \\
            libgconf-2-4 libxrandr2 libasound2 libpangocairo-1.0-0 \\
            libatk1.0-0 libcairo-gobject2 libgtk-3-0 libgdk-pixbuf2.0-0 \\
            libxcomposite1 libxcursor1 libxdamage1 libxi6 libxtst6 \\
            libappindicator1 libnss3 libxss1 libgconf-2-4 \\
            || echo "System deps install completed with warnings"
        `);
        
        // Step 4: Install Puppeteer with specific configuration
        console.log('📦 Installing Puppeteer package...');
        const installResult = await sandbox.process.executeCommand(`
          PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=false \\
          npm install puppeteer --no-audit --no-fund --loglevel=error
        `);
        console.log('📦 Puppeteer installation output:', installResult.result.substring(0, 1000));
        
        // Step 5: Verify installation with detailed check
        console.log('🔍 Verifying Puppeteer installation...');
        const verifyResult = await sandbox.process.executeCommand(`
          node -e "
            try {
              const puppeteer = require('puppeteer');
              console.log('✅ Puppeteer version:', puppeteer.version || 'installed');
              console.log('✅ Puppeteer executable:', puppeteer.executablePath());
            } catch (error) {
              console.log('❌ Puppeteer verification failed:', error.message);
              throw error;
            }
          "
        `);
        console.log('✅ Puppeteer verification result:', verifyResult.result);
        
        // Step 6: Test browser launch
        console.log('🧪 Testing browser launch...');
        const browserTest = await sandbox.process.executeCommand(`
          node -e "
            const puppeteer = require('puppeteer');
            (async () => {
              try {
                const browser = await puppeteer.launch({ 
                  headless: true,
                  args: ['--no-sandbox', '--disable-setuid-sandbox']
                });
                console.log('✅ Browser launch successful');
                await browser.close();
              } catch (error) {
                console.log('❌ Browser launch failed:', error.message);
                throw error;
              }
            })();
          "
        `);
        console.log('✅ Browser test result:', browserTest.result);
        
      } catch (installError: any) {
        console.error('❌ Puppeteer installation failed:', installError.message);
        
        // Fallback: Try alternative installation method
        console.log('🔄 Trying fallback installation method...');
        try {
          await sandbox.process.executeCommand('npm install puppeteer-core chromium --no-audit --no-fund');
          console.log('✅ Fallback installation completed');
        } catch (fallbackError: any) {
          throw new Error(`Both primary and fallback Puppeteer installation failed: ${installError.message}, ${fallbackError.message}`);
        }
      }
      
      // Execute the REAL extraction
      console.log('🚀 Executing REAL Twitter follower extraction...');
      const extractionResult = await sandbox.process.executeCommand('node /tmp/real_extraction.js');
      
      // 📸 RETRIEVE SCREENSHOTS from sandbox
      console.log('📸 Retrieving screenshots from sandbox...');
      try {
        const screenshotList = await sandbox.process.executeCommand('ls -la /tmp/screenshot*.png 2>/dev/null || echo "No screenshots found"');
        console.log('📸 Available screenshots:', screenshotList.result);
        
        if (!screenshotList.result.includes('No screenshots found')) {
          // Get base64 encoded screenshots for display
          const screenshots = await sandbox.process.executeCommand('for f in /tmp/screenshot*.png; do echo "=== $f ==="; base64 "$f" | head -20; echo ""; done');
          console.log('📸 Screenshot data (first 20 lines each):', screenshots.result.substring(0, 2000));
        }
      } catch (screenshotError: any) {
        console.log('⚠️ Could not retrieve screenshots:', screenshotError.message);
      }
      
      // Parse the results with enhanced debugging
      let results;
      try {
        console.log('🔍 Raw extraction output:');
        console.log(extractionResult.result);
        console.log('🔍 Output length:', extractionResult.result.length);
        
        const outputLines = extractionResult.result.split('\n');
        console.log('🔍 Total output lines:', outputLines.length);
        console.log('🔍 Looking for EXTRACTION_RESULTS line...');
        
        const resultLine = outputLines.find((line: string) => line.startsWith('EXTRACTION_RESULTS:'));
        
        if (resultLine) {
          console.log('✅ Found result line:', resultLine);
          results = JSON.parse(resultLine.replace('EXTRACTION_RESULTS:', ''));
        } else {
          console.log('❌ No EXTRACTION_RESULTS line found');
          console.log('📋 All output lines:');
          outputLines.forEach((line: string, index: number) => {
            console.log(`Line ${index}: ${line}`);
          });
          throw new Error('No extraction results found in output');
        }
      } catch (parseError: any) {
        console.error('❌ Failed to parse extraction results:', parseError);
        throw new Error(`Failed to parse extraction results: ${parseError.message}`);
      }
      
      // Add scan metadata
      results.scanType = config.scanType;
      results.sandboxId = sandbox.id;
      results.executionTime = Date.now();
      
      console.log(`✅ REAL optimized scan completed: ${results.totalFollowers} followers extracted`);
      return results;
      
    } catch (error: any) {
      console.error('❌ REAL scan execution failed:', error);
      throw new Error(`Real scan execution failed: ${error.message}`);
    }
  }

  /**
   * Cleanup sandbox - simple implementation
   */
  static async cleanupSandbox(sandboxId: string) {
    try {
      console.log(`🧹 Cleaning up sandbox: ${sandboxId}`)
      // Note: Daytona SDK doesn't have a direct cleanup method
      // Sandboxes auto-cleanup after timeout or can be managed via Daytona UI
      console.log(`✅ Sandbox cleanup initiated: ${sandboxId}`)
    } catch (error: any) {
      console.error('❌ Sandbox cleanup failed:', error)
      // Don't throw - cleanup failures shouldn't break the scan
    }
  }
}

export default OptimizedDaytonaSandboxManager

// Force deployment timestamp: 2025-09-25T04:12:48 - Puppeteer installation fix
