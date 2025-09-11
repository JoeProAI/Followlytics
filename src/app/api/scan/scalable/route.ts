import { NextRequest, NextResponse } from 'next/server'

// Scalable browser automation for all account sizes
export async function POST(request: NextRequest) {
  try {
    const { username, estimated_followers } = await request.json()
    
    console.log(`📊 Scalable extraction for @${username} (~${estimated_followers} followers)`)
    
    // Determine processing strategy based on account size
    const strategy = getProcessingStrategy(estimated_followers)
    
    console.log(`🔧 Strategy: ${strategy.name}`)
    console.log(`⏱️ Estimated time: ${strategy.estimatedTime}`)
    console.log(`💰 Estimated cost: ${strategy.estimatedCost}`)
    console.log(`🔄 Parallel workers: ${strategy.parallelWorkers}`)
    
    // Create job with appropriate strategy
    const jobId = `scalable_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    // Start processing
    if (strategy.parallelWorkers > 1) {
      return await parallelProcessing(username, estimated_followers, strategy, jobId)
    } else {
      return await singleProcessing(username, estimated_followers, strategy, jobId)
    }
    
  } catch (error) {
    console.error('Scalable extraction error:', error)
    return NextResponse.json(
      { error: 'Failed to initiate scalable extraction' },
      { status: 500 }
    )
  }
}

function getProcessingStrategy(followers: number) {
  if (followers < 10000) {
    return {
      name: 'single_fast',
      parallelWorkers: 1,
      chunkSize: followers,
      estimatedTime: '2-5 minutes',
      estimatedCost: '$0.50-$2.00',
      scrollDelay: 1000,
      batchSize: 50
    }
  } else if (followers < 100000) {
    return {
      name: 'single_optimized',
      parallelWorkers: 1,
      chunkSize: followers,
      estimatedTime: '15-45 minutes',
      estimatedCost: '$2.00-$10.00',
      scrollDelay: 800,
      batchSize: 100
    }
  } else if (followers < 500000) {
    return {
      name: 'parallel_medium',
      parallelWorkers: 3,
      chunkSize: Math.ceil(followers / 3),
      estimatedTime: '30-90 minutes',
      estimatedCost: '$15.00-$40.00',
      scrollDelay: 600,
      batchSize: 200
    }
  } else {
    return {
      name: 'parallel_large',
      parallelWorkers: 5,
      chunkSize: Math.ceil(followers / 5),
      estimatedTime: '1-3 hours',
      estimatedCost: '$40.00-$150.00',
      scrollDelay: 500,
      batchSize: 500
    }
  }
}

async function singleProcessing(username: string, followers: number, strategy: any, jobId: string) {
  console.log(`🚀 Starting single worker processing for ${followers} followers`)
  
  // Import and call the Daytona route handler directly
  const { POST: daytonaHandler } = await import('../daytona/route')
  
  // Create a mock request object
  const mockRequest = {
    json: async () => ({
      username,
      estimated_followers: followers,
      job_id: jobId,
      method: 'optimized_single',
      scroll_delay: strategy.scrollDelay,
      batch_size: strategy.batchSize,
      user_id: 'scalable_system'
    })
  } as NextRequest
  
  return await daytonaHandler(mockRequest)
}

async function parallelProcessing(username: string, followers: number, strategy: any, jobId: string) {
  console.log(`🚀 Starting parallel processing: ${strategy.parallelWorkers} workers`)
  
  const workers = []
  const chunkSize = strategy.chunkSize
  
  for (let i = 0; i < strategy.parallelWorkers; i++) {
    const startOffset = i * chunkSize
    const endOffset = Math.min((i + 1) * chunkSize, followers)
    
    console.log(`👷 Worker ${i + 1}: followers ${startOffset}-${endOffset}`)
    
    // Create worker job
    const workerPromise = createWorker(username, startOffset, endOffset, strategy, `${jobId}_worker_${i}`)
    workers.push(workerPromise)
  }
  
  // Start all workers
  const workerResults = await Promise.allSettled(workers)
  
  // Combine results
  const successfulWorkers = workerResults.filter(result => result.status === 'fulfilled')
  const failedWorkers = workerResults.filter(result => result.status === 'rejected')
  
  console.log(`✅ Successful workers: ${successfulWorkers.length}/${strategy.parallelWorkers}`)
  console.log(`❌ Failed workers: ${failedWorkers.length}/${strategy.parallelWorkers}`)
  
  return NextResponse.json({
    success: true,
    job_id: jobId,
    method: 'parallel_processing',
    status: 'processing',
    workers: {
      total: strategy.parallelWorkers,
      successful: successfulWorkers.length,
      failed: failedWorkers.length
    },
    estimated_time: strategy.estimatedTime,
    estimated_cost: strategy.estimatedCost
  })
}

async function createWorker(username: string, startOffset: number, endOffset: number, strategy: any, workerId: string) {
  console.log(`🔧 Creating worker ${workerId} for range ${startOffset}-${endOffset}`)
  
  // Import and call the Daytona route handler directly
  const { POST: daytonaHandler } = await import('../daytona/route')
  
  // Create a mock request object
  const mockRequest = {
    json: async () => ({
      username,
      estimated_followers: endOffset - startOffset,
      job_id: workerId,
      method: 'parallel_worker',
      start_offset: startOffset,
      end_offset: endOffset,
      scroll_delay: strategy.scrollDelay,
      batch_size: strategy.batchSize,
      user_id: 'scalable_system'
    })
  } as NextRequest
  
  const response = await daytonaHandler(mockRequest)
  
  if (!response.ok) {
    throw new Error(`Worker ${workerId} failed to start: ${response.status}`)
  }
  
  return await response.json()
}

// Status endpoint for monitoring parallel jobs
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const jobId = searchParams.get('job_id')
  
  if (!jobId) {
    return NextResponse.json({ error: 'Missing job_id' }, { status: 400 })
  }
  
  try {
    // Check if this is a parallel job
    if (jobId.includes('_worker_')) {
      // Single worker status - call Daytona handler directly
      const { GET: daytonaGetHandler } = await import('../daytona/route')
      const mockRequest = {
        url: `http://localhost/api/scan/daytona?job_id=${jobId}`
      } as NextRequest
      return await daytonaGetHandler(mockRequest)
    } else {
      // Parallel job - check all workers
      return await getParallelJobStatus(jobId)
    }
    
  } catch (error) {
    console.error('Status check error:', error)
    return NextResponse.json(
      { error: 'Failed to get job status' },
      { status: 500 }
    )
  }
}

async function getParallelJobStatus(jobId: string) {
  // This would need to track worker jobs and combine their status
  // For now, return a placeholder
  return NextResponse.json({
    job_id: jobId,
    status: 'processing',
    method: 'parallel_processing',
    progress: 0,
    message: 'Parallel processing in progress...'
  })
}
