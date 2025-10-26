'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'

// Countdown timer for founder offer
function CountdownTimer({ endDate }: { endDate: Date }) {
  const [timeLeft, setTimeLeft] = useState('')

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date().getTime()
      const distance = endDate.getTime() - now

      if (distance < 0) {
        setTimeLeft('ENDED')
        clearInterval(timer)
        return
      }

      const days = Math.floor(distance / (1000 * 60 * 60 * 24))
      const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
      const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60))
      const seconds = Math.floor((distance % (1000 * 60)) / 1000)

      setTimeLeft(`${days}d ${hours}h ${minutes}m ${seconds}s`)
    }, 1000)

    return () => clearInterval(timer)
  }, [endDate])

  return (
    <div className="text-2xl font-bold text-white">
      {timeLeft}
    </div>
  )
}

const tiers = [
  {
    name: 'Free',
    price: 0,
    priceId: null,
    tier: 'free',
    description: 'Get started with basic analytics',
    features: [
      '5 searches per day',
      'View your own analytics',
      'Basic content insights',
      '7-day data history',
      'Community support'
    ],
    limitations: [
      'No competitor tracking',
      'No AI analysis',
      'No automated reports'
    ],
    cta: 'Current Plan',
    featured: false
  },
  {
    name: 'Standard',
    price: 19,
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_STANDARD,
    tier: 'starter', // Keep tier key as 'starter' for backend compatibility
    description: 'Perfect for solo creators',
    features: [
      '50 searches per day',
      'Track 5 competitors',
      'AI analysis enabled',
      '30-day data history',
      'Hashtag tracking',
      'Real-time alerts',
      'Email support'
    ],
    cta: 'Start Free Trial',
    featured: false
  },
  {
    name: 'Pro',
    price: 39,
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO,
    tier: 'pro',
    description: 'AI-powered insights for growth',
    features: [
      '200 searches per day',
      'Track 15 competitors',
      'Advanced Grok AI insights',
      '90-day data history',
      'Daily automated reports',
      'Content strategy recommendations',
      'Trend predictions',
      'Priority support'
    ],
    cta: 'Start Free Trial',
    featured: true,
    badge: 'MOST POPULAR'
  },
  {
    name: 'Agency',
    price: 99,
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_AGENCY,
    tier: 'enterprise', // Keep tier key as 'enterprise' for backend compatibility
    description: 'Full intelligence suite for teams',
    features: [
      'Unlimited searches',
      'Unlimited competitors',
      '365-day data history',
      'Custom AI models',
      'Hourly reports',
      'API access',
      'Team collaboration (10 seats)',
      'White-label reports',
      'Dedicated support'
    ],
    cta: 'Start Free Trial',
    featured: false
  },
  {
    name: 'Founder Lifetime',
    price: 119,
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_FOUNDER,
    tier: 'founder',
    description: 'One-time payment, lifetime access',
    features: [
      'Everything in Agency plan',
      'Lifetime access (no monthly fees)',
      'All future updates included',
      'Founder badge',
      'Early access to new features',
      'Exclusive founder community',
      'Limited to 150 buyers only',
      'Lock in this price forever'
    ],
    cta: 'Claim Your Spot',
    featured: false,
    badge: 'LIMITED OFFER',
    isLifetime: true
  }
]

export default function PricingPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [loading, setLoading] = useState<string | null>(null)
  const [billingInterval, setBillingInterval] = useState<'monthly' | 'annual'>('monthly')
  
  // Set founder offer end date (72 hours from now - adjust as needed)
  const founderEndDate = new Date()
  founderEndDate.setHours(founderEndDate.getHours() + 72)

  const handleSubscribe = async (priceId: string | null, tier: string, isLifetime: boolean = false) => {
    if (!user) {
      router.push('/login?redirect=/pricing')
      return
    }

    if (!priceId) {
      alert('This plan is not yet configured. Please contact support or try the Free plan.')
      return
    }

    setLoading(tier)

    try {
      const token = await user.getIdToken()
      
      const response = await fetch('/api/stripe/create-checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ priceId, tier, isLifetime })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || data.details || 'Failed to create checkout session')
      }

      if (data.url) {
        // Success - redirect to Stripe checkout
        window.location.href = data.url
      } else {
        throw new Error('No checkout URL returned from Stripe')
      }
    } catch (error: any) {
      console.error('Subscription error:', error)
      
      // Better error messages for users
      let errorMessage = 'Failed to start subscription. '
      if (error.message.includes('not configured')) {
        errorMessage += 'Stripe is not configured yet. Please contact support.'
      } else if (error.message.includes('Unauthorized')) {
        errorMessage += 'Please log in again and try once more.'
      } else {
        errorMessage += error.message || 'Please try again or contact support.'
      }
      
      alert(errorMessage)
      setLoading(null)
    }
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <nav className="border-b border-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-light tracking-tight">FOLLOWLYTICS</h1>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/dashboard')}
                className="text-sm text-gray-400 hover:text-white transition-colors"
              >
                Dashboard
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Founder Offer Countdown Banner */}
      <div className="bg-gradient-to-r from-purple-600/20 to-blue-600/20 border-y border-purple-500/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <div className="inline-flex items-center gap-2 bg-yellow-500/10 border border-yellow-500/20 rounded-full px-4 py-1 text-xs font-medium text-yellow-400 mb-4">
              🔥 LIMITED TIME OFFER
            </div>
            <h2 className="text-3xl font-bold mb-2">Founder Lifetime Access</h2>
            <p className="text-gray-300 mb-4">
              Pay once, own forever. Limited to first 150 buyers.
            </p>
            <div className="mb-2">
              <CountdownTimer endDate={founderEndDate} />
            </div>
            <p className="text-sm text-gray-400">
              After this timer ends, monthly plans only.
            </p>
          </div>
        </div>
      </div>

      {/* Hero */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
        <h1 className="text-5xl font-light tracking-tight mb-4">
          Simple, Transparent Pricing
        </h1>
        <p className="text-xl text-gray-400 mb-8">
          Start free, upgrade when you need more power
        </p>
        <div className="flex items-center justify-center gap-4 mb-8">
          <div className="inline-flex items-center gap-2 bg-gray-900 border border-gray-800 rounded-full px-4 py-2 text-sm">
            <span className="text-green-400">●</span>
            7-day free trial on all paid plans
          </div>
          <div className="inline-flex items-center gap-2 bg-gray-900 border border-gray-800 rounded-full px-4 py-2 text-sm">
            <span className="text-blue-400">●</span>
            7-day money-back guarantee
          </div>
        </div>

        {/* Billing Toggle */}
        <div className="inline-flex items-center gap-3 bg-gray-900 border border-gray-800 rounded-lg p-1">
          <button
            onClick={() => setBillingInterval('monthly')}
            className={`px-6 py-2 rounded text-sm font-medium transition-colors ${
              billingInterval === 'monthly'
                ? 'bg-white text-black'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setBillingInterval('annual')}
            className={`px-6 py-2 rounded text-sm font-medium transition-colors ${
              billingInterval === 'annual'
                ? 'bg-white text-black'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Annual
            <span className="ml-2 text-xs text-green-400">Save 17%</span>
          </button>
        </div>
      </div>

      {/* Pricing Cards */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-24">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {tiers.map((tier) => (
            <div
              key={tier.tier}
              className={`relative bg-gray-900 border rounded-lg p-8 flex flex-col ${
                tier.featured
                  ? 'border-white shadow-2xl scale-105'
                  : 'border-gray-800'
              }`}
            >
              {tier.badge && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <div className="bg-white text-black text-xs font-medium px-3 py-1 rounded-full">
                    {tier.badge}
                  </div>
                </div>
              )}

              <div className="mb-8">
                <h3 className="text-xl font-medium mb-2">{tier.name}</h3>
                <p className="text-gray-400 text-sm mb-4">{tier.description}</p>
                <div className="flex items-baseline">
                  <span className="text-5xl font-light">${tier.price}</span>
                  {tier.price > 0 && (
                    <span className="text-gray-400 ml-2">
                      {tier.isLifetime ? 'one-time' : '/month'}
                    </span>
                  )}
                </div>
              </div>

              <ul className="space-y-3 mb-8 flex-grow">
                {tier.features.map((feature, idx) => (
                  <li key={idx} className="flex items-start">
                    <svg className="w-5 h-5 text-green-400 mr-3 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-sm text-gray-300">{feature}</span>
                  </li>
                ))}
                {tier.limitations?.map((limitation, idx) => (
                  <li key={`limit-${idx}`} className="flex items-start opacity-50">
                    <svg className="w-5 h-5 text-gray-600 mr-3 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    <span className="text-sm text-gray-500">{limitation}</span>
                  </li>
                ))}
              </ul>

              <button
                onClick={() => handleSubscribe(tier.priceId ?? null, tier.tier, tier.isLifetime)}
                disabled={loading === tier.tier || (!tier.priceId && tier.price > 0)}
                className={`w-full py-3 rounded font-medium transition-colors ${
                  tier.featured
                    ? 'bg-white text-black hover:bg-gray-200'
                    : tier.isLifetime
                    ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:from-purple-700 hover:to-blue-700'
                    : 'bg-gray-800 text-white hover:bg-gray-700'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {loading === tier.tier ? 'Loading...' : tier.cta}
              </button>
            </div>
          ))}
        </div>

        {/* FAQ */}
        <div className="mt-24">
          <h2 className="text-3xl font-light text-center mb-12">Frequently Asked Questions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <div>
              <h3 className="text-lg font-medium mb-2">Can I cancel anytime?</h3>
              <p className="text-gray-400 text-sm">
                Yes! Cancel anytime from your dashboard. No questions asked.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-medium mb-2">What's the free trial?</h3>
              <p className="text-gray-400 text-sm">
                7 days full access to your chosen plan. No credit card required to start.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-medium mb-2">Can I upgrade or downgrade?</h3>
              <p className="text-gray-400 text-sm">
                Yes! Change plans anytime. Prorated billing automatically handled.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-medium mb-2">What payment methods?</h3>
              <p className="text-gray-400 text-sm">
                All major credit cards via Stripe. Secure and encrypted.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

