import { NextRequest, NextResponse } from 'next/server'
import { Daytona } from '@daytonaio/sdk'
import { activeScanJobs } from '@/lib/scan-jobs'
import admin from 'firebase-admin'

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  try {
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
    
    if (!privateKey || !process.env.FIREBASE_PROJECT_ID || !process.env.FIREBASE_CLIENT_EMAIL) {
      console.warn('Firebase Admin SDK not initialized - missing environment variables')
    } else {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: privateKey,
        }),
      })
    }
  } catch (error) {
    console.error('Firebase Admin initialization failed:', error)
  }
}

async function getUserTwitterTokens(userId: string) {
  try {
    if (!admin.apps.length) {
      console.warn('Firebase not initialized - cannot get user tokens')
      return null
    }
    
    const adminDb = admin.firestore()
    const userDoc = await adminDb.collection('users').doc(userId).get()
    if (!userDoc.exists) {
      return null
    }
    
    const userData = userDoc.data()
    return {
      access_token: userData?.access_token,
      access_token_secret: userData?.access_token_secret
    }
  } catch (error) {
    console.error('Error getting user Twitter tokens:', error)
    return null
  }
}

// Submit scan using Daytona SDK
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { username, estimated_followers, priority = 'normal', user_id } = body

    if (!username) {
      return NextResponse.json({ 
        error: 'Username is required' 
      }, { status: 400 })
    }

    if (!user_id) {
      return NextResponse.json({ 
        error: 'User ID is required for OAuth token retrieval' 
      }, { status: 400 })
    }

    // Check for required Daytona credentials
    const apiKey = process.env.DAYTONA_API_KEY
    const apiUrl = process.env.DAYTONA_API_URL || 'https://app.daytona.io/api'
    
    console.log('Daytona environment check:', {
      hasApiKey: !!apiKey,
      apiUrl,
      apiKeyLength: apiKey?.length
    })
    
    if (!apiKey) {
      return NextResponse.json({ 
        error: 'Daytona credentials not configured. Please set DAYTONA_API_KEY environment variable.',
        missing: {
          api_key: !apiKey
        },
        debug: {
          env_keys: Object.keys(process.env).filter(k => k.includes('DAYTONA')),
          node_env: process.env.NODE_ENV
        }
      }, { status: 503 })
    }

    // Initialize Daytona SDK
    console.log('Daytona config:', { 
      apiKey: apiKey ? `${apiKey.substring(0, 10)}...` : 'MISSING',
      apiUrl: apiUrl || 'MISSING'
    })
  
    const daytona = new Daytona({
      apiKey: apiKey,
      apiUrl: apiUrl
    })

    // Determine account size and estimates
    const accountSize = estimated_followers > 100000 ? 'large' : 
                       estimated_followers > 10000 ? 'medium' : 'small'
    
    const estimatedDuration = estimated_followers > 100000 ? '2-4 hours' :
                             estimated_followers > 10000 ? '30-60 minutes' : '5-15 minutes'
    
    const estimatedCost = estimated_followers > 100000 ? '$5-10' :
                         estimated_followers > 10000 ? '$1-3' : '$0.50-1'

    // Create a new Daytona sandbox for each scan
    console.log('Creating new Daytona sandbox for scan:', {
      username,
      accountSize,
      estimated_followers
    })
    
    let sandbox: any
    try {
      console.log('Creating new sandbox with debian:12 image...')
      
      // Determine extraction method based on account size
      const extractionMethod = estimated_followers > 50000 ? 'twitter_api' : 'browser_automation'
      
      console.log(`📊 Account size: ${estimated_followers} followers`)
      console.log(`🔧 Using extraction method: ${extractionMethod}`)

        // Get user's OAuth tokens from Firebase
        const userTokens = await getUserTwitterTokens(user_id)
        
        if (!userTokens || !userTokens.access_token || !userTokens.access_token_secret) {
          throw new Error('User must complete Twitter OAuth authorization before scanning')
        }

        // Create a new sandbox for this scan with user's OAuth credentials
        sandbox = await daytona.create({
          image: 'debian:12',
          envVars: {
            TARGET_USERNAME: username,
            MAX_FOLLOWERS: (estimated_followers || 50000).toString(),
            TWITTER_API_KEY: process.env.TWITTER_API_KEY || '',
            TWITTER_API_SECRET: process.env.TWITTER_API_SECRET || '',
            TWITTER_ACCESS_TOKEN: userTokens.access_token,
            TWITTER_ACCESS_TOKEN_SECRET: userTokens.access_token_secret,
            EXTRACTION_METHOD: extractionMethod,
            ACCOUNT_SIZE: estimated_followers.toString()
          }
        })
      
      console.log(`✅ Created new sandbox: ${sandbox.id}`)
      
      // Wait for sandbox to start
      console.log('Waiting for sandbox to start...')
      let attempts = 0
      const maxAttempts = 30
      
      while (attempts < maxAttempts) {
        const sandboxes = await daytona.list()
        const currentSandbox = sandboxes.find((sb: any) => sb.id === sandbox.id)
        
        if (!currentSandbox) {
          throw new Error(`Sandbox ${sandbox.id} not found`)
        }
        
        console.log(`Sandbox ${sandbox.id} state: ${currentSandbox.state} (attempt ${attempts + 1}/${maxAttempts})`)
        
        if (currentSandbox.state === 'started') {
          sandbox = currentSandbox
          break
        }
        
        if (currentSandbox.state === 'build_failed' || currentSandbox.state === 'destroyed') {
          throw new Error(`Sandbox failed to start: ${currentSandbox.state}`)
        }
        
        await new Promise(resolve => setTimeout(resolve, 2000))
        attempts++
      }
      
      if (sandbox.state !== 'started') {
        throw new Error(`Sandbox failed to start within ${maxAttempts * 2} seconds`)
      }
      
      console.log(`✅ Sandbox ${sandbox.id} is now running`)
      
    } catch (sandboxError) {
      console.error('Sandbox creation failed:', sandboxError)
      console.error('Full error details:', {
        message: sandboxError instanceof Error ? sandboxError.message : 'Unknown error',
        stack: sandboxError instanceof Error ? sandboxError.stack : null,
        apiUrl,
        hasApiKey: !!apiKey,
        envVars: Object.keys(process.env).filter(k => k.includes('DAYTONA'))
      })
      
      return NextResponse.json({ 
        error: 'Failed to create Daytona sandbox',
        details: sandboxError instanceof Error ? sandboxError.message : 'Unknown sandbox error',
        debug_info: {
          apiUrl: apiUrl,
          hasApiKey: !!apiKey,
          daytonaEnvVars: Object.keys(process.env).filter(k => k.includes('DAYTONA')),
          errorType: sandboxError instanceof Error ? sandboxError.constructor.name : typeof sandboxError,
          timestamp: new Date().toISOString()
        }
      }, { status: 500 })
    }

    const jobId = `daytona_${Date.now()}_${sandbox.id.slice(-8)}`

    // Store job tracking info
    activeScanJobs.set(jobId, {
      sandbox_id: sandbox.id,
      username,
      status: 'initializing',
      progress: 0,
      startTime: Date.now(),
      estimated_followers,
      account_size: accountSize,
      estimated_duration: estimatedDuration,
      estimated_cost: estimatedCost,
      phase: 'creating_sandbox',
      followers_found: 0
    })

    // Start REAL scan in the background using verified sandbox
    setImmediate(async () => {
      try {
        console.log(`🚀 Starting REAL follower scan for @${username}`)
        
        // Verify sandbox is still valid
        if (!sandbox || !sandbox.id) {
          throw new Error('Sandbox object is undefined or invalid')
        }
        
        const job = activeScanJobs.get(jobId);
        if (job) {
          job.status = 'running';
          job.phase = 'installing_dependencies';
          job.progress = 10;
        }
        
        // Install Python dependencies with better error handling
        console.log('Installing Python dependencies...')
        
        // Install system packages
        const systemInstall = await sandbox.process.executeCommand('apt-get update && apt-get install -y python3 python3-pip curl wget')
        console.log('System packages installed:', systemInstall.toString().slice(0, 200))
        
        // Install Python packages
        const pythonInstall = await sandbox.process.executeCommand('pip3 install playwright beautifulsoup4')
        console.log('Python packages installed:', pythonInstall.toString().slice(0, 200))
        
        // Install Playwright browser
        const playwrightInstall = await sandbox.process.executeCommand('playwright install chromium')
        console.log('Playwright browser installed:', playwrightInstall.toString().slice(0, 200))
        
        // Install browser dependencies
        const depsInstall = await sandbox.process.executeCommand('playwright install-deps')
        console.log('Browser dependencies installed:', depsInstall.toString().slice(0, 200))
        
        if (job) {
          job.progress = 30;
          job.phase = 'installing_browser';
        }
        
        // Additional browser setup completed above
        
        if (job) {
          job.progress = 50;
          job.phase = 'browser_ready';
        }
        
        // Create a SIMPLE test script first to verify basic functionality
        console.log('Creating SIMPLE test script to verify sandbox capabilities...')
        const testScript = `#!/usr/bin/env python3
import requests
import json
import time
import os

def test_basic_functionality():
    print("=== SANDBOX FUNCTIONALITY TEST ===")
    
    # Test 1: Basic Python execution
    print("✓ Python is working")
    
    # Test 2: Internet connectivity
    try:
        response = requests.get('https://httpbin.org/ip', timeout=10)
        print(f"✓ Internet access: {response.status_code}")
        print(f"  IP: {response.json()}")
    except Exception as e:
        print(f"❌ Internet failed: {e}")
        return False
    
    # Test 3: Can we reach Twitter/X?
    try:
        response = requests.get('https://x.com', timeout=15, headers={
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        })
        print(f"✓ X.com access: {response.status_code}")
    except Exception as e:
        print(f"❌ X.com failed: {e}")
    
    # Test 4: File I/O
    try:
        test_data = {"test": "success", "timestamp": time.time()}
        with open('/tmp/test_results.json', 'w') as f:
            json.dump(test_data, f)
        print("✓ File I/O working")
    except Exception as e:
        print(f"❌ File I/O failed: {e}")
        return False
    
    # Test 5: Environment variables
    username = os.environ.get('TARGET_USERNAME', 'NOT_SET')
    print(f"✓ Environment: TARGET_USERNAME = {username}")
    
    return True

if __name__ == "__main__":
    success = test_basic_functionality()
    print(f"\\n=== TEST RESULT: {'PASS' if success else 'FAIL'} ===")
`

        // Run test script first
        console.log('Running basic functionality test...')
        const testResult = await sandbox.process.executeCommand('cd /tmp && python3 test_sandbox.py')
        console.log('Test result:', testResult.toString())
        
        if (job) {
          job.progress = 60;
          job.phase = 'creating_scanner';
        }
        
        // Create OAuth-authenticated Twitter follower extraction script
        console.log('Creating OAuth-authenticated Twitter follower extraction script...')
        const pythonScript = `#!/usr/bin/env python3
import asyncio
import json
import os
import sys
import traceback
import time
import re
from datetime import datetime
import base64
import urllib.parse

# Add error logging
def log_error(message, error=None):
    """Log errors with full traceback"""
    print(f"ERROR: {message}")
    if error:
        print(f"Exception: {str(error)}")
        print(f"Traceback: {traceback.format_exc()}")
    sys.stdout.flush()

def log_info(message):
    """Log info messages"""
    print(f"INFO: {message}")
    sys.stdout.flush()

async def extract_followers_with_oauth_auth():
    """Extract followers using OAuth-authenticated browser session"""
    
    # Get environment variables
    username = os.environ.get('TARGET_USERNAME', 'JoeProAI')
    max_followers = int(os.environ.get('MAX_FOLLOWERS', '1000'))
    
    # OAuth credentials for authentication
    consumer_key = os.environ.get('TWITTER_API_KEY')
    consumer_secret = os.environ.get('TWITTER_API_SECRET')
    access_token = os.environ.get('TWITTER_ACCESS_TOKEN')
    access_token_secret = os.environ.get('TWITTER_ACCESS_TOKEN_SECRET')
    
    log_info(f"Starting OAuth-authenticated follower scan for @{username}")
    log_info(f"Max followers to extract: {max_followers}")
    
    if not access_token or not access_token_secret:
        log_info("No OAuth tokens found - user needs to authorize first")
        return {
            "error": "OAuth authorization required",
            "message": "User must complete Twitter OAuth authorization before scanning",
            "status": "authorization_required",
            "followers_found": 0
        }
    
    log_info("OAuth tokens found - proceeding with authenticated scan")
    followers = []
    
    try:
        # Import Playwright with error handling
        log_info("Importing Playwright...")
        from playwright.async_api import async_playwright
        log_info("Playwright imported successfully")
    except ImportError as e:
        log_error("Failed to import Playwright", e)
        return {"error": "Module import failed", "details": str(e)}
    
    try:
        async with async_playwright() as p:
            log_info("Launching browser...")
            # Launch browser with proper settings for sandbox environment
            browser = await p.chromium.launch(
                headless=True,  # Must be headless in sandbox environment
                args=[
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-accelerated-2d-canvas',
                    '--no-first-run',
                    '--no-zygote',
                    '--disable-gpu',
                    '--disable-extensions',
                    '--disable-background-timer-throttling',
                    '--disable-backgrounding-occluded-windows',
                    '--disable-renderer-backgrounding'
                ]
            )
            log_info("Browser launched successfully")
            
            context = await browser.new_context(
                viewport={'width': 1920, 'height': 1080},
                user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            )
            log_info("Browser context created")
            
            page = await context.new_page()
            log_info("New page created")
            
            try:
                # Step 1: Navigate to Twitter login page and inject OAuth tokens
                log_info("Step 1: Navigating to Twitter and injecting OAuth authentication...")
                
                # First navigate to Twitter login page
                await page.goto('https://twitter.com/login', wait_until='networkidle')
                await asyncio.sleep(3)
                
                log_info("Injecting OAuth tokens into browser session...")
                
                # Inject OAuth tokens into localStorage and cookies
                await page.evaluate(f'''() => {{
                    // Store OAuth credentials in localStorage
                    localStorage.setItem('twitter_oauth_token', '{access_token}');
                    localStorage.setItem('twitter_oauth_token_secret', '{access_token_secret}');
                    localStorage.setItem('twitter_consumer_key', '{consumer_key}');
                    localStorage.setItem('twitter_consumer_secret', '{consumer_secret}');
                    
                    // Set authentication cookies
                    document.cookie = 'auth_token={access_token}; domain=.twitter.com; path=/';
                    document.cookie = 'ct0=' + btoa(Math.random().toString()).substring(0, 32) + '; domain=.twitter.com; path=/';
                    
                    console.log('OAuth tokens injected into browser session');
                }}''')
                
                log_info("OAuth tokens injected successfully")
                
                # Step 2: Try multiple Twitter URLs to access followers page
                log_info(f"Step 2: Accessing @{username} followers page with authentication...")
                
                # Try different URL formats for better compatibility
                follower_urls = [
                    f'https://twitter.com/{username}/followers',
                    f'https://x.com/{username}/followers',
                    f'https://twitter.com/{username}/following',
                    f'https://x.com/{username}/following',
                    f'https://twitter.com/{username}',
                    f'https://x.com/{username}'
                ]
                
                authenticated = False
                for url_attempt, followers_url in enumerate(follower_urls):
                    log_info(f"Trying URL {url_attempt + 1}/{len(follower_urls)}: {followers_url}")
                    
                    try:
                        await page.goto(followers_url, wait_until='networkidle', timeout=30000)
                        await asyncio.sleep(5)
                        
                        current_url = page.url
                        page_title = await page.title()
                        
                        log_info(f"Current URL: {current_url}")
                        log_info(f"Page title: {page_title}")
                        
                        # Check if we're on a login page or blocked
                        if 'login' in current_url.lower() or 'signin' in current_url.lower():
                            log_info("Still on login page - trying next URL")
                            continue
                        
                        # Check if we can see follower content
                        has_followers = await page.evaluate('''() => {{
                            const indicators = [
                                document.querySelector('[data-testid="UserCell"]'),
                                document.querySelector('[data-testid="user"]'),
                                document.querySelector('a[href*="/"]'),
                                document.querySelector('[role="button"]')
                            ];
                            return indicators.some(el => el !== null);
                        }}''')
                        
                        if has_followers:
                            log_info(f"✅ Successfully accessed followers page: {followers_url}")
                            authenticated = True
                            break
                        else:
                            log_info("No follower content detected - trying next URL")
                            
                    except Exception as url_error:
                        log_info(f"URL attempt failed: {url_error}")
                        continue
                
                if not authenticated:
                    log_info("⚠️ Could not access authenticated followers page with any URL")
                    # Continue anyway to try extracting what we can
                
                # Step 3: Extract followers with enhanced scrolling and multiple selectors
                log_info("Step 3: Extracting follower data with enhanced methods...")
                
                found_usernames = set()
                
                # Enhanced extraction with multiple scroll attempts
                for scroll_round in range(10):  # Increased scroll rounds
                    log_info(f"Scroll round {scroll_round + 1}/10")
                    
                    # Scroll to load more content
                    await page.evaluate('window.scrollTo(0, document.body.scrollHeight)')
                    await asyncio.sleep(2)
                    
                    # Extract followers using multiple methods
                    batch_usernames = await page.evaluate('''() => {{
                        const usernames = new Set();
                        
                        // Method 1: Look for user profile links
                        const profileSelectors = [
                            'a[href^="/"][href*="/"]',
                            '[data-testid="UserCell"] a[href^="/"]',
                            '[data-testid="user"] a[href^="/"]',
                            'div[data-testid="cellInnerDiv"] a[href^="/"]',
                            '[role="link"][href^="/"]'
                        ];
                        
                        profileSelectors.forEach(selector => {{
                            const links = document.querySelectorAll(selector);
                            links.forEach(link => {{
                                const href = link.getAttribute('href');
                                if (href && href.startsWith('/') && href.length > 1) {{
                                    const potentialUsername = href.substring(1).split('/')[0];
                                    
                                    // Validate username format
                                    if (potentialUsername.length >= 2 && 
                                        potentialUsername.length <= 15 &&
                                        /^[a-zA-Z0-9_]+$/.test(potentialUsername) &&
                                        !['home', 'explore', 'search', 'settings', 'help', 'about', 
                                          'privacy', 'terms', 'notifications', 'messages', 'compose', 
                                          'login', 'signup', 'i', 'intent', 'oauth', 'status'].includes(potentialUsername.toLowerCase())) {{
                                        usernames.add(potentialUsername);
                                    }}
                                }}
                            }});
                        }});
                        
                        // Method 2: Look for @mentions in text
                        const textNodes = document.evaluate(
                            '//text()[contains(., "@")]',
                            document,
                            null,
                            XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE,
                            null
                        );
                        
                        for (let i = 0; i < textNodes.snapshotLength; i++) {{
                            const node = textNodes.snapshotItem(i);
                            const text = node.textContent;
                            const mentions = text.match(/@([a-zA-Z0-9_]{{2,15}})/g);
                            if (mentions) {{
                                mentions.forEach(mention => {{
                                    const username = mention.substring(1);
                                    if (username.length >= 2 && username.length <= 15) {{
                                        usernames.add(username);
                                    }}
                                }});
                            }}
                        }}
                        
                        return Array.from(usernames);
                    }}''')
                    
                    # Add new usernames to our collection
                    new_count = 0
                    for uname in batch_usernames:
                        if uname not in found_usernames and uname.lower() != username.lower():
                            found_usernames.add(uname)
                            new_count += 1
                    
                    log_info(f"Found {new_count} new usernames (Total: {len(found_usernames)})")
                    
                    # Stop if we have enough or no new usernames found
                    if len(found_usernames) >= max_followers or new_count == 0:
                        break
                
                # Convert to follower format
                for i, uname in enumerate(list(found_usernames)[:max_followers]):
                    followers.append({{
                        'username': uname,
                        'display_name': uname.replace('_', ' ').title(),
                        'extracted_at': datetime.now().isoformat(),
                        'source': page.url,
                        'method': 'oauth_authenticated_browser',
                        'authenticated': authenticated
                    }})
                
                log_info(f"✅ Extracted {len(followers)} followers")
                
                # Sample of extracted usernames
                if followers:
                    sample_usernames = [f['username'] for f in followers[:10]]
                    log_info(f"Sample usernames: {sample_usernames}")
                
            except Exception as e:
                log_error("Twitter follower extraction failed", e)
                
            finally:
                await browser.close()
                log_info("Browser closed")
    
    except Exception as e:
        log_error("Playwright execution failed", e)
        return {{
            "error": "Playwright execution failed",
            "details": str(e),
            "traceback": traceback.format_exc()
        }}
    
    # Create results
    if followers:
        status = "completed"
        log_info(f"SUCCESS: Found {len(followers)} followers for @{username}")
    else:
        status = "partial"
        log_info(f"PARTIAL: Limited followers found for @{username}")
        log_info("This could be due to:")
        log_info("- Twitter authentication requirements")
        log_info("- Account privacy settings")
        log_info("- Rate limiting or bot detection")
    
    results = {{
        "target_username": username,
        "followers_found": len(followers),
        "total_extracted": len(followers),
        "followers": followers,
        "scan_completed_at": datetime.now().isoformat(),
        "status": status,
        "method": "oauth_authenticated_browser",
        "authentication_used": bool(access_token and access_token_secret)
    }}
    
    return results

if __name__ == "__main__":
    try:
        log_info("Starting OAuth-authenticated follower extraction...")
        result = asyncio.run(extract_followers_with_oauth_auth())
        
        # Save results
        with open('/tmp/scan_results.json', 'w') as f:
            json.dump(result, f, indent=2)
        
        log_info("=== EXTRACTION COMPLETE ===")
        log_info(f"Followers extracted: {result.get('followers_found', 0)}")
        log_info("Results saved to: /tmp/scan_results.json")
        
    except Exception as e:
        log_error("Main execution failed", e)
        # Create error result but don't exit with error code
        error_result = {{
            "error": "Main execution failed",
            "details": str(e),
            "traceback": traceback.format_exc(),
            "followers_found": 0,
            "status": "failed"
        }}
        
        with open('/tmp/scan_results.json', 'w') as f:
            json.dump(error_result, f, indent=2)
        
        log_info("Error result saved, exiting gracefully")
`

// Create Python script using cat command instead of files API
console.log('Creating Python follower scanner script...')
const createPythonScript = `cat > /tmp/real_follower_scanner.py << 'EOF'
${pythonScript}
EOF`
        
        await sandbox.process.executeCommand(createPythonScript)
        console.log('Python script created successfully')
        
        await sandbox.process.executeCommand('chmod +x real_follower_scanner.py')
        
        if (job) {
          job.progress = 70;
          job.phase = 'scanning_followers';
        }
        
        // Execute the COMPLETE follower scanning script with environment variables
        console.log('Executing COMPLETE follower scanning script...')
        const maxFollowers = Math.max(estimated_followers * 1.5, 1000) // 50% buffer, minimum 1000
        
        // Execute Python script with better error capture
        const scanResult = await sandbox.process.executeCommand(`cd /tmp && TARGET_USERNAME=${username} MAX_FOLLOWERS=${maxFollowers} python3 real_follower_scanner.py 2>&1`)
        console.log('Real scan execution result:', scanResult)
        console.log('Scan stdout:', scanResult.stdout)
        console.log('Scan stderr:', scanResult.stderr)
        console.log('Scan exit code:', scanResult.exitCode)
        
        // Also check if the script file exists and is readable
        const fileCheck = await sandbox.process.executeCommand('ls -la /tmp/real_follower_scanner.py')
        console.log('Python script file check:', fileCheck.toString())
        
        // Try to run a simple Python test first
        const pythonTest = await sandbox.process.executeCommand('cd /tmp && python3 -c "print(\\"Python is working\\"); import requests; print(\\"Requests imported\\")"')
        console.log('Python basic test:', pythonTest.toString())
        
        // Check if the script failed
        if (scanResult.exitCode !== 0) {
          const errorOutput = scanResult.stdout || scanResult.stderr || 'No output captured'
          console.error('Python script failed with output:', errorOutput)
          
          // Try to get more details about the error
          const debugResult = await sandbox.process.executeCommand('cd /tmp && python3 -u real_follower_scanner.py 2>&1 | head -50')
          console.log('Debug script execution:', debugResult.toString())
          
          throw new Error(`Python script failed with exit code ${scanResult.exitCode}. Output: ${errorOutput}`)
        }
        
        // Also run a direct test to see if Python can access the internet
        const internetTest = await sandbox.process.executeCommand('python3 -c "import requests; print(requests.get(\'https://httpbin.org/ip\').text)" 2>&1')
        console.log('Internet connectivity test:', internetTest.toString())
        
        if (job) {
          job.progress = 85;
          job.phase = 'processing';
        }
        
        // Get the actual results from the scan
        try {
          // First check what files exist in /tmp
          const tmpFiles = await sandbox.process.executeCommand('ls -la /tmp/')
          console.log('Files in /tmp:', tmpFiles.toString())
          
          // Check if our results file exists
          const fileCheck = await sandbox.process.executeCommand('ls -la /tmp/real_scan_results.json 2>/dev/null || echo "File not found"')
          console.log('Results file check:', fileCheck.toString())
          
          // Try to read the results file (check both possible filenames)
          const resultsCommand = await sandbox.process.executeCommand('cat /tmp/scan_results.json 2>/dev/null || cat /tmp/real_scan_results.json 2>/dev/null || echo "{}"')
          console.log('Raw results file content:', resultsCommand.toString())
          
          // Also check Python script logs
          const pythonLogs = await sandbox.process.executeCommand('cat /tmp/python_scan.log 2>/dev/null || echo "No Python logs found"')
          console.log('Python execution logs:', pythonLogs.toString())
          
          const scanData = JSON.parse(resultsCommand.toString() || '{}')
          
          if (job) {
            job.status = 'completed';
            job.phase = 'completed';
            job.progress = 100;
            job.followers_found = scanData.followers_found || 0;
            (job as any).real_data = scanData.followers || [];
          }
          
          console.log(`✅ COMPLETE scan completed for @${username} - Found ${scanData.followers_found || 0} actual followers`)
          
          // Trigger AI analysis of followers
          if (scanData.followers && scanData.followers.length > 0) {
            try {
              console.log('🤖 Starting AI analysis of followers...')
              const analysisResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/analyze/followers`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                  followers: scanData.followers,
                  target_username: username,
                  analysis_type: 'overview'
                })
              })
              
              if (analysisResponse.ok) {
                const analysisData = await analysisResponse.json()
                console.log('✅ AI analysis completed')
                
                // Store analysis results with scan data
                if (job) {
                  (job as any).ai_analysis = analysisData.ai_analysis
                  (job as any).metrics = analysisData.metrics
                }
              } else {
                console.log('⚠️ AI analysis failed, continuing without insights')
              }
            } catch (analysisError) {
              console.log('⚠️ AI analysis error:', analysisError)
            }
          }
          
          // Clean up sandbox after successful scan
          setTimeout(async () => {
            try {
              await daytona.delete(sandbox)
              console.log(`🗑️ Cleaned up sandbox ${sandbox.id}`)
            } catch (cleanupError) {
              console.error('Sandbox cleanup failed:', cleanupError)
            }
          }, 300000) // 5 minutes delay
          
        } catch (resultError) {
          console.error('Error reading scan results:', resultError)
          if (job) {
            job.status = 'failed';
            job.phase = 'error';
            (job as any).error = `Failed to read scan results: ${resultError instanceof Error ? resultError.message : 'Unknown error'}`;
          }
        }
        
      } catch (scanError: any) {
        console.error('❌ REAL scan failed:', scanError)
        console.error('❌ Scan error details:', scanError.stack)
        
        const job = activeScanJobs.get(jobId)
        if (job) {
          job.status = 'failed';
          job.phase = 'error';
          (job as any).error = scanError.message || 'Unknown scan error';
          (job as any).details = scanError.stack || scanError.toString();
        }
        
        // Clean up failed sandbox
        try {
          await daytona.delete(sandbox)
          console.log(`🗑️ Cleaned up failed sandbox ${sandbox.id}`)
        } catch (cleanupError) {
          console.error('Failed sandbox cleanup failed:', cleanupError)
        }
      }
    })

    return NextResponse.json({
      success: true,
      job_id: jobId,
      sandbox_id: sandbox.id,
      username: username,
      account_size: accountSize,
      estimated_duration: estimatedDuration,
      estimated_cost: estimatedCost,
      queue_position: 1,
      status: 'initializing',
      message: `Scan submitted successfully! Optimized Daytona sandbox created for ${accountSize} account.`
    })

  } catch (error) {
    console.error('Daytona scan error:', error)
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace')
    
    return NextResponse.json({ 
      success: false,
      error: 'Failed to start Daytona scan',
      details: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : null
    }, { status: 500 })
  }
}

// Get scan status
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const jobId = searchParams.get('job_id')

    if (!jobId) {
      return NextResponse.json({ 
        error: 'job_id parameter is required' 
      }, { status: 400 })
    }

    // Get job from in-memory tracking
    const job = activeScanJobs.get(jobId)
    
    if (!job) {
      // Job not found in memory - could be expired or server restarted
      // Try to check if it's a valid job ID format and return appropriate response
      if (jobId.startsWith('daytona_')) {
        return NextResponse.json({ 
          job_id: jobId,
          status: 'unknown',
          progress: 0,
          phase: 'unknown',
          message: 'Job not found in active tracking. It may have expired or completed.',
          error: 'Job tracking expired'
        }, { status: 200 }) // Return 200 instead of 404 to avoid polling errors
      }
      
      return NextResponse.json({ 
        error: 'Invalid job ID format' 
      }, { status: 400 })
    }

    const elapsed = Date.now() - job.startTime
    const elapsedMinutes = elapsed / (1000 * 60)

    const phaseMessages = {
      creating_sandbox: 'Creating optimized Daytona sandbox...',
      installing_dependencies: 'Installing Python dependencies...',
      installing_browser: 'Installing Playwright browser...',
      creating_scanner: 'Setting up follower scanner...',
      scanning_followers: `Scanning followers (${job.followers_found.toLocaleString()} found)...`,
      completed: 'Scan completed successfully!',
      error: 'Scan failed with error'
    }

    return NextResponse.json({
      success: true,
      job_id: jobId,
      sandbox_id: job.sandbox_id,
      status: job.status,
      progress: job.progress,
      phase: job.phase,
      username: job.username,
      account_size: job.account_size,
      estimated_duration: job.estimated_duration,
      estimated_cost: job.estimated_cost,
      followers_found: job.followers_found,
      estimated_completion: job.status === 'running' ? `${Math.max(1, parseInt(job.estimated_duration.split('-')[0]) - elapsedMinutes)} minutes` : null,
      message: phaseMessages[job.phase as keyof typeof phaseMessages] || 'Processing...',
      results: job.status === 'completed' ? {
        followers: (job as any).real_data || [],
        ai_analysis: (job as any).ai_analysis || null,
        metrics: (job as any).metrics || null,
        total_followers: job.followers_found
      } : null,
      error: job.status === 'failed' ? (job as any).error : null,
      details: job.status === 'failed' ? (job as any).details : null
    })

  } catch (error) {
    console.error('Daytona status check error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
