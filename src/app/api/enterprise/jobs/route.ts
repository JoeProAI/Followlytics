import { NextRequest, NextResponse } from 'next/server'

// Enterprise jobs listing endpoint
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const limit = parseInt(searchParams.get('limit') || '100')
    
    const coordinatorUrl = process.env.DAYTONA_COORDINATOR_URL || 'http://localhost:8000'
    
    try {
      // Build query parameters
      const queryParams = new URLSearchParams()
      if (status) queryParams.append('status', status)
      queryParams.append('limit', limit.toString())
      
      const response = await fetch(`${coordinatorUrl}/jobs?${queryParams}`)
      
      if (!response.ok) {
        throw new Error(`Coordinator error: ${response.status}`)
      }

      const jobsData = await response.json()
      
      return NextResponse.json({
        success: true,
        jobs: jobsData.jobs.map((job: any) => ({
          id: job.id,
          username: job.username,
          status: job.status,
          progress: job.progress,
          createdAt: job.created_at,
          startedAt: job.started_at,
          completedAt: job.completed_at,
          followerCount: job.follower_count,
          workersAssigned: job.workers_assigned || 0,
          estimatedCost: job.estimated_cost || 0,
          actualCost: job.actual_cost || 0,
          errorMessage: job.error_message
        }))
      })

    } catch (coordinatorError) {
      console.error('Coordinator communication error:', coordinatorError)
      
      // Return empty list when coordinator is unavailable
      return NextResponse.json({
        success: true,
        jobs: [],
        message: 'Coordinator service unavailable. Job history will load when service is restored.',
        fallback: true
      })
    }

  } catch (error) {
    console.error('Enterprise jobs API error:', error)
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
