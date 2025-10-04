import { NextRequest, NextResponse } from 'next/server'
import { adminAuth as auth } from '@/lib/firebase-admin'
import { checkUsageLimits, trackAPICall, canAccessFeature, getUserSubscription, Tier, TierLimits } from '@/lib/subscription'

export interface PaymentGateOptions {
  requireTier?: Tier  // Minimum tier required
  requireFeature?: keyof TierLimits  // Specific feature required
  trackUsage?: boolean  // Track this call in usage
  endpoint?: string  // Endpoint name for tracking
}

export async function withPaymentGate(
  request: NextRequest,
  options: PaymentGateOptions = {}
): Promise<{ userId: string; subscription: any } | NextResponse> {
  
  try {
    // 1. Verify authentication
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.split('Bearer ')[1]
    const decoded = await auth.verifyIdToken(token)
    if (!decoded?.uid) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const userId = decoded.uid

    // 2. Get user subscription
    const subscription = await getUserSubscription(userId)

    // 3. Check tier requirement
    if (options.requireTier) {
      const tierHierarchy: Record<Tier, number> = {
        free: 0,
        starter: 1,
        pro: 2,
        enterprise: 3
      }

      if (tierHierarchy[subscription.tier] < tierHierarchy[options.requireTier]) {
        return NextResponse.json({
          error: 'Upgrade required',
          message: `This feature requires ${options.requireTier} tier or higher`,
          currentTier: subscription.tier,
          requiredTier: options.requireTier,
          upgradeUrl: '/pricing'
        }, { status: 402 })
      }
    }

    // 4. Check feature access
    if (options.requireFeature) {
      const hasAccess = await canAccessFeature(userId, options.requireFeature)
      if (!hasAccess) {
        return NextResponse.json({
          error: 'Feature not available',
          message: `Your current plan (${subscription.tier}) does not include this feature`,
          upgradeUrl: '/pricing'
        }, { status: 402 })
      }
    }

    // 5. Check usage limits
    if (options.trackUsage && options.endpoint) {
      const usageCheck = await checkUsageLimits(userId, options.endpoint)
      
      if (!usageCheck.allowed) {
        return NextResponse.json({
          error: 'Usage limit reached',
          message: usageCheck.reason,
          usage: usageCheck.usage,
          upgradeUrl: '/pricing'
        }, { status: 429 })
      }

      // Track the API call
      await trackAPICall(userId, options.endpoint)
    }

    // Return userId and subscription if all checks pass
    return { userId, subscription }

  } catch (error: any) {
    console.error('Payment gate error:', error)
    return NextResponse.json({
      error: 'Payment verification failed',
      details: error.message
    }, { status: 500 })
  }
}

// Helper to quickly check if response is error
export function isPaymentGateError(result: any): result is NextResponse {
  return result instanceof NextResponse
}
