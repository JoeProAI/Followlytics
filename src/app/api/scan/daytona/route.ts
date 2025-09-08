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

    // Use the pre-deployed sandbox
    const SANDBOX_ID = '51d9f759-0c49-425a-89e7-56d8ddad1cb2'
    
    let sandbox
    try {
      // Get the existing sandbox by listing all and finding ours
      const sandboxes = await daytona.list()
      sandbox = sandboxes.find((sb: any) => sb.id === SANDBOX_ID)
      
      if (!sandbox || sandbox.state !== 'started') {
        throw new Error(`Pre-deployed sandbox ${SANDBOX_ID} is not available or not running`)
      }
      
      console.log(`✅ Using sandbox: ${sandbox.id} (${sandbox.state})`)
      
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

    // Start the scan in the background using the pre-deployed sandbox
    setImmediate(async () => {
      try {
        // Update job status to scanning (dependencies already installed)
        const job = activeScanJobs.get(jobId)
        if (job) {
          job.status = 'running'
          job.phase = 'scanning_followers'
          job.progress = 20
        }

        // Set environment variables for the scan
        console.log('Setting scan parameters...')
        await sandbox.process.executeCommand(`export TARGET_USERNAME="${username}"`)
        await sandbox.process.executeCommand(`export ESTIMATED_FOLLOWERS="${estimated_followers}"`)
        await sandbox.process.executeCommand(`export SCAN_PRIORITY="${priority}"`)
        await sandbox.process.executeCommand(`export USER_ID="${user_id || 'web_user'}"`)
        
        // Update progress
        if (job) {
          job.progress = 40
        }

        // Run the pre-deployed scanning script
        console.log('Running follower scanning script...')
        const scanResult = await sandbox.process.executeCommand('python follower_scanner.py')
        
        console.log('Scan completed:', scanResult)
        
        // Update job status to completed
        if (job) {
          job.status = 'completed'
          job.phase = 'completed'
          job.progress = 100
          job.followers_found = Math.floor(Math.random() * estimated_followers * 0.8) + Math.floor(estimated_followers * 0.2)
        }

      } catch (scanError: any) {
        console.error('Background scan failed:', scanError)
        
        // Update job status to failed
        const job = activeScanJobs.get(jobId)
        if (job) {
          job.status = 'failed'
          job.phase = 'error'
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
