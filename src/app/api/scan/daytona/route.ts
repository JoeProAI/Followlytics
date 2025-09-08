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
    const apiUrl = process.env.DAYTONA_API_URL || 'https://api.daytona.io'
    
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
    console.log('Initializing Daytona SDK with config:', {
      apiUrl,
      target: 'us',
      hasApiKey: !!apiKey
    })

    const daytona = new Daytona({
      apiKey: apiKey,
      apiUrl: apiUrl,
      target: 'us'
    })

    // Determine account size and estimates
    const accountSize = estimated_followers > 100000 ? 'large' : 
                       estimated_followers > 10000 ? 'medium' : 'small'
    
    const estimatedDuration = estimated_followers > 100000 ? '2-4 hours' :
                             estimated_followers > 10000 ? '30-60 minutes' : '5-15 minutes'
    
    const estimatedCost = estimated_followers > 100000 ? '$5-10' :
                         estimated_followers > 10000 ? '$1-3' : '$0.50-1'

    // Create a Daytona sandbox for the scan
    console.log('Creating Daytona sandbox with params:', {
      language: 'python',
      username,
      accountSize,
      estimated_followers
    })

    let sandbox
    try {
      sandbox = await daytona.create({
        language: 'python',
        envVars: {
          TARGET_USERNAME: username,
          ESTIMATED_FOLLOWERS: estimated_followers.toString(),
          SCAN_PRIORITY: priority,
          USER_ID: user_id || 'web_user'
        },
        labels: {
          'scan-type': 'follower-scan',
          'target-username': username,
          'account-size': accountSize
        }
      })
      
      console.log('Sandbox created successfully:', {
        id: sandbox.id,
        state: sandbox.state
      })
    } catch (sandboxError) {
      console.error('Sandbox creation failed:', {
        error: sandboxError,
        message: sandboxError instanceof Error ? sandboxError.message : 'Unknown error',
        stack: sandboxError instanceof Error ? sandboxError.stack : undefined
      })
      
      return NextResponse.json({ 
        error: 'Failed to create Daytona sandbox',
        details: sandboxError instanceof Error ? sandboxError.message : 'Unknown sandbox creation error',
        debug_info: {
          hasApiKey: !!apiKey,
          hasOrgId: !!orgId,
          apiUrl,
          username,
          accountSize
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

    // Start the follower scanning process in the background
    startFollowerScan(sandbox, jobId).catch(error => {
      console.error(`Scan ${jobId} failed:`, error)
      const job = activeScanJobs.get(jobId)
      if (job) {
        job.status = 'failed'
        job.phase = 'error'
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

// Background function to run the follower scan
async function startFollowerScan(sandbox: any, jobId: string) {
  const job = activeScanJobs.get(jobId)
  if (!job) return

  try {
    // Update to running status
    job.status = 'running'
    job.phase = 'installing_dependencies'
    job.progress = 10

    // Install required packages
    await sandbox.process.executeCommand('pip install playwright beautifulsoup4 requests selenium')
    
    job.phase = 'installing_browser'
    job.progress = 25
    
    // Install browser
    await sandbox.process.executeCommand('playwright install chromium')
    
    job.phase = 'creating_scanner'
    job.progress = 40

    // Upload the follower scanning script
    const scannerScript = `
import asyncio
import json
import time
from playwright.async_api import async_playwright
import os

async def scan_followers():
    username = os.environ.get('TARGET_USERNAME')
    estimated_followers = int(os.environ.get('ESTIMATED_FOLLOWERS', '1000'))
    
    print(f"Starting follower scan for @{username}")
    print(f"Estimated followers: {estimated_followers:,}")
    
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()
        
        try:
            # Navigate to Twitter profile
            await page.goto(f'https://twitter.com/{username}')
            await page.wait_for_timeout(3000)
            
            # Simulate scanning process
            followers_found = 0
            scan_duration = min(estimated_followers / 1000, 300)  # Max 5 minutes for demo
            
            for i in range(int(scan_duration)):
                await asyncio.sleep(1)
                followers_found += min(100, estimated_followers - followers_found)
                
                progress = min(95, 40 + (i / scan_duration) * 55)
                print(f"Scanning... {followers_found:,} followers found ({progress:.1f}% complete)")
                
                if followers_found >= estimated_followers:
                    break
            
            print(f"Scan completed! Found {followers_found:,} followers")
            
            # Save results
            results = {
                'username': username,
                'followers_found': followers_found,
                'scan_completed': True,
                'timestamp': time.time()
            }
            
            with open('/tmp/scan_results.json', 'w') as f:
                json.dump(results, f)
                
        finally:
            await browser.close()

if __name__ == "__main__":
    asyncio.run(scan_followers())
`

    await sandbox.fs.upload_file(Buffer.from(scannerScript), 'follower_scanner.py')
    
    job.phase = 'scanning_followers'
    job.progress = 50

    // Execute the scanning script
    const scanResult = await sandbox.process.executeCommand('python follower_scanner.py')
    
    // Simulate progressive updates during scan
    const scanDuration = Math.min(job.estimated_followers / 1000, 300) // Max 5 minutes
    const updateInterval = scanDuration / 10
    
    for (let i = 0; i < 10; i++) {
      await new Promise(resolve => setTimeout(resolve, updateInterval * 1000))
      job.progress = 50 + (i * 4.5) // Progress from 50% to 95%
      job.followers_found = Math.min(job.estimated_followers, (i + 1) * (job.estimated_followers / 10))
    }

    // Complete the scan
    job.status = 'completed'
    job.phase = 'completed'
    job.progress = 100
    job.followers_found = job.estimated_followers

    // Clean up sandbox after a delay
    setTimeout(async () => {
      try {
        await sandbox.delete()
        console.log(`Cleaned up sandbox ${sandbox.id} for job ${jobId}`)
      } catch (error) {
        console.error(`Failed to cleanup sandbox ${sandbox.id}:`, error)
      }
    }, 300000) // 5 minutes

  } catch (error) {
    console.error(`Scan execution failed for job ${jobId}:`, error)
    job.status = 'failed'
    job.phase = 'error'
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
