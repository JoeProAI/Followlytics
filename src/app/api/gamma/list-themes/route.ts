import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const apiKey = process.env.GAMMA_API_KEY
    
    if (!apiKey) {
      return NextResponse.json({ 
        error: 'GAMMA_API_KEY not configured' 
      }, { status: 500 })
    }

    console.log('[Gamma Themes] Fetching themes from Gamma API...')

    const response = await fetch('https://public-api.gamma.app/v1.0/themes', {
      method: 'GET',
      headers: {
        'X-API-KEY': apiKey,
        'Accept': 'application/json'
      }
    })

    const data = await response.json()
    
    if (!response.ok) {
      console.error('[Gamma Themes] API Error:', data)
      return NextResponse.json({ 
        error: 'Failed to fetch themes',
        details: data 
      }, { status: response.status })
    }

    console.log('[Gamma Themes] Success! Found themes:', data.data?.length || 0)

    // Extract theme IDs and metadata
    const themes = data.data?.map((theme: any) => ({
      id: theme.id,
      name: theme.name,
      type: theme.type,
      colorKeywords: theme.colorKeywords,
      toneKeywords: theme.toneKeywords
    })) || []

    return NextResponse.json({
      success: true,
      themes,
      count: themes.length,
      themeIds: themes.map((t: any) => t.id)
    })

  } catch (error: any) {
    console.error('[Gamma Themes] Error:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch themes',
      message: error.message 
    }, { status: 500 })
  }
}
