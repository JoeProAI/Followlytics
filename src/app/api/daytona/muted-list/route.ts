import { NextRequest, NextResponse } from 'next/server'
import { adminAuth as auth } from '@/lib/firebase-admin'

export const maxDuration = 60

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const token = authHeader.split('Bearer ')[1]
    const decoded = await auth.verifyIdToken(token)
    if (!decoded?.uid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Placeholder: Daytona-powered scraping to be wired next
    return NextResponse.json({ success: true, items: [], provider: 'daytona', note: 'placeholder' })
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to fetch muted list', details: error.message }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({ message: 'Muted list endpoint. Use POST with Authorization header.' })
}
