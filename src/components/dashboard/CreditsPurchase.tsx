'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { loadStripe } from '@stripe/stripe-js'
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js'

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

const CREDIT_PACKAGES = [
  { amount: 50, credits: 50, bonus: 0, popular: false },
  { amount: 100, credits: 105, bonus: 5, popular: true },
  { amount: 250, credits: 265, bonus: 15, popular: false },
  { amount: 500, credits: 550, bonus: 50, popular: false },
]

function CheckoutForm({ amount, credits, onSuccess }: any) {
  const stripe = useStripe()
  const elements = useElements()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!stripe || !elements) return

    setLoading(true)
    setError('')

    const { error: submitError } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/dashboard?credits_purchased=true`,
      },
    })

    if (submitError) {
      setError(submitError.message || 'Payment failed')
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement />
      <button
        type="submit"
        disabled={!stripe || loading}
        className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-medium transition-colors"
      >
        {loading ? 'Processing...' : `Pay $${amount} for $${credits} credits`}
      </button>
      {error && (
        <div className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 p-3 rounded">
          {error}
        </div>
      )}
    </form>
  )
}

export default function CreditsPurchase() {
  const { user } = useAuth()
  const [selectedPackage, setSelectedPackage] = useState<number | null>(null)
  const [clientSecret, setClientSecret] = useState('')
  const [loading, setLoading] = useState(false)
  const [balance, setBalance] = useState(0)

  useEffect(() => {
    if (user) {
      fetchBalance()
    }
  }, [user])

  const fetchBalance = async () => {
    const token = await user?.getIdToken()
    const res = await fetch('/api/credits/balance', {
      headers: { Authorization: `Bearer ${token}` },
    })
    const data = await res.json()
    setBalance(data.balance || 0)
  }

  const handleSelectPackage = async (pkg: typeof CREDIT_PACKAGES[0]) => {
    setLoading(true)
    const token = await user?.getIdToken()

    const res = await fetch('/api/credits/purchase', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ amount: pkg.amount }),
    })

    const data = await res.json()
    setClientSecret(data.clientSecret)
    setSelectedPackage(pkg.amount)
    setLoading(false)
  }

  return (
    <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-6">
      <div className="mb-6">
        <h3 className="text-2xl font-light mb-2">API Credits</h3>
        <div className="flex items-baseline gap-3">
          <span className="text-4xl font-bold text-green-400">${balance.toFixed(2)}</span>
          <span className="text-gray-400">available</span>
        </div>
        <p className="text-sm text-gray-400 mt-2">
          Pricing: $2.00 per 1,000 followers extracted
        </p>
      </div>

      {!selectedPackage ? (
        <>
          <h4 className="text-lg font-medium mb-4">Buy Credits</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {CREDIT_PACKAGES.map((pkg) => (
              <div
                key={pkg.amount}
                className={`relative p-6 border-2 rounded-lg cursor-pointer transition-all hover:border-blue-500 ${
                  pkg.popular
                    ? 'border-blue-500 bg-blue-500/5'
                    : 'border-gray-700 bg-black/40'
                }`}
                onClick={() => handleSelectPackage(pkg)}
              >
                {pkg.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-600 px-3 py-1 text-xs font-medium rounded-full">
                    POPULAR
                  </div>
                )}
                <div className="text-center">
                  <div className="text-3xl font-bold mb-2">${pkg.amount}</div>
                  <div className="text-gray-400 mb-3">
                    ${pkg.credits} in credits
                  </div>
                  {pkg.bonus > 0 && (
                    <div className="inline-block bg-green-500/20 text-green-400 px-3 py-1 rounded text-sm font-medium mb-3">
                      +${pkg.bonus} BONUS
                    </div>
                  )}
                  <div className="text-sm text-gray-500 mt-4">
                    ~{Math.floor((pkg.credits / 2) * 1000).toLocaleString()} followers
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded">
            <h5 className="font-medium mb-2">💡 How it works:</h5>
            <ul className="text-sm text-gray-400 space-y-1">
              <li>• Buy credits upfront, use them whenever you need</li>
              <li>• $2.00 per 1,000 followers extracted via API</li>
              <li>• Credits never expire</li>
              <li>• Automatic deduction on each API call</li>
              <li>• Get bonus credits on larger purchases</li>
            </ul>
          </div>
        </>
      ) : (
        <>
          <div className="mb-4">
            <button
              onClick={() => {
                setSelectedPackage(null)
                setClientSecret('')
              }}
              className="text-blue-400 hover:text-blue-300 text-sm"
            >
              ← Back to packages
            </button>
          </div>

          {clientSecret && stripePromise && (
            <Elements stripe={stripePromise} options={{ clientSecret }}>
              <CheckoutForm
                amount={selectedPackage}
                credits={CREDIT_PACKAGES.find(p => p.amount === selectedPackage)?.credits}
                onSuccess={fetchBalance}
              />
            </Elements>
          )}
        </>
      )}
    </div>
  )
}


