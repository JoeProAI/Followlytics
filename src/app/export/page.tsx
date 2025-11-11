'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'

export default function ExportPage() {
  const searchParams = useSearchParams()
  const initialUsername = searchParams.get('u') || ''

  const [username, setUsername] = useState(initialUsername)
  const [checking, setChecking] = useState(false)
  const [pricing, setPricing] = useState<any>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (initialUsername) {
      checkPrice(initialUsername)
    }
  }, [initialUsername])

  const checkPrice = async (user: string) => {
    setChecking(true)
    setError('')
    setPricing(null)

    try {
      const res = await fetch('/api/user/check-eligibility', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: user })
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to check pricing')
      }

      setPricing(data)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setChecking(false)
    }
  }

  const handleCheck = () => {
    if (username.trim()) {
      checkPrice(username.replace('@', ''))
    }
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="border-b border-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Link href="/" className="text-xl font-light hover:text-gray-400 transition-colors">
            Followlytics
          </Link>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        
        {/* Input Section */}
        <div className="mb-12">
          <h1 className="text-5xl font-light mb-6">Export Your Followers</h1>
          <p className="text-xl text-gray-400 font-light mb-8">
            Enter your Twitter username to check pricing
          </p>

          <div className="flex gap-4 items-center max-w-xl">
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleCheck()}
              placeholder="@username"
              className="flex-1 px-6 py-3 bg-black border border-gray-800 rounded text-white placeholder-gray-600 focus:outline-none focus:border-white transition-colors"
            />
            <button
              onClick={handleCheck}
              disabled={checking || !username.trim()}
              className="bg-white text-black px-8 py-3 rounded font-medium hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {checking ? 'Checking...' : 'Check Price'}
            </button>
          </div>

          {error && (
            <div className="mt-4 p-4 bg-red-900/20 border border-red-900/50 rounded text-red-400">
              {error}
            </div>
          )}
        </div>

        {/* Pricing Display */}
        {pricing && (
          <div className="border border-gray-900 rounded-lg p-8">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h2 className="text-3xl font-light mb-2">@{pricing.username}</h2>
                <p className="text-gray-500">{pricing.followerCount.toLocaleString()} followers</p>
              </div>
              <div className="text-right">
                {pricing.isFree ? (
                  <div className="text-4xl font-light text-green-400">Free</div>
                ) : (
                  <div className="text-4xl font-light">${pricing.price}</div>
                )}
                <div className="text-sm text-gray-500 mt-1">{pricing.tier}</div>
              </div>
            </div>

            <div className="border-t border-gray-900 pt-6 mb-6">
              <p className="text-gray-400">{pricing.message}</p>
            </div>

            {pricing.isFree ? (
              <button className="w-full bg-white text-black py-4 rounded font-medium hover:bg-gray-200 transition-colors">
                Export Now (Free)
              </button>
            ) : (
              <button className="w-full bg-white text-black py-4 rounded font-medium hover:bg-gray-200 transition-colors">
                Pay ${pricing.price} & Export
              </button>
            )}

            <div className="mt-8 pt-6 border-t border-gray-900">
              <h3 className="text-sm text-gray-500 uppercase tracking-wider mb-4">What You Get</h3>
              <div className="space-y-2 text-sm text-gray-400">
                <div>• Complete follower database export</div>
                <div>• CSV, JSON, Excel formats</div>
                <div>• Change tracking (new/unfollowers)</div>
                <div>• 30-day storage</div>
                <div>• Unlimited re-exports</div>
              </div>
            </div>
          </div>
        )}

        {/* How It Works */}
        {!pricing && !checking && (
          <div className="border-t border-gray-900 pt-12">
            <h2 className="text-2xl font-light mb-6">How It Works</h2>
            <div className="grid md:grid-cols-3 gap-8">
              <div>
                <div className="text-sm text-gray-600 mb-2">Step 1</div>
                <h3 className="text-lg font-light mb-2">Check Price</h3>
                <p className="text-sm text-gray-500">Enter your username. We'll check your follower count and show pricing.</p>
              </div>
              <div>
                <div className="text-sm text-gray-600 mb-2">Step 2</div>
                <h3 className="text-lg font-light mb-2">Pay Once</h3>
                <p className="text-sm text-gray-500">Free under 500 followers. One-time payment for larger accounts.</p>
              </div>
              <div>
                <div className="text-sm text-gray-600 mb-2">Step 3</div>
                <h3 className="text-lg font-light mb-2">Download</h3>
                <p className="text-sm text-gray-500">Export in any format. Track changes. Store for 30 days.</p>
              </div>
            </div>
          </div>
        )}

      </main>
    </div>
  )
}
