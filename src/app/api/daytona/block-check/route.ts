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

    const { usernames = [] } = await request.json()
    if (!Array.isArray(usernames) || usernames.length === 0) {
      return NextResponse.json({ error: 'Provide usernames array' }, { status: 400 })
    }

    // Placeholder: Daytona-powered bulk checker to be wired next
    const results = usernames.map((u: string) => ({ username: u.replace('@',''), blocksYou: false }))
    return NextResponse.json({ success: true, results, provider: 'daytona', note: 'placeholder' })
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed block-check', details: error.message }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({ message: 'Block-check endpoint. POST { usernames: string[] } with Authorization.' })
}
