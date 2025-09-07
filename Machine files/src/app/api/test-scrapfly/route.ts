import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  console.log('=== SCRAPFLY TEST ENDPOINT ===')
  
  try {
    const scrapflyApiKey = process.env.SCRAPFLY_API_KEY
    console.log('Scrapfly API key exists:', !!scrapflyApiKey)
    console.log('Scrapfly API key length:', scrapflyApiKey?.length || 0)
    
    if (!scrapflyApiKey) {
      return NextResponse.json({ 
        error: 'Scrapfly API key not configured',
        env_vars: Object.keys(process.env).filter(key => key.includes('SCRAPFLY'))
      }, { status: 500 })
    }

    // Test basic Scrapfly API call with simple URL
    const formData = new URLSearchParams({
      key: scrapflyApiKey,
      url: 'https://httpbin.org/get',
      render_js: 'false'
    })

    console.log('Making test Scrapfly request...')
    const response = await fetch('https://api.scrapfly.io/scrape', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: formData
    })

    console.log('Scrapfly response status:', response.status)
    
    if (!response.ok) {
      const errorText = await response.text()
      console.error('Scrapfly test error:', errorText)
      return NextResponse.json({ 
        error: 'Scrapfly API test failed',
        status: response.status,
        details: errorText
      }, { status: 500 })
    }

    const result = await response.json()
    console.log('Scrapfly test successful')

    return NextResponse.json({
      success: true,
      message: 'Scrapfly API is working correctly',
      test_url: 'https://httpbin.org/get',
      response_size: JSON.stringify(result).length
    })

  } catch (error) {
    console.error('Scrapfly test error:', error)
    return NextResponse.json({ 
      error: 'Test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
