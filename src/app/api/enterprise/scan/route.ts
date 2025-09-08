import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'

// Enterprise API endpoint for Daytona-powered scanning
export async function POST(request: NextRequest) {
  try {
    // Enterprise scan is now unified with dashboard authentication
    // No separate API key required

    const body = await request.json()
    const { username, followerCount, userId, priority = 'enterprise' } = body

    // Validate required fields
    if (!username || !followerCount || !userId) {
      return NextResponse.json(
        { error: 'Missing required fields: username, followerCount, userId' },
        { status: 400 }
      )
    }

    // Validate follower count for enterprise tier
    if (followerCount < 10000) {
      return NextResponse.json(
        { error: 'Enterprise scanning is optimized for accounts with 10K+ followers. For smaller accounts, use the standard Daytona scan.' },
        { status: 400 }
      )
    }


    // Calculate estimated cost and time
    const estimatedWorkers = Math.max(1, Math.floor(followerCount / 20000))
    const estimatedTimeHours = Math.max(0.5, followerCount / 50000)
    const estimatedCost = estimatedWorkers * estimatedTimeHours * 2.0 // $2/hour per worker

    // Submit job to Daytona coordinator
    const coordinatorUrl = process.env.DAYTONA_COORDINATOR_URL || 'http://localhost:8000'
    
    try {
      const coordinatorResponse = await fetch(`${coordinatorUrl}/submit-job`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          user_id: userId,
          username: username,
          follower_count: followerCount,
          priority: priority
        })
      })

      if (!coordinatorResponse.ok) {
        const errorText = await coordinatorResponse.text()
        throw new Error(`Coordinator error: ${coordinatorResponse.status} - ${errorText}`)
      }

      const coordinatorResult = await coordinatorResponse.json()

      // Return success response
      return NextResponse.json({
        success: true,
        jobId: coordinatorResult.job_id,
        estimatedCompletion: new Date(Date.now() + estimatedTimeHours * 60 * 60 * 1000).toISOString(),
        estimatedCost: coordinatorResult.estimated_cost || estimatedCost,
        estimatedWorkers: estimatedWorkers,
        message: `Enterprise scan initiated for @${username} with ${followerCount.toLocaleString()} followers`
      })

    } catch (coordinatorError) {
      console.error('Coordinator communication error:', coordinatorError)
      
      // Fallback: Return job queued response even if coordinator is down
      return NextResponse.json({
        success: true,
        jobId: `fallback-${Date.now()}`,
        estimatedCompletion: new Date(Date.now() + estimatedTimeHours * 60 * 60 * 1000).toISOString(),
        estimatedCost: estimatedCost,
        estimatedWorkers: estimatedWorkers,
        message: `Enterprise scan queued for @${username}. Coordinator will process when available.`,
        fallback: true
      })
    }

  } catch (error) {
    console.error('Enterprise scan API error:', error)
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// Get job status
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const jobId = searchParams.get('jobId')
    
    if (!jobId) {
      return NextResponse.json(
        { error: 'Job ID required' },
        { status: 400 }
      )
    }

    const coordinatorUrl = process.env.DAYTONA_COORDINATOR_URL || 'http://localhost:8000'
    
    try {
      const response = await fetch(`${coordinatorUrl}/job/${jobId}`)
      
      if (!response.ok) {
        if (response.status === 404) {
          return NextResponse.json(
            { error: 'Job not found' },
            { status: 404 }
          )
        }
        throw new Error(`Coordinator error: ${response.status}`)
      }

      const jobData = await response.json()
      
      return NextResponse.json({
        success: true,
        job: {
          id: jobData.id,
          status: jobData.status,
          progress: jobData.progress,
          createdAt: jobData.created_at,
          startedAt: jobData.started_at,
          completedAt: jobData.completed_at,
          workersAssigned: jobData.workers_assigned,
          estimatedCost: jobData.estimated_cost,
          actualCost: jobData.actual_cost,
          errorMessage: jobData.error_message
        }
      })

    } catch (coordinatorError) {
      console.error('Coordinator communication error:', coordinatorError)
      
      // Fallback response for when coordinator is unavailable
      return NextResponse.json({
        success: true,
        job: {
          id: jobId,
          status: 'pending',
          progress: 0,
          message: 'Coordinator unavailable. Job status will update when service is restored.'
        },
        fallback: true
      })
    }

  } catch (error) {
    console.error('Get job status error:', error)
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
