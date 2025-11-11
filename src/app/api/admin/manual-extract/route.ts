import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'
import { FieldValue } from 'firebase-admin/firestore'

// MANUAL EXTRACTION TRIGGER - FOR TESTING
export async function POST(request: NextRequest) {
  try {
    const { username, email = 'test@test.com' } = await request.json()

    if (!username) {
      return NextResponse.json({ error: 'Username required' }, { status: 400 })
    }

    // Check if DATA_API_KEY is set
    if (!process.env.DATA_API_KEY) {
      console.error('[Manual Extract] DATA_API_KEY not set!')
      return NextResponse.json({ 
        error: 'API key not configured',
        details: 'Add DATA_API_KEY to Vercel environment variables (your Apify token)'
      }, { status: 500 })
    }

    const cleanUsername = username.replace('@', '').toLowerCase()

    console.log(`[Manual Extract] Starting for @${cleanUsername}`)

    // Import data provider
    const { getDataProvider } = await import('@/lib/data-provider')
    const provider = getDataProvider()

    // Extract followers
    const result = await provider.getFollowers(cleanUsername, {
      maxFollowers: 10000000,
      includeDetails: true
    })

    if (!result.success) {
      return NextResponse.json({
        error: 'Extraction failed',
        details: result.error
      }, { status: 500 })
    }

    console.log(`[Manual Extract] Got ${result.followers.length} followers`)

    // Store in database with TEST access
    await adminDb.collection('follower_database').doc(cleanUsername).set({
      followers: result.followers,
      followerCount: result.followers.length,
      lastExtractedAt: new Date(),
      extractedBy: 'manual',
      accessGranted: FieldValue.arrayUnion('test', email),
      paidAccess: FieldValue.arrayUnion({
        sessionId: 'manual-test',
        email: email,
        accessKey: 'test',
        amount: 0,
        includeGamma: false,
        paidAt: new Date().toISOString()
      })
    }, { merge: true })

    console.log(`[Manual Extract] Stored in database`)

    return NextResponse.json({
      success: true,
      username: cleanUsername,
      followerCount: result.followers.length,
      message: `Extracted ${result.followers.length} followers. You can now test downloads!`,
      testUrl: `/export/success?session_id=manual-test&username=${cleanUsername}`
    })

  } catch (error: any) {
    console.error('[Manual Extract] Error:', error)
    return NextResponse.json({
      error: 'Extraction failed',
      details: error.message
    }, { status: 500 })
  }
}
