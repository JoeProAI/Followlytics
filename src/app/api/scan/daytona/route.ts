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

    // For now, return a mock response since Daytona coordinator isn't deployed yet
    // TODO: Replace with actual Daytona coordinator when available
    const mockJobId = `daytona_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    // Simulate account size estimation
    const accountSize = estimated_followers > 100000 ? 'large' : 
                       estimated_followers > 10000 ? 'medium' : 'small'
    
    const estimatedDuration = estimated_followers > 100000 ? '2-4 hours' :
                             estimated_followers > 10000 ? '30-60 minutes' : '5-15 minutes'
    
    const estimatedCost = estimated_followers > 100000 ? '$5-10' :
                         estimated_followers > 10000 ? '$1-3' : '$0.50-1'

    return NextResponse.json({
      success: true,
      job_id: mockJobId,
      username: username,
      account_size: accountSize,
      estimated_duration: estimatedDuration,
      estimated_cost: estimatedCost,
      queue_position: Math.floor(Math.random() * 5) + 1,
      status: 'queued',
      message: `Scan submitted successfully! Optimized for ${accountSize} account. (Mock response - Daytona coordinator pending deployment)`
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

    // Mock status response since coordinator isn't deployed yet
    // TODO: Replace with actual Daytona coordinator when available
    const mockStatuses = ['queued', 'running', 'completed', 'failed']
    const randomStatus = mockStatuses[Math.floor(Math.random() * mockStatuses.length)]
    
    const mockProgress = randomStatus === 'completed' ? 100 :
                        randomStatus === 'running' ? Math.floor(Math.random() * 80) + 10 :
                        randomStatus === 'failed' ? 0 : 0

    return NextResponse.json({
      success: true,
      job_id: jobId,
      status: randomStatus,
      progress: mockProgress,
      followers_found: randomStatus === 'completed' ? Math.floor(Math.random() * 50000) + 1000 : 0,
      estimated_completion: randomStatus === 'running' ? '15 minutes' : null,
      message: `Mock status for job ${jobId} - Daytona coordinator pending deployment`
    })

  } catch (error) {
    console.error('Daytona status check error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
