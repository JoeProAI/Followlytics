import { NextRequest, NextResponse } from 'next/server'
import { adminDb as db } from '@/lib/firebase-admin'
import { FieldValue } from 'firebase-admin/firestore'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-11-20.acacia'
})

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!

export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const signature = request.headers.get('stripe-signature')!

    let event: Stripe.Event

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
    } catch (err: any) {
      console.error('Webhook signature verification failed:', err.message)
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
    }

    console.log(`[Stripe Webhook] Event: ${event.type}`)

    // Handle subscription events
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        await handleCheckoutCompleted(session)
        break
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        await handleSubscriptionUpdate(subscription)
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        await handleSubscriptionCanceled(subscription)
        break
      }

      case 'invoice.paid': {
        const invoice = event.data.object as Stripe.Invoice
        await handleInvoicePaid(invoice)
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        await handlePaymentFailed(invoice)
        break
      }
    }

    return NextResponse.json({ received: true })

  } catch (error: any) {
    console.error('[Stripe Webhook] Error:', error)
    return NextResponse.json({
      error: 'Webhook handler failed',
      details: error.message
    }, { status: 500 })
  }
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  // Check if this is a follower export payment or subscription payment
  const username = session.metadata?.username
  const userId = session.metadata?.userId
  const tier = session.metadata?.tier

  // FOLLOWER EXPORT PAYMENT
  if (username) {
    console.log(`[Checkout Completed] Follower export payment for @${username}`)
    
    const amount = parseFloat(session.metadata?.amount || '0')
    const includeGamma = session.metadata?.includeGamma === 'true'
    const gammaStyle = session.metadata?.gammaStyle || ''
    const customInstructions = session.metadata?.customInstructions || ''
    
    // Get customer email - fetch from customer object if not in session
    let customerEmail = session.customer_email
    if (!customerEmail && session.customer) {
      try {
        const customer = await stripe.customers.retrieve(session.customer as string)
        if ('email' in customer && customer.email) {
          customerEmail = customer.email
        }
      } catch (error) {
        console.error('Failed to fetch customer email:', error)
      }
    }
    
    // Use session ID as fallback if still no email
    const accessKey = customerEmail || session.id
    
    console.log(`[Payment] Customer email: ${customerEmail || 'NONE'}, using key: ${accessKey}`)
    
    // Grant access to follower data
    await db.collection('follower_database').doc(username).set({
      accessGranted: FieldValue.arrayUnion(accessKey),
      paidAccess: FieldValue.arrayUnion({
        sessionId: session.id,
        email: customerEmail || 'no-email',
        accessKey,
        amount,
        includeGamma,
        gammaStyle,
        customInstructions,
        paidAt: new Date().toISOString()
      })
    }, { merge: true })
    
    // Store payment record
    await db.collection('payments').doc(session.id).set({
      type: 'follower_export',
      username,
      amount,
      includeGamma,
      gammaStyle,
      customInstructions,
      sessionId: session.id,
      customerId: session.customer,
      customerEmail: customerEmail || 'no-email',
      accessKey,
      status: 'completed',
      createdAt: new Date().toISOString()
    })
    
    console.log(`[Payment Success] @${username} - Access granted to ${accessKey}`)
    
    // ALWAYS trigger extraction after payment (this is when we actually extract!)
    console.log(`[Webhook] Payment received, starting extraction for @${username}`)
    triggerDataExtraction(username, customerEmail || 'no-email').catch((err: any) => {
      console.error('[Webhook] Failed to trigger extraction:', err)
    })
    
    return
  }

  // SUBSCRIPTION PAYMENT
  if (!userId || !tier) {
    console.error('Missing userId or tier in session metadata')
    return
  }

  console.log(`[Checkout Completed] User ${userId} subscribed to ${tier}`)

  // Update user subscription in Firestore
  await db.collection('subscriptions').doc(userId).set({
    userId,
    tier,
    status: 'active',
    customerId: session.customer,
    subscriptionId: session.subscription,
    current_period_start: new Date(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }, { merge: true })
}

async function handleSubscriptionUpdate(subscription: Stripe.Subscription) {
  const userId = subscription.metadata?.userId
  const tier = subscription.metadata?.tier

  if (!userId) {
    console.error('Missing userId in subscription metadata')
    return
  }

  console.log(`[Subscription Updated] User ${userId} - Status: ${subscription.status}`)

  await db.collection('subscriptions').doc(userId).set({
    userId,
    tier,
    status: subscription.status,
    subscriptionId: subscription.id,
    customerId: subscription.customer as string,
    current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
    current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
    cancel_at_period_end: subscription.cancel_at_period_end,
    updated_at: new Date().toISOString()
  }, { merge: true })
}

async function handleSubscriptionCanceled(subscription: Stripe.Subscription) {
  const userId = subscription.metadata?.userId

  if (!userId) {
    console.error('Missing userId in subscription metadata')
    return
  }

  console.log(`[Subscription Canceled] User ${userId}`)

  await db.collection('subscriptions').doc(userId).set({
    status: 'canceled',
    canceled_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }, { merge: true })
}

async function handleInvoicePaid(invoice: Stripe.Invoice) {
  const userId = invoice.subscription_details?.metadata?.userId

  if (!userId) return

  console.log(`[Invoice Paid] User ${userId} - Amount: $${(invoice.amount_paid / 100).toFixed(2)}`)

  // Log payment in Firestore
  await db.collection('payments').add({
    userId,
    amount: invoice.amount_paid / 100,
    currency: invoice.currency,
    status: 'paid',
    invoice_id: invoice.id,
    created_at: new Date().toISOString()
  })
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  const userId = invoice.subscription_details?.metadata?.userId

  if (!userId) return

  console.log(`[Payment Failed] User ${userId}`)

  // Update subscription status
  await db.collection('subscriptions').doc(userId).set({
    status: 'past_due',
    payment_failed_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }, { merge: true })
}

// Trigger data extraction after payment
async function triggerDataExtraction(username: string, customerEmail: string) {
  try {
    console.log(`[Extraction Trigger] Starting extraction for @${username}`)
    
    // Check env var
    if (!process.env.DATA_API_KEY) {
      console.error('[Extraction] CRITICAL: DATA_API_KEY not set in environment!')
      
      // Store error state in database
      await db.collection('follower_database').doc(username).set({
        error: 'DATA_API_KEY not configured',
        extractionFailed: true,
        lastAttemptedAt: new Date(),
        customerEmail
      }, { merge: true })
      
      return
    }
    
    console.log('[Extraction] DATA_API_KEY found, starting extraction...')
    
    // Set initial progress
    await db.collection('follower_database').doc(username).set({
      extractionProgress: {
        status: 'starting',
        message: 'Starting extraction...',
        percentage: 0,
        startedAt: new Date(),
        estimatedTimeRemaining: '1-2 minutes'
      },
      customerEmail
    }, { merge: true })
    
    const { getDataProvider } = await import('@/lib/data-provider')
    const provider = getDataProvider()
    
    console.log(`[Extraction] Starting direct extraction for @${username} (max 10K for speed)`)
    
    // Update progress
    await db.collection('follower_database').doc(username).set({
      extractionProgress: {
        status: 'extracting',
        message: 'Extracting followers from Twitter...',
        percentage: 25,
        estimatedTimeRemaining: '30-60 seconds'
      }
    }, { merge: true })
    
    const startTime = Date.now()
    
    // Extract directly with reasonable limit for first run
    // This avoids timeout issues with profile check
    const result = await provider.getFollowers(username, {
      maxFollowers: 10000, // Reasonable limit, fast extraction
      includeDetails: true
    })
    
    const duration = Math.round((Date.now() - startTime) / 1000)
    
    console.log(`[Extraction] getFollowers returned - success: ${result.success}, followers: ${result.followers?.length || 0}`)
    
    if (!result.success) {
      console.error(`[Extraction] Failed for @${username}:`, result.error)
      
      // Store error state
      await db.collection('follower_database').doc(username).set({
        error: result.error || 'Unknown extraction error',
        extractionFailed: true,
        lastAttemptedAt: new Date(),
        customerEmail
      }, { merge: true })
      
      return
    }
    
    if (!result.followers || result.followers.length === 0) {
      console.error(`[Extraction] No followers extracted for @${username}`)
      
      // Store zero followers state
      await db.collection('follower_database').doc(username).set({
        error: 'No followers found or extraction returned empty',
        extractionFailed: true,
        lastAttemptedAt: new Date(),
        customerEmail
      }, { merge: true })
      
      return
    }
    
    console.log(`[Extraction] SUCCESS - ${result.followers.length} followers for @${username} (took ${duration}s)`)
    
    // Clean followers - remove undefined values for Firestore
    const cleanFollowers = result.followers.map((f: any) => ({
      username: f.username || '',
      name: f.name || '',
      bio: f.bio || '',
      verified: f.verified || false,
      followersCount: f.followersCount || 0,
      followingCount: f.followingCount || 0,
      profileImageUrl: f.profileImageUrl || '',
      location: f.location || ''
    }))
    
    // Store in database (overwrites if exists)
    await db.collection('follower_database').doc(username).set({
      followers: cleanFollowers,
      followerCount: cleanFollowers.length,
      lastExtractedAt: new Date(),
      extractedBy: 'webhook',
      customerEmail,
      extractionFailed: false,
      extractionProgress: {
        status: 'complete',
        message: `Successfully extracted ${cleanFollowers.length} followers`,
        percentage: 100,
        completedAt: new Date(),
        duration: `${duration} seconds`
      }
    }, { merge: true })
    
    console.log(`[Extraction] Stored ${cleanFollowers.length} followers in database for @${username}`)
    
    // Send email with download links
    if (customerEmail && customerEmail !== 'no-email') {
      try {
        console.log(`[Email] Sending notification to ${customerEmail}`)
        
        const { Resend } = await import('resend')
        const resend = new Resend(process.env.RESEND_API_KEY)
        
        const downloadUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://followlytics-zeta.vercel.app'}/export/success?username=${username}&session_id=email_access`
        
        await resend.emails.send({
          from: 'Followlytics <notifications@followlytics.io>',
          to: customerEmail,
          subject: `✅ Your ${cleanFollowers.length} Followers Are Ready!`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h1 style="color: #1DA1F2;">🎉 Your Follower Export is Ready!</h1>
              
              <p>Great news! We've successfully extracted <strong>${cleanFollowers.length} followers</strong> from <strong>@${username}</strong>.</p>
              
              <div style="background: #f5f8fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="margin-top: 0;">📊 What You Get:</h3>
                <ul>
                  <li><strong>${cleanFollowers.length} followers</strong> with complete profile data</li>
                  <li>CSV format (Excel-ready)</li>
                  <li>JSON format (developer-friendly)</li>
                  <li>Excel format (.xlsx)</li>
                </ul>
              </div>
              
              <a href="${downloadUrl}" style="display: inline-block; background: #1DA1F2; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; margin: 20px 0;">
                Download Your Followers
              </a>
              
              <p style="color: #657786; font-size: 14px;">This link will remain active for 30 days.</p>
              
              <hr style="border: none; border-top: 1px solid #e1e8ed; margin: 30px 0;">
              
              <p style="color: #657786; font-size: 12px;">
                Questions? Reply to this email or visit our help center.<br>
                Thanks for using Followlytics!
              </p>
            </div>
          `
        })
        
        console.log(`[Email] Successfully sent to ${customerEmail}`)
      } catch (emailError: any) {
        console.error(`[Email] Failed to send:`, emailError)
        // Don't fail the whole extraction if email fails
      }
    }
    
  } catch (error: any) {
    console.error(`[Extraction] EXCEPTION for @${username}:`, error.message, error.stack)
    
    // Store exception state
    try {
      await db.collection('follower_database').doc(username).set({
        error: error.message || 'Unknown exception',
        extractionFailed: true,
        lastAttemptedAt: new Date(),
        customerEmail
      }, { merge: true })
    } catch (dbError) {
      console.error('[Extraction] Failed to store error state:', dbError)
    }
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json({
    message: 'Stripe Webhook Endpoint',
    note: 'This endpoint receives events from Stripe',
    events_handled: [
      'checkout.session.completed',
      'customer.subscription.created',
      'customer.subscription.updated',
      'customer.subscription.deleted',
      'invoice.paid',
      'invoice.payment_failed'
    ]
  })
}
