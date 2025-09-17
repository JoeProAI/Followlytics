import { NextRequest, NextResponse } from 'next/server'
import { Daytona } from '@daytonaio/sdk'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const sandboxId = searchParams.get('sandboxId')
    
    if (!sandboxId) {
      return NextResponse.json({ error: 'Sandbox ID required' }, { status: 400 })
    }

    console.log(`🔍 Checking results for sandbox: ${sandboxId}`)

    // Initialize Daytona client
    const daytona = new Daytona({
      apiKey: process.env.DAYTONA_API_KEY!,
      apiUrl: process.env.DAYTONA_API_URL!
    })

    // Get the sandbox
    const sandbox = await daytona.get(sandboxId)
    
    if (!sandbox) {
      return NextResponse.json({ 
        error: 'Sandbox not found or expired',
        status: 'sandbox_not_found'
      }, { status: 404 })
    }

    console.log(`📊 Sandbox state: ${sandbox.state}`)

    // Check for results file
    try {
      const resultResponse = await sandbox.process.executeCommand('cat /tmp/followers_result.json 2>/dev/null || echo "not_ready"')
      const resultContent = resultResponse.result || ''
      
      if (resultContent === 'not_ready' || resultContent.trim() === '' || resultContent === 'not_found') {
        // Check if extraction is still running
        const processCheck = await sandbox.process.executeCommand('ps aux | grep -E "(node|simple_scroll)" | grep -v grep | wc -l')
        const processCount = parseInt(processCheck.result || '0')
        
        // Check extraction log for progress
        const logResponse = await sandbox.process.executeCommand('tail -5 /tmp/extraction.log 2>/dev/null || echo "no_log"')
        const logContent = logResponse.result || ''
        
        return NextResponse.json({
          status: processCount > 0 ? 'running' : 'checking',
          message: processCount > 0 ? 'Extraction still running in background' : 'Checking for completion...',
          sandboxId: sandboxId,
          sandboxState: sandbox.state,
          processesRunning: processCount,
          lastLogLines: logContent !== 'no_log' ? logContent.split('\n').filter(line => line.trim()) : [],
          timestamp: new Date().toISOString()
        })
      }

      // Parse the results
      const scanResult = JSON.parse(resultContent)
      
      console.log(`✅ Extraction complete: ${scanResult.followerCount} followers found`)
      
      return NextResponse.json({
        status: 'completed',
        message: `Extraction completed successfully - ${scanResult.followerCount} followers found`,
        sandboxId: sandboxId,
        sandboxState: sandbox.state,
        result: {
          followerCount: scanResult.followerCount,
          status: scanResult.status,
          strategy: scanResult.strategy,
          scanDate: scanResult.scanDate,
          username: scanResult.username,
          // Include first 10 followers as preview
          followersPreview: scanResult.followers ? scanResult.followers.slice(0, 10) : [],
          totalFollowers: scanResult.followers ? scanResult.followers.length : 0
        },
        timestamp: new Date().toISOString()
      })

    } catch (error) {
      console.error('❌ Error checking results:', error)
      
      return NextResponse.json({
        status: 'error',
        message: 'Error checking extraction results',
        sandboxId: sandboxId,
        sandboxState: sandbox.state,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      })
    }

  } catch (error) {
    console.error('❌ Results check failed:', error)
    return NextResponse.json({ 
      error: 'Failed to check results',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
