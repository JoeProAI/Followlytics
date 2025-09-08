import { NextRequest, NextResponse } from 'next/server'

// Unified Daytona scan endpoint - routes all follower scanning through Daytona
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { username, estimated_followers, priority = 'normal', user_id } = body

    if (!username) {
      return NextResponse.json({ 
        error: 'Username is required' 
      }, { status: 400 })
    }

    // Get Daytona coordinator URL from environment
    const coordinatorUrl = process.env.DAYTONA_COORDINATOR_URL || 'http://localhost:8000'

    // Submit to unified Daytona coordinator
    const response = await fetch(`${coordinatorUrl}/scan/submit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username,
        estimated_followers,
        priority,
        user_id: user_id || 'web_user',
        webhook_url: `${process.env.NEXT_PUBLIC_BASE_URL}/api/webhooks/scan-complete`
      })
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      return NextResponse.json({ 
        error: 'Failed to submit scan to Daytona',
        details: errorData 
      }, { status: 500 })
    }

    const scanData = await response.json()

    return NextResponse.json({
      success: true,
      job_id: scanData.job_id,
      username: scanData.username,
      account_size: scanData.account_size,
      estimated_duration: scanData.estimated_duration,
      estimated_cost: scanData.estimated_cost,
      queue_position: scanData.queue_position,
      status: scanData.status,
      message: `Scan submitted successfully! Optimized for ${scanData.account_size} account.`
    })

  } catch (error) {
    console.error('Daytona scan submission error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
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

    const coordinatorUrl = process.env.DAYTONA_COORDINATOR_URL || 'http://localhost:8000'

    const response = await fetch(`${coordinatorUrl}/scan/${jobId}/status`)

    if (!response.ok) {
      if (response.status === 404) {
        return NextResponse.json({ 
          error: 'Job not found' 
        }, { status: 404 })
      }
      
      return NextResponse.json({ 
        error: 'Failed to get job status' 
      }, { status: 500 })
    }

    const statusData = await response.json()

    return NextResponse.json({
      success: true,
      ...statusData
    })

  } catch (error) {
    console.error('Daytona status check error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
