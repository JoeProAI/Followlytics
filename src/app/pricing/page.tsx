'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'

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
    name: 'Starter',
    price: 29,
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_STARTER,
    tier: 'starter',
    description: 'Perfect for solo creators',
    features: [
      '20 searches per day',
      'Track 3 competitors',
      '30-day data history',
      'Weekly email reports',
      'Basic alerts',
      'Email support'
    ],
    cta: 'Start Free Trial',
    featured: false
  },
  {
    name: 'Pro',
    price: 79,
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO,
    tier: 'pro',
    description: 'AI-powered insights for growth',
    features: [
      '100 searches per day',
      'Track 10 competitors',
      '90-day data history',
      'AI-powered insights',
      'Daily automated reports',
      'Real-time alerts',
      'Trend predictions',
      'Priority support'
    ],
    cta: 'Start Free Trial',
    featured: true,
    badge: 'MOST POPULAR'
  },
  {
    name: 'Enterprise',
    price: 199,
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_ENTERPRISE,
    tier: 'enterprise',
    description: 'Full intelligence suite',
    features: [
      'Unlimited searches',
      'Track 50 competitors',
      '365-day data history',
      'Custom AI models',
      'Hourly reports',
      'API access',
      'Team collaboration (5 seats)',
      'White-label reports',
      'Dedicated support'
    ],
    cta: 'Start Free Trial',
    featured: false,
    badge: 'BEST VALUE'
  }
]

export default function PricingPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [loading, setLoading] = useState<string | null>(null)

  const handleSubscribe = async (priceId: string | null, tier: string) => {
    if (!user) {
      router.push('/login?redirect=/pricing')
      return
    }

    if (!priceId) {
      router.push('/dashboard')
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
        body: JSON.stringify({ priceId, tier })
      })

      const data = await response.json()

      if (data.url) {
        window.location.href = data.url
      } else {
        throw new Error('No checkout URL returned')
      }
    } catch (error) {
      console.error('Subscription error:', error)
      alert('Failed to start subscription. Please try again.')
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

      {/* Hero */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
        <h1 className="text-5xl font-light tracking-tight mb-4">
          Simple, Transparent Pricing
        </h1>
        <p className="text-xl text-gray-400 mb-8">
          Start free, upgrade when you need more power
        </p>
        <div className="inline-flex items-center gap-2 bg-gray-900 border border-gray-800 rounded-full px-4 py-2 text-sm">
          <span className="text-green-400">●</span>
          7-day free trial on all paid plans
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
                  {tier.price > 0 && <span className="text-gray-400 ml-2">/month</span>}
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
                onClick={() => handleSubscribe(tier.priceId ?? null, tier.tier)}
                disabled={loading === tier.tier || (!tier.priceId && tier.price > 0)}
                className={`w-full py-3 rounded font-medium transition-colors ${
                  tier.featured
                    ? 'bg-white text-black hover:bg-gray-200'
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
