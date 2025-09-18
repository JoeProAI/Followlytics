import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  // This endpoint helps debug OAuth callback issues
  
  const searchParams = request.nextUrl.searchParams
  const allParams = Array.from(searchParams.entries())
  
  return NextResponse.json({
    message: 'OAuth Debug Status',
    timestamp: new Date().toISOString(),
    url: request.url,
    searchParams: Object.fromEntries(allParams),
    headers: {
      host: request.headers.get('host'),
      'user-agent': request.headers.get('user-agent'),
      'x-forwarded-proto': request.headers.get('x-forwarded-proto'),
      'x-forwarded-host': request.headers.get('x-forwarded-host'),
    },
    cookies: request.cookies.getAll().map(c => ({ name: c.name, hasValue: !!c.value })),
    environment: {
      NEXTAUTH_URL: !!process.env.NEXTAUTH_URL,
      VERCEL_URL: !!process.env.VERCEL_URL,
      NODE_ENV: process.env.NODE_ENV
    }
  })
}
