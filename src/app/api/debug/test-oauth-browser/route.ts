import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase-admin'

export const maxDuration = 60 // 1 minute for browser test

export async function POST(request: NextRequest) {
  try {
    // Get the authorization header
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'No authorization token provided' }, { status: 401 })
    }

    const token = authHeader.split(' ')[1]
    const { testUsername } = await request.json()
    
    // Verify the Firebase token
    const decodedToken = await adminAuth.verifyIdToken(token)
    const userId = decodedToken.uid

    console.log('🧪 Testing OAuth browser access for user:', userId)

    // Get user's OAuth tokens
    const tokensDoc = await adminDb.collection('x_tokens').doc(userId).get()
    
    if (!tokensDoc.exists) {
      return NextResponse.json({ 
        error: 'No X OAuth tokens found. Please authorize X access first.',
        success: false
      })
    }

    const tokenData = tokensDoc.data()
    const accessToken = tokenData?.accessToken
    const accessTokenSecret = tokenData?.accessTokenSecret

    if (!accessToken || !accessTokenSecret) {
      return NextResponse.json({ 
        error: 'Invalid X tokens. Please re-authorize X access.',
        success: false
      })
    }

    // Import Playwright dynamically (since it might not be available in production)
    let chromium
    try {
      const playwright = await import('playwright')
      chromium = playwright.chromium
    } catch (error) {
      return NextResponse.json({
        error: 'Playwright not available in this environment. This test needs to run in a Daytona sandbox.',
        success: false,
        suggestion: 'Use the regular scan flow which runs this test in Daytona automatically.'
      })
    }

    console.log('🌐 Launching browser for OAuth test...')
    
    const browser = await chromium.launch({ headless: true })
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    })
    const page = await context.newPage()

    try {
      console.log('🔗 Loading X.com...')
      await page.goto('https://x.com', { waitUntil: 'domcontentloaded', timeout: 30000 })
      
      console.log('🔑 Injecting user OAuth tokens...')
      const injectionResult = await page.evaluate((tokens) => {
        const { accessToken, accessTokenSecret } = tokens
        
        // Set OAuth tokens in localStorage
        localStorage.setItem('twitter_access_token', accessToken)
        localStorage.setItem('twitter_access_token_secret', accessTokenSecret)
        
        // Set authentication cookies for X domains
        document.cookie = `auth_token=${accessToken}; domain=.x.com; path=/; secure; samesite=none`
        document.cookie = `ct0=${accessToken}; domain=.x.com; path=/; secure; samesite=lax`
        
        return { 
          success: true, 
          tokenLength: accessToken ? accessToken.length : 0,
          url: window.location.href
        }
      }, { accessToken, accessTokenSecret })
      
      console.log('🎯 Testing followers page access...')
      const followersUrl = `https://x.com/${testUsername || tokenData.screenName}/followers`
      await page.goto(followersUrl, { waitUntil: 'domcontentloaded', timeout: 30000 })
      
      // Check results
      const currentUrl = page.url()
      const pageTitle = await page.title()
      
      const result = {
        success: true,
        test: 'oauth_browser_access',
        injectionResult,
        followersUrl,
        currentUrl,
        pageTitle,
        accessGranted: currentUrl.includes('/followers') && !currentUrl.includes('/login'),
        redirectedToLogin: currentUrl.includes('/login') || currentUrl.includes('/i/flow/login'),
        tokenInfo: {
          screenName: tokenData.screenName,
          tokenLength: accessToken.length,
          secretLength: accessTokenSecret.length
        }
      }
      
      console.log('📊 OAuth browser test results:', result)
      
      await browser.close()
      return NextResponse.json(result)
      
    } catch (error) {
      await browser.close()
      throw error
    }

  } catch (error) {
    console.error('❌ OAuth browser test error:', error)
    return NextResponse.json({
      error: 'OAuth browser test failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      success: false
    }, { status: 500 })
  }
}
