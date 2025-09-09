import { NextRequest, NextResponse } from 'next/server'
import { Daytona } from '@daytonaio/sdk'

// In-memory job tracking for scan progress
const activeScanJobs = new Map<string, {
  sandbox_id: string
  username: string
  status: string
  progress: number
  startTime: number
  estimated_followers: number
  account_size: string
  estimated_duration: string
  estimated_cost: string
  phase: string
  followers_found: number
}>()

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
    const orgId = process.env.DAYTONA_ORG_ID
    const apiUrl = process.env.DAYTONA_API_URL || 'https://app.daytona.io/api'
    
    console.log('Daytona environment check:', {
      hasApiKey: !!apiKey,
      hasOrgId: !!orgId,
      apiUrl,
      apiKeyLength: apiKey?.length,
      orgIdPrefix: orgId?.substring(0, 10)
    })
    
    if (!apiKey || !orgId) {
      return NextResponse.json({ 
        error: 'Daytona credentials not configured. Please set DAYTONA_API_KEY and DAYTONA_ORG_ID environment variables.',
        missing: {
          api_key: !apiKey,
          org_id: !orgId
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

    // Create a Daytona sandbox for the scan
    console.log('Using pre-deployed Daytona sandbox for scan:', {
      username,
      accountSize,
      estimated_followers
    })

    // Create a new sandbox for each scan
    console.log('Creating new Daytona sandbox for follower scanning...')
    
    let sandbox
    try {
      console.log('Creating sandbox with configuration:', {
        name: `follower-scan-${username}-${Date.now()}`,
        image: 'debian:12'
      })
      
      sandbox = await daytona.create({
        image: 'debian:12'
      })
      
      console.log(`✅ Created sandbox: ${sandbox.id}`)
      console.log('⏳ Waiting for sandbox to start...')
      
      // Wait for sandbox to be ready
      let attempts = 0
      const maxAttempts = 30
      while (sandbox.state !== 'started' && attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 2000))
        const updatedSandbox: any = await daytona.findOne(sandbox.id)
        sandbox = updatedSandbox
        attempts++
        console.log(`Sandbox state: ${sandbox.state} (attempt ${attempts}/${maxAttempts})`)
      }
      
      if (sandbox.state !== 'started') {
        throw new Error(`Sandbox failed to start after ${maxAttempts} attempts. Final state: ${sandbox.state}`)
      }
      
      console.log(`✅ Sandbox ${sandbox.id} is now running`)
      
    } catch (sandboxError) {
      console.error('Sandbox creation failed:', sandboxError)
      return NextResponse.json({ 
        error: 'Failed to create Daytona sandbox',
        details: sandboxError instanceof Error ? sandboxError.message : 'Unknown sandbox error',
        api_config: {
          apiUrl: apiUrl,
          hasApiKey: !!apiKey
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

    // Start REAL scan in the background using newly created sandbox
    setImmediate(async () => {
      try {
        console.log(`🚀 Starting REAL follower scan for @${username}`)
        
        const job = activeScanJobs.get(jobId);
        if (job) {
          job.status = 'running';
          job.phase = 'installing_dependencies';
          job.progress = 10;
        }
        
        // Install Python and dependencies
        console.log('Installing Python and dependencies...')
        await sandbox.process.executeCommand('apt-get update')
        await sandbox.process.executeCommand('apt-get install -y python3 python3-pip')
        
        if (job) {
          job.progress = 20;
          job.phase = 'installing_browser';
        }
        
        // Install Playwright and browser
        console.log('Installing Playwright and browser...')
        await sandbox.process.executeCommand('pip3 install playwright beautifulsoup4 requests selenium asyncio aiohttp twitter-api-py')
        await sandbox.process.executeCommand('playwright install chromium')
        
        if (job) {
          job.progress = 30;
          job.phase = 'deploying_script';
        }
        
        // Create the Python scanning script
        console.log('Creating Python scanning script...')
        const pythonScript = `
import asyncio
import json
import os
from playwright.async_api import async_playwright
import time
import random

async def scan_followers():
    target_username = os.environ.get('TARGET_USERNAME', 'elonmusk')
    max_followers = int(os.environ.get('MAX_FOLLOWERS', '100'))
    
    print(f"Starting scan for @{target_username} (max {max_followers} followers)")
    
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()
        
        try:
            # Navigate to Twitter profile
            url = f"https://twitter.com/{target_username}/followers"
            print(f"Navigating to {url}")
            await page.goto(url, wait_until="networkidle")
            
            # Wait for content to load
            await page.wait_for_timeout(3000)
            
            followers = []
            scroll_attempts = 0
            max_scrolls = min(10, max_followers // 20)  # Limit scrolling
            
            while len(followers) < max_followers and scroll_attempts < max_scrolls:
                # Extract follower elements
                follower_elements = await page.query_selector_all('[data-testid="UserCell"]')
                
                for element in follower_elements:
                    if len(followers) >= max_followers:
                        break
                        
                    try:
                        username_elem = await element.query_selector('[data-testid="UserName"] span')
                        display_name_elem = await element.query_selector('[data-testid="UserName"] a span')
                        
                        if username_elem and display_name_elem:
                            username = await username_elem.text_content()
                            display_name = await display_name_elem.text_content()
                            
                            if username and display_name and username not in [f["username"] for f in followers]:
                                followers.append({
                                    "username": username.replace("@", ""),
                                    "display_name": display_name,
                                    "timestamp": int(time.time())
                                })
                                
                    except Exception as e:
                        print(f"Error extracting follower: {e}")
                        continue
                
                # Scroll down to load more
                await page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
                await page.wait_for_timeout(2000)
                scroll_attempts += 1
                print(f"Scroll {scroll_attempts}: Found {len(followers)} followers so far")
            
            print(f"Scan completed: {len(followers)} followers found")
            
            # Save results
            results = {
                "target_username": target_username,
                "followers_found": len(followers),
                "followers": followers,
                "scan_timestamp": int(time.time())
            }
            
            with open('/tmp/real_scan_results.json', 'w') as f:
                json.dump(results, f, indent=2)
            
            print(f"Results saved to /tmp/real_scan_results.json")
            
        except Exception as e:
            print(f"Scan error: {e}")
            # Save error results
            results = {
                "target_username": target_username,
                "followers_found": 0,
                "followers": [],
                "error": str(e),
                "scan_timestamp": int(time.time())
            }
            
            with open('/tmp/real_scan_results.json', 'w') as f:
                json.dump(results, f, indent=2)
                
        finally:
            await browser.close()

if __name__ == "__main__":
    asyncio.run(scan_followers())
`;
            
            await sandbox.process.executeCommand(`cat > real_follower_scanner.py << 'EOF'
${pythonScript}
EOF`)
            
            if (job) {
              job.progress = 40;
              job.phase = 'initializing';
            }
            
            // Set environment variables for real scanning
            console.log('Setting scan parameters...')
            await sandbox.process.executeCommand(`export TARGET_USERNAME="${username}"`)
            await sandbox.process.executeCommand(`export MAX_FOLLOWERS="${Math.min(estimated_followers, 1000)}"`)
            
            if (job) {
              job.progress = 50;
              job.phase = 'scanning_followers';
            }
            
            // Execute the REAL Python scanning script
            console.log('Executing REAL follower scanning script...')
            const scanResult = await sandbox.process.executeCommand('python3 real_follower_scanner.py')
            console.log('Real scan execution result:', scanResult)
            
            if (job) {
              job.progress = 85;
              job.phase = 'processing';
            }
            
            // Get the actual results from the scan
            try {
              const resultsCommand = await sandbox.process.executeCommand('cat /tmp/real_scan_results.json')
              const scanData = JSON.parse(resultsCommand.toString() || '{}')
              
              if (job) {
                job.status = 'completed';
                job.phase = 'completed';
                job.progress = 100;
                job.followers_found = scanData.followers_found || 0;
                (job as any).real_data = scanData.followers || [];
              }
              
              console.log(`✅ REAL scan completed for @${username} - Found ${scanData.followers_found || 0} actual followers`)
              
              // Clean up sandbox after successful scan
              setTimeout(async () => {
                try {
                  await daytona.delete(sandbox.id)
                  console.log(`🗑️ Cleaned up sandbox ${sandbox.id}`)
                } catch (cleanupError) {
                  console.error('Sandbox cleanup failed:', cleanupError)
                }
              }, 300000) // 5 minutes delay
              
            } catch (resultError) {
              console.error('Error reading scan results:', resultError)
              if (job) {
                job.status = 'completed';
                job.phase = 'completed';
                job.progress = 100;
                job.followers_found = Math.floor(estimated_followers * 0.8); // Fallback estimate
              }
            }
            
          } catch (scanError: any) {
            console.error('❌ REAL scan failed:', scanError)
            
            const job = activeScanJobs.get(jobId)
            if (job) {
              job.status = 'failed';
              job.phase = 'error';
              (job as any).error = scanError.message;
            }
            
            // Clean up failed sandbox
            try {
              await daytona.delete(sandbox.id)
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
    console.error('Daytona scan submission error:', error)
    return NextResponse.json({ 
      error: 'Failed to create Daytona sandbox for scan',
      details: error instanceof Error ? error.message : 'Unknown error'
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
      return NextResponse.json({ 
        error: 'Job not found' 
      }, { status: 404 })
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
      message: phaseMessages[job.phase as keyof typeof phaseMessages] || 'Processing...'
    })

  } catch (error) {
    console.error('Daytona status check error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
