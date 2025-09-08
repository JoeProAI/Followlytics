import { NextRequest, NextResponse } from 'next/server'

// Enterprise system status endpoint
export async function GET(request: NextRequest) {
  try {
    const coordinatorUrl = process.env.DAYTONA_COORDINATOR_URL || 'http://localhost:8000'
    
    try {
      // Get system status from coordinator
      const response = await fetch(`${coordinatorUrl}/system/status`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error(`Coordinator error: ${response.status}`)
      }

      const systemStatus = await response.json()
      
      // Get worker status
      const workersResponse = await fetch(`${coordinatorUrl}/workers`)
      const workersData = workersResponse.ok ? await workersResponse.json() : { workers: [] }

      return NextResponse.json({
        success: true,
        system: {
          status: 'operational',
          activeJobs: systemStatus.active_jobs,
          pendingJobs: systemStatus.pending_jobs,
          activeWorkers: systemStatus.active_workers,
          maxWorkers: systemStatus.max_workers,
          queueDepth: systemStatus.queue_depth,
          utilizationRate: systemStatus.active_workers / systemStatus.max_workers,
          usageStats: systemStatus.usage_stats
        },
        workers: workersData.workers.map((worker: any) => ({
          id: worker.sandbox_id,
          status: worker.status,
          currentJob: worker.current_job_id,
          jobsCompleted: worker.jobs_completed,
          lastHeartbeat: worker.last_heartbeat
        })),
        timestamp: new Date().toISOString()
      })

    } catch (coordinatorError) {
      console.error('Coordinator communication error:', coordinatorError)
      
      // Return degraded status when coordinator is unavailable
      return NextResponse.json({
        success: true,
        system: {
          status: 'degraded',
          message: 'Coordinator service unavailable. Enterprise scanning may be limited.',
          activeJobs: 0,
          pendingJobs: 0,
          activeWorkers: 0,
          maxWorkers: 50,
          queueDepth: 0
        },
        workers: [],
        timestamp: new Date().toISOString(),
        fallback: true
      })
    }

  } catch (error) {
    console.error('Enterprise status API error:', error)
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
