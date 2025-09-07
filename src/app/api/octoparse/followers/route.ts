import { NextRequest, NextResponse } from 'next/server'

// Octoparse API integration for Twitter follower scraping
export async function POST(request: NextRequest) {
  try {
    const { username, octoparse_api_key, task_id } = await request.json()

    if (!username || !octoparse_api_key) {
      return NextResponse.json({ 
        error: 'Username and Octoparse API key required' 
      }, { status: 400 })
    }

    // Start Octoparse task
    const startTaskResponse = await fetch('https://dataapi.octoparse.com/api/task/start', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${octoparse_api_key}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        taskId: task_id,
        url: `https://x.com/${username}/followers`
      })
    })

    if (!startTaskResponse.ok) {
      throw new Error(`Octoparse API error: ${startTaskResponse.status}`)
    }

    const taskResult = await startTaskResponse.json()

    return NextResponse.json({
      success: true,
      message: 'Follower scraping started',
      task_id: taskResult.taskId,
      status: 'running',
      estimated_time: '10-30 minutes',
      username,
      instructions: {
        monitor: `Check task status at: GET /api/octoparse/status/${taskResult.taskId}`,
        download: `Download results at: GET /api/octoparse/download/${taskResult.taskId}`
      }
    })

  } catch (error) {
    console.error('Octoparse integration error:', error)
    return NextResponse.json({ 
      error: 'Failed to start follower scraping',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// Check Octoparse task status
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const task_id = searchParams.get('task_id')
    const api_key = searchParams.get('api_key')

    if (!task_id || !api_key) {
      return NextResponse.json({ 
        error: 'Task ID and API key required' 
      }, { status: 400 })
    }

    const statusResponse = await fetch(`https://dataapi.octoparse.com/api/task/status?taskId=${task_id}`, {
      headers: {
        'Authorization': `Bearer ${api_key}`
      }
    })

    if (!statusResponse.ok) {
      throw new Error(`Status check failed: ${statusResponse.status}`)
    }

    const status = await statusResponse.json()

    return NextResponse.json({
      task_id,
      status: status.status, // running, completed, failed
      progress: status.progress || 0,
      followers_found: status.recordsCount || 0,
      estimated_completion: status.estimatedTime,
      message: getStatusMessage(status.status)
    })

  } catch (error) {
    console.error('Status check error:', error)
    return NextResponse.json({ 
      error: 'Failed to check task status',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

function getStatusMessage(status: string): string {
  switch (status) {
    case 'running':
      return 'Scraping followers in progress...'
    case 'completed':
      return 'Follower scraping completed successfully'
    case 'failed':
      return 'Scraping failed - Twitter may have blocked the request'
    case 'paused':
      return 'Task paused - likely due to rate limiting'
    default:
      return 'Unknown status'
  }
}
