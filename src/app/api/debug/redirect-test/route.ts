import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  // Test the same redirect logic as OAuth callback
  let baseUrl = process.env.NEXTAUTH_URL || process.env.VERCEL_URL
  
  // If no environment URL, construct from request
  if (!baseUrl) {
    const protocol = request.headers.get('x-forwarded-proto') || 'https'
    const host = request.headers.get('host')
    baseUrl = host ? `${protocol}://${host}` : 'http://localhost:3000'
  }
  
  // Ensure baseUrl doesn't have trailing slash and has proper protocol
  if (baseUrl && !baseUrl.startsWith('http')) {
    baseUrl = `https://${baseUrl}`
  }
  baseUrl = baseUrl?.replace(/\/$/, '') || 'http://localhost:3000'
  
  const redirectUrl = `${baseUrl}/login?test=redirect_test`
  
  return NextResponse.json({
    baseUrl,
    redirectUrl,
    environment: {
      NEXTAUTH_URL: process.env.NEXTAUTH_URL,
      VERCEL_URL: process.env.VERCEL_URL,
      host: request.headers.get('host'),
      protocol: request.headers.get('x-forwarded-proto'),
      'x-forwarded-host': request.headers.get('x-forwarded-host'),
      'x-forwarded-for': request.headers.get('x-forwarded-for')
    },
    message: 'This shows what URL the OAuth callback would redirect to'
  })
}
