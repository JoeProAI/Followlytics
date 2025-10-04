import { NextRequest, NextResponse } from 'next/server'
import { withPaymentGate, isPaymentGateError } from '@/lib/paymentGate'
import { adminDb as db } from '@/lib/firebase-admin'

export async function POST(request: NextRequest) {
  try {
    // Basic auth check (all tiers can save)
    const gateResult = await withPaymentGate(request, {})

    if (isPaymentGateError(gateResult)) {
      return gateResult
    }

    const { userId } = gateResult
    const { tweetText, metadata = {} } = await request.json()

    if (!tweetText) {
      return NextResponse.json({ error: 'Tweet text is required' }, { status: 400 })
    }

    // Save to Firestore
    const savedTweetRef = await db.collection('saved_tweets').add({
      userId,
      text: tweetText,
      metadata: {
        ...metadata,
        savedAt: new Date().toISOString()
      },
      createdAt: new Date().toISOString()
    })

    return NextResponse.json({
      success: true,
      savedId: savedTweetRef.id,
      message: 'Tweet saved successfully'
    })

  } catch (error: any) {
    console.error('Save tweet error:', error)
    return NextResponse.json({
      error: 'Failed to save tweet',
      details: error.message
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    // Get user's saved tweets
    const gateResult = await withPaymentGate(request, {})

    if (isPaymentGateError(gateResult)) {
      return gateResult
    }

    const { userId } = gateResult

    const savedTweetsQuery = await db.collection('saved_tweets')
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .limit(50)
      .get()

    const savedTweets = savedTweetsQuery.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }))

    return NextResponse.json({
      success: true,
      tweets: savedTweets
    })

  } catch (error: any) {
    console.error('Get saved tweets error:', error)
    return NextResponse.json({
      error: 'Failed to get saved tweets',
      details: error.message
    }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const gateResult = await withPaymentGate(request, {})

    if (isPaymentGateError(gateResult)) {
      return gateResult
    }

    const { userId } = gateResult
    const { searchParams } = new URL(request.url)
    const tweetId = searchParams.get('id')

    if (!tweetId) {
      return NextResponse.json({ error: 'Tweet ID is required' }, { status: 400 })
    }

    // Verify ownership and delete
    const tweetDoc = await db.collection('saved_tweets').doc(tweetId).get()

    if (!tweetDoc.exists) {
      return NextResponse.json({ error: 'Tweet not found' }, { status: 404 })
    }

    if (tweetDoc.data()?.userId !== userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    await db.collection('saved_tweets').doc(tweetId).delete()

    return NextResponse.json({
      success: true,
      message: 'Tweet deleted successfully'
    })

  } catch (error: any) {
    console.error('Delete saved tweet error:', error)
    return NextResponse.json({
      error: 'Failed to delete tweet',
      details: error.message
    }, { status: 500 })
  }
}
