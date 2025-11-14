'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import LaunchTimer, { isLaunchWeek, getLaunchDiscount } from '@/components/LaunchTimer'

function ExportContent() {
  const searchParams = useSearchParams()
  const initialUsername = searchParams.get('u') || ''

  const [username, setUsername] = useState(initialUsername)
  const [checking, setChecking] = useState(false)
  const [pricing, setPricing] = useState<any>(null)
  const [error, setError] = useState('')
  const [addGamma, setAddGamma] = useState(false)
  const [gammaStyle, setGammaStyle] = useState('clean')
  const [customInstructions, setCustomInstructions] = useState('')
  const [turnstileToken, setTurnstileToken] = useState('')
  
  // Status polling
  const [checkStatus, setCheckStatus] = useState<any>(null)
  const [statusPolling, setStatusPolling] = useState(false)

  useEffect(() => {
    if (initialUsername) {
      checkPrice(initialUsername)
    }
  }, [initialUsername])

  // TODO: Add Cloudflare Turnstile later when configured
  // useEffect(() => {
  //   const script = document.createElement('script')
  //   script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js'
  //   script.async = true
  //   script.defer = true
  //   document.body.appendChild(script)

  //   return () => {
  //     document.body.removeChild(script)
  //   }
  // }, [])

  // Poll for status updates
  const pollStatus = async (user: string) => {
    setStatusPolling(true)
    const cleanUser = user.replace('@', '')
    
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/user/check-status?username=${cleanUser}`)
        const data = await res.json()
        
        setCheckStatus(data)
        
        // Stop polling when complete or failed
        if (data.status === 'complete' || data.status === 'failed') {
          clearInterval(interval)
          setStatusPolling(false)
        }
      } catch (err) {
        console.error('Status poll error:', err)
      }
    }, 2000) // Poll every 2 seconds

    // Cleanup after 2 minutes (max 500 followers per check)
    setTimeout(() => {
      clearInterval(interval)
      setStatusPolling(false)
    }, 120000)
  }

  const checkPrice = async (user: string) => {
    setChecking(true)
    setError('')
    setPricing(null)
    setCheckStatus(null)

    // Start polling for status
    pollStatus(user)

    try {
      // Add 2 minute timeout (eligibility check extracts max 500 followers)
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 120000)

      const res = await fetch('/api/user/check-eligibility', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: user }),
        signal: controller.signal
      })

      clearTimeout(timeoutId)

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Failed to check eligibility')
        return
      }

      setPricing(data)
    } catch (err: any) {
      if (err.name === 'AbortError') {
        setError('Request timed out. The API is taking too long. Please try again.')
      } else {
        setError('Network error. Please try again.')
      }
      console.error('Check price error:', err)
    } finally {
      setChecking(false)
      setStatusPolling(false)
    }
  }

  const handleCheck = () => {
    if (username.trim()) {
      checkPrice(username.replace('@', ''))
    }
  }

  const handlePayment = async () => {
    if (!pricing) return

    try {
      // 🔥 LAUNCH SPECIAL: Gamma is FREE for 500+ followers, $2.99 add-on for < 500
      const gammaIncludedFree = pricing.followerCount >= 500
      const gammaCharge = gammaIncludedFree ? 0 : 2.99
      const basePrice = pricing.price // Already $2.99 from API
      const total = basePrice + (addGamma && !gammaIncludedFree ? gammaCharge : 0)

      // Create Stripe checkout (for follower export)
      const res = await fetch('/api/export/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: pricing.username,
          amount: total,
          includeGamma: addGamma,
          gammaStyle: addGamma ? gammaStyle : undefined,
          customInstructions: addGamma ? customInstructions : undefined
        })
      })

      const data = await res.json()

      if (data.url) {
        // Redirect to Stripe checkout or success page
        window.location.href = data.url
      } else if (data.free) {
        // Free export - redirect to success page
        window.location.href = data.url
      } else {
        setError('Failed to create checkout session')
      }
    } catch (err: any) {
      setError('Payment error. Please try again.')
      console.error('Payment error:', err)
    }
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <LaunchTimer />
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

          <div className="space-y-4 max-w-xl">
            <div className="flex gap-4 items-center">
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

            {/* TODO: Add Cloudflare Turnstile when configured */}
          </div>

          {/* Real-time Status Display */}
          {checking && checkStatus && (
            <div className="mt-4 p-4 bg-gray-900/50 border border-gray-800 rounded">
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-300">{checkStatus.message || 'Processing...'}</span>
                <span className="text-gray-500 text-sm">{checkStatus.progress || 0}%</span>
              </div>
              <div className="w-full bg-gray-800 rounded-full h-2">
                <div 
                  className="bg-white h-2 rounded-full transition-all duration-300"
                  style={{ width: `${checkStatus.progress || 0}%` }}
                />
              </div>
              {checkStatus.followerCount && (
                <div className="mt-2 text-sm text-gray-500">
                  Found: {checkStatus.followerCount.toLocaleString()} followers
                </div>
              )}
            </div>
          )}

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
                  <div className="text-4xl font-light">Free</div>
                ) : isLaunchWeek() ? (
                  <div>
                    <div className="text-2xl font-light text-gray-500 line-through">${pricing.price}</div>
                    <div className="text-4xl font-light">${getLaunchDiscount(pricing.price)}</div>
                    <div className="text-sm text-gray-500 mt-1">Launch Week - 50% off</div>
                  </div>
                ) : (
                  <div className="text-4xl font-light">${pricing.price}</div>
                )}
                <div className="text-sm text-gray-500 mt-1">{pricing.tier}</div>
              </div>
            </div>

            <div className="border-t border-gray-900 pt-6 mb-6">
              <p className="text-gray-400">{pricing.message}</p>
              
              {/* 200K+ Manual Approval Warning */}
              {pricing.followerCount >= 200000 && (
                <div className="mt-4 p-4 bg-yellow-900/20 border border-yellow-900/50 rounded">
                  <p className="text-yellow-400 text-sm">
                    ⚠️ Accounts with 200K+ followers require manual verification before extraction. 
                    Contact us after payment for priority processing.
                  </p>
                </div>
              )}
            </div>

            {/* Gamma Report Add-on */}
            <div className="mb-6 p-4 border border-gray-800 rounded">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={addGamma}
                  onChange={(e) => setAddGamma(e.target.checked)}
                  className="mt-1"
                />
                <div className="flex-1">
                  {pricing.followerCount >= 500 ? (
                    <>
                      <div className="font-medium">Add Gamma Report (FREE) 🎉</div>
                      <p className="text-sm text-gray-500 mt-1">
                        AI presentation included free with 500+ followers! Clean, professional analysis.
                      </p>
                    </>
                  ) : (
                    <>
                      <div className="font-medium">🔥 Add Gamma Report (+$2.99)</div>
                      <p className="text-sm text-gray-500 mt-1">
                        Launch special! AI-powered presentation (normally $4.99).
                      </p>
                    </>
                  )}
                </div>
              </label>

              {addGamma && (
                <div className="mt-4 space-y-4 pl-7">
                  <div>
                    <label className="block text-sm text-gray-500 mb-2">Report Style</label>
                    <select
                      value={gammaStyle}
                      onChange={(e) => setGammaStyle(e.target.value)}
                      className="w-full px-4 py-2 bg-black border border-gray-800 rounded text-white focus:outline-none focus:border-white"
                    >
                      <option value="clean">Clean & Fast</option>
                      <option value="minimal">Minimal</option>
                      <option value="corporate">Corporate / Professional</option>
                      <option value="bold">Bold & Direct</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-500 mb-2">Custom Instructions (Optional)</label>
                    <textarea
                      value={customInstructions}
                      onChange={(e) => setCustomInstructions(e.target.value)}
                      placeholder="e.g., Focus on engagement quality and brand safety for partnership evaluation"
                      className="w-full px-4 py-2 bg-black border border-gray-800 rounded text-white placeholder-gray-600 focus:outline-none focus:border-white resize-none"
                      rows={3}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Payment Button */}
            {pricing.isFree ? (
              <button 
                onClick={handlePayment}
                className="w-full bg-white text-black py-4 rounded font-medium hover:bg-gray-200 transition-colors"
              >
                Export Now (Free{addGamma && ' + Gamma Report'})
              </button>
            ) : (
              <button 
                onClick={handlePayment}
                className="w-full bg-white text-black py-4 rounded font-medium hover:bg-gray-200 transition-colors"
              >
                {(() => {
                  const gammaIncludedFree = pricing.followerCount >= 500
                  const gammaCharge = gammaIncludedFree ? 0 : 2.99
                  const basePrice = pricing.price // Already $2.99 from API
                  const total = basePrice + (addGamma && !gammaIncludedFree ? gammaCharge : 0)
                  
                  if (addGamma && gammaIncludedFree) {
                    return `Pay $${basePrice} (Gamma FREE 🎉)`
                  } else if (addGamma && !gammaIncludedFree) {
                    return `Pay $${total.toFixed(2)} (Data + Gamma)`
                  } else {
                    return `Pay $${basePrice}`
                  }
                })()}
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
                {addGamma && (
                  <>
                    <div className="text-white">• Premium Gamma presentation</div>
                    <div className="text-white">• AI-generated visuals ({gammaStyle} style)</div>
                    <div className="text-white">• Shareable report link</div>
                  </>
                )}
              </div>
              
              {/* Disclaimer */}
              <div className="mt-4 p-3 bg-blue-900/20 border border-blue-700/30 rounded">
                <p className="text-xs text-blue-300">
                  <span className="font-semibold">ℹ️ Note:</span> Extracted count may differ from your total follower count due to private, protected, suspended, or deleted accounts that cannot be accessed via API.
                </p>
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

export default function ExportPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-xl text-gray-400">Loading...</div>
      </div>
    }>
      <ExportContent />
    </Suspense>
  )
}
