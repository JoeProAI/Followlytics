import { NextRequest, NextResponse } from 'next/server'
import { Daytona } from '@daytonaio/sdk'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const sandboxId = searchParams.get('sandboxId')
    
    if (!sandboxId) {
      return NextResponse.json({ error: 'Sandbox ID required' }, { status: 400 })
    }

    console.log(`🔍 Checking extraction status for sandbox: ${sandboxId}`)

    // Initialize Daytona client
    const daytona = new Daytona({
      apiKey: process.env.DAYTONA_API_KEY!,
      apiUrl: process.env.DAYTONA_API_URL!
    })

    // Get the sandbox using the correct SDK method
    const sandbox = await daytona.get(sandboxId)
    
    if (!sandbox) {
      return NextResponse.json({ 
        error: 'Sandbox not found',
        status: 'sandbox_not_found'
      }, { status: 404 })
    }

    console.log(`📊 Sandbox state: ${sandbox.state}`)

    // Check if extraction is complete by looking for results file
    try {
      const resultResponse = await sandbox.process.executeCommand('cat /tmp/followers_result.json 2>/dev/null || echo "not_found"')
      const resultContent = resultResponse.result || ''
      
      if (resultContent === 'not_found' || resultContent.trim() === '') {
        // Check extraction log for progress
        const logResponse = await sandbox.process.executeCommand('tail -10 /tmp/extraction.log 2>/dev/null || echo "no_log"')
        const logContent = logResponse.result || ''
        
        return NextResponse.json({
          status: 'in_progress',
          message: 'Extraction still running in background',
          sandboxId: sandboxId,
          sandboxState: sandbox.state,
          lastLogLines: logContent !== 'no_log' ? logContent.split('\n').slice(-5) : []
        })
      }

      // Parse the results
      const scanResult = JSON.parse(resultContent)
      
      console.log(`✅ Extraction complete: ${scanResult.followerCount} followers found`)
      
      return NextResponse.json({
        status: 'completed',
        message: `Extraction completed successfully`,
        sandboxId: sandboxId,
        sandboxState: sandbox.state,
        result: scanResult
      })

    } catch (error) {
      console.error('❌ Error checking results:', error)
      
      return NextResponse.json({
        status: 'error',
        message: 'Error checking extraction results',
        sandboxId: sandboxId,
        sandboxState: sandbox.state,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }

  } catch (error) {
    console.error('❌ Status check failed:', error)
    return NextResponse.json({ 
      error: 'Failed to check status',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
