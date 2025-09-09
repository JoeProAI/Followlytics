import { NextRequest, NextResponse } from 'next/server'
import { Daytona } from '@daytonaio/sdk'

export async function GET(request: NextRequest) {
  try {
    // Get environment variables
    const apiKey = process.env.DAYTONA_API_KEY
    const apiUrl = process.env.DAYTONA_API_URL || 'https://app.daytona.io/api'
    
    console.log('Testing Daytona connection...')
    console.log('Environment check:', {
      hasApiKey: !!apiKey,
      apiKeyPrefix: apiKey ? apiKey.substring(0, 10) + '...' : 'MISSING',
      apiUrl: apiUrl,
      allDaytonaEnvs: Object.keys(process.env).filter(k => k.includes('DAYTONA'))
    })

    if (!apiKey) {
      return NextResponse.json({
        success: false,
        error: 'DAYTONA_API_KEY not found in environment variables',
        env_vars: Object.keys(process.env).filter(k => k.includes('DAYTONA'))
      }, { status: 500 })
    }

    // Initialize Daytona SDK
    const daytona = new Daytona({
      apiKey: apiKey,
      apiUrl: apiUrl
    })

    // Test connection by listing sandboxes
    console.log('Attempting to list sandboxes...')
    const sandboxes = await daytona.list()
    
    console.log(`Found ${sandboxes.length} sandboxes`)
    
    const sandboxInfo = sandboxes.map((sb: any) => ({
      id: sb.id,
      name: sb.name || 'unnamed',
      state: sb.state,
      created: sb.created_at || 'unknown'
    }))

    return NextResponse.json({
      success: true,
      connection: 'working',
      sandbox_count: sandboxes.length,
      sandboxes: sandboxInfo,
      config: {
        apiUrl: apiUrl,
        hasApiKey: true,
        apiKeyPrefix: apiKey.substring(0, 10) + '...'
      }
    })

  } catch (error: any) {
    console.error('Daytona connection test failed:', error)
    
    return NextResponse.json({
      success: false,
      error: 'Connection failed',
      details: error.message,
      stack: error.stack,
      config: {
        apiUrl: process.env.DAYTONA_API_URL || 'https://app.daytona.io/api',
        hasApiKey: !!process.env.DAYTONA_API_KEY,
        allEnvVars: Object.keys(process.env).filter(k => k.includes('DAYTONA'))
      }
    }, { status: 500 })
  }
}
