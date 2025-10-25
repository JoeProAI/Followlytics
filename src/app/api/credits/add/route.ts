import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { adminDb } from '@/lib/firebase-admin'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-09-30.clover',
})

// Add credits to user account (called after Stripe payment)
export async function POST(req: NextRequest) {
  try {
    const { userId, amount, paymentIntentId } = await req.json()

    if (!userId || !amount) {
      return NextResponse.json({ 
        error: 'Missing required fields' 
      }, { status: 400 })
    }

    // Calculate credits based on amount
    // $50 = $50 credits, $100 = $105 credits (5% bonus), $500 = $550 credits (10% bonus)
    let credits = amount
    if (amount >= 500) {
      credits = amount * 1.10 // 10% bonus
    } else if (amount >= 100) {
      credits = amount * 1.05 // 5% bonus
    }

    // Update user's credit balance
    const userRef = adminDb.collection('users').doc(userId)
    const userDoc = await userRef.get()
    const currentCredits = userDoc.data()?.api_credits || 0

    await userRef.update({
      api_credits: currentCredits + credits,
      credits_last_added: new Date().toISOString(),
      credits_last_amount: credits,
    })

    // Log the transaction
    await adminDb.collection('credit_transactions').add({
      userId,
      type: 'purchase',
      amount: credits,
      payment_amount: amount,
      payment_intent_id: paymentIntentId,
      balance_before: currentCredits,
      balance_after: currentCredits + credits,
      timestamp: new Date().toISOString(),
    })

    return NextResponse.json({ 
      success: true,
      credits_added: credits,
      new_balance: currentCredits + credits,
    })

  } catch (error: any) {
    console.error('[Credits] Error adding credits:', error)
    return NextResponse.json({ 
      error: 'Failed to add credits',
      details: error.message 
    }, { status: 500 })
  }
}
