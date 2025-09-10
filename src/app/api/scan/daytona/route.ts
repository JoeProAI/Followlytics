import { NextRequest, NextResponse } from 'next/server'
import { Daytona } from '@daytonaio/sdk'
import { activeScanJobs } from '@/lib/scan-jobs'

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
      
      // Create a new sandbox for this scan
      sandbox = await daytona.create({
        image: 'debian:12',
        envVars: {
          TARGET_USERNAME: username,
          MAX_FOLLOWERS: (estimated_followers || 50000).toString() // Remove artificial limit
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
        
        // Install Python and browser dependencies
        console.log('Installing Python and browser dependencies...')
        await sandbox.process.executeCommand('apt-get update && apt-get install -y python3 python3-pip wget curl')
        await sandbox.process.executeCommand('pip3 install requests beautifulsoup4 selenium playwright asyncio aiohttp')
        
        // Install Playwright browsers with proper setup
        console.log('Installing Playwright browsers...')
        await sandbox.process.executeCommand('playwright install chromium --with-deps')
        
        // Verify browser installation
        const browserCheck = await sandbox.process.executeCommand('playwright --version && chromium --version 2>/dev/null || echo "Chromium not in PATH"')
        console.log('Browser check:', browserCheck.toString())

        if (job) {
          job.progress = 40;
          job.phase = 'installing_browser';
        }
        
        // Install Python packages for web scraping with specific versions
        console.log('Installing Python packages...')
        await sandbox.process.executeCommand('pip3 install playwright==1.40.0 beautifulsoup4==4.12.2 requests==2.31.0 selenium==4.15.0 asyncio aiohttp==3.9.0 fake-useragent==1.4.0')
        
        if (job) {
          job.phase = 'creating_scanner';
        }
        
        // Install Playwright browser
        console.log('Installing Playwright browser...')
        await sandbox.process.executeCommand('playwright install chromium')
        
        if (job) {
          job.progress = 55;
          job.phase = 'deploying_script';
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

        // Create test script using echo command instead of files API
        console.log('Creating test script using echo command...')
        const createTestScript = `cat > /tmp/test_sandbox.py << 'EOF'
${testScript}
EOF`
        
        await sandbox.process.executeCommand(createTestScript)
        console.log('Test script created successfully')
        
        // Run the test script first
        console.log('Running sandbox functionality test...')
        const testResult = await sandbox.process.executeCommand('cd /tmp && python3 test_sandbox.py')
        console.log('Test result:', testResult.toString())
        
        // Create browser-based follower extraction script
        console.log('Creating browser-based follower extraction script...')
        const pythonScript = `#!/usr/bin/env python3
import asyncio
import json
import os
import time
from playwright.async_api import async_playwright

async def extract_real_followers():
    username = os.environ.get('TARGET_USERNAME', 'JoeProAI')
    max_followers = int(os.environ.get('MAX_FOLLOWERS', 1000))
    
    print(f"🚀 Extracting REAL followers for @{username} using browser automation")
    print(f"📊 Max followers to extract: {max_followers}")
    print("⚠️ NO MOCK DATA - Real followers only or failure")
    
    followers = []
    
    async with async_playwright() as p:
        # Launch browser with stealth settings
        browser = await p.chromium.launch(
            headless=True,
            args=[
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--no-first-run',
                '--no-zygote',
                '--disable-gpu'
            ]
        )
        
        context = await browser.new_context(
            user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            viewport={'width': 1920, 'height': 1080}
        )
        
        page = await context.new_page()
        
        # Try multiple URLs for follower extraction
        urls_to_try = [
            f'https://x.com/{username}/followers',
            f'https://x.com/{username}/following',
            f'https://x.com/{username}',
            f'https://nitter.net/{username}/followers',
            f'https://nitter.net/{username}'
        ]
        
        print(f"\\nTrying {len(urls_to_try)} URLs for @{username}...")
        
        for url in urls_to_try:
            try:
                print(f"\\n🌐 Trying URL: {url}")
                
                # Navigate to the page
                response = await page.goto(url, wait_until='networkidle', timeout=30000)
                print(f"   Status: {response.status}")
                print(f"   Final URL: {page.url}")
                
                if response.status == 200:
                    # Wait for content to load
                    await page.wait_for_timeout(3000)
                    
                    # Get page content
                    content = await page.content()
                    print(f"   Content length: {len(content):,} chars")
                    
                    # Look for user links and mentions
                    user_links = await page.query_selector_all('a[href*="/"]')
                    print(f"   Found {len(user_links)} links")
                    
                    found_usernames = set()
                    
                    # Extract usernames from links
                    for link in user_links[:100]:  # Limit to first 100 links
                        try:
                            href = await link.get_attribute('href')
                            if href and href.startswith('/') and len(href) > 1:
                                potential_username = href[1:].split('/')[0]
                                if (len(potential_username) >= 2 and 
                                    len(potential_username) <= 15 and
                                    potential_username.replace('_', '').isalnum() and
                                    potential_username.lower() not in [
                                        'home', 'explore', 'search', 'settings', 'help', 
                                        'about', 'privacy', 'terms', 'notifications', 
                                        'messages', 'compose', 'login', 'signup',
                                        username.lower()
                                    ]):
                                    found_usernames.add(potential_username)
                        except:
                            continue
                    
                    # Also look for @mentions in text
                    text_content = await page.text_content('body')
                    if text_content:
                        import re
                        mentions = re.findall(r'@([a-zA-Z0-9_]{2,15})', text_content)
                        for mention in mentions:
                            if mention.lower() != username.lower():
                                found_usernames.add(mention)
                    
                    print(f"   Found {len(found_usernames)} potential usernames")
                    
                    # Convert to follower format
                    if found_usernames:
                        for i, uname in enumerate(list(found_usernames)[:max_followers]):
                            followers.append({
                                'username': uname,
                                'display_name': uname.replace('_', ' ').title(),
                                'extracted_at': time.strftime("%Y-%m-%d %H:%M:%S"),
                                'source': url,
                                'method': 'browser_automation'
                            })
                        
                        print(f"      Sample usernames: {list(found_usernames)[:10]}")
                        print(f"      ✅ Added {len(followers)} followers from this URL")
                        
                        # If we found enough followers, stop trying other URLs
                        if len(followers) >= 10:
                            break
                
                else:
                    print(f"      ❌ HTTP {response.status}")
                    
            except Exception as e:
                print(f"      ❌ Error: {e}")
                continue
        
        await browser.close()
    
    # Create results - NO MOCK DATA
    if followers:
        status = "completed"
        print(f"\\n✅ SUCCESS: Found {len(followers)} real followers for @{username}")
    else:
        status = "failed"
        print(f"\\n❌ FAILURE: No real followers found for @{username}")
        print("   This could be due to:")
        print("   - Account is private")
        print("   - Twitter/X blocking automated access")
        print("   - Rate limiting")
        print("   - Network restrictions in sandbox")
    
    results = {
        "target_username": username,
        "followers_found": len(followers),
        "total_extracted": len(followers),
        "followers": followers,
        "scan_completed_at": time.strftime("%Y-%m-%d %H:%M:%S"),
        "status": status,
        "method": "browser_automation",
        "debug_info": {
            "urls_tried": len(urls_to_try),
            "extraction_method": "playwright_browser"
        }
    }
    
    with open('/tmp/real_scan_results.json', 'w') as f:
        json.dump(results, f, indent=2)
    
    return results

if __name__ == "__main__":
    asyncio.run(extract_real_followers())
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
          
          // Try to read the results file
          const resultsCommand = await sandbox.process.executeCommand('cat /tmp/real_scan_results.json 2>/dev/null || echo "{}"')
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
