// Get real-time status of profile check
// Polls for Daytona scraping progress

import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const username = searchParams.get('username')

    if (!username) {
      return NextResponse.json({ error: 'Username required' }, { status: 400 })
    }

    const cleanUsername = username.replace('@', '').toLowerCase()

    // Get status from Firebase
    const statusDoc = await adminDb
      .collection('price_check_status')
      .doc(cleanUsername)
      .get()

    if (!statusDoc.exists) {
      return NextResponse.json({
        status: 'not_started',
        message: 'Price check not initiated'
      })
    }

    const data = statusDoc.data()!

    // Return user-friendly status
    return NextResponse.json({
      status: data.status,
      message: data.message,
      progress: data.progress || 0,
      followerCount: data.followerCount,
      error: data.error
    })

  } catch (error: any) {
    console.error('[Check Status] Error:', error)
    return NextResponse.json({
      error: 'Failed to get status',
      details: error.message
    }, { status: 500 })
  }
}
