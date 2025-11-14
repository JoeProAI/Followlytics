'use client'

import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { loadStripe } from '@stripe/stripe-js'

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

interface ExportData {
  cached: boolean
  followerCount: number
  price: number
  tier?: string
  message: string
  cachedAt?: string
}

export default function FollowerExportCard() {
  const { user } = useAuth()
  const [username, setUsername] = useState('')
  const [checking, setChecking] = useState(false)
  const [extracting, setExtracting] = useState(false)
  const [exportData, setExportData] = useState<ExportData | null>(null)
  const [exportId, setExportId] = useState('')
  const [error, setError] = useState('')
  const [completed, setCompleted] = useState(false)

  const checkPricing = async () => {
    if (!username.trim()) {
      setError('Please enter a username')
      return
    }

    setChecking(true)
    setError('')
    setExportData(null)
    setCompleted(false)

    try {
      const token = await user?.getIdToken()
      
      const response = await fetch('/api/export/followers', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          username: username.replace('@', ''),
          action: 'check'
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.details || errorData.error)
      }

      const data = await response.json()
      setExportData(data)

    } catch (err: any) {
      setError(err.message || 'Failed to check pricing')
    } finally {
      setChecking(false)
    }
  }

  const handlePayment = async () => {
    if (!exportData || exportData.cached) {
      // If cached, proceed directly to extraction
      startExtraction(null)
      return
    }

    try {
      setExtracting(true)

      // Create payment intent
      const token = await user?.getIdToken()
      const response = await fetch('/api/payments/create-intent', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          amount: exportData.price,
          description: `Follower export for @${username}`,
          metadata: {
            username: username.replace('@', ''),
            service: 'follower_export'
          }
        })
      })

      if (!response.ok) throw new Error('Payment failed')

      const { clientSecret, paymentIntentId } = await response.json()

      // Process payment with Stripe
      const stripe = await stripePromise
      if (!stripe) throw new Error('Stripe not loaded')

      const { error: stripeError } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: {
            // You'll need to add Stripe Elements here for real implementation
            // For now, this is a placeholder
          }
        }
      })

      if (stripeError) throw new Error(stripeError.message)

      // Payment successful - start extraction
      await startExtraction(paymentIntentId)

    } catch (err: any) {
      setError(err.message || 'Payment failed')
      setExtracting(false)
    }
  }

  const startExtraction = async (paymentIntentId: string | null) => {
    try {
      const token = await user?.getIdToken()
      
      const response = await fetch('/api/export/followers', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          username: username.replace('@', ''),
          action: 'extract',
          paymentIntentId
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.details || errorData.error)
      }

      const { exportId: newExportId } = await response.json()
      setExportId(newExportId)

      // Poll for completion
      pollExportStatus(newExportId)

    } catch (err: any) {
      setError(err.message || 'Extraction failed')
      setExtracting(false)
    }
  }

  const pollExportStatus = async (id: string) => {
    const token = await user?.getIdToken()
    
    const interval = setInterval(async () => {
      try {
        const response = await fetch(`/api/export/followers?exportId=${id}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })

        if (!response.ok) {
          clearInterval(interval)
          setError('Failed to check status')
          setExtracting(false)
          return
        }

        const statusData = await response.json()

        if (statusData.status === 'completed') {
          clearInterval(interval)
          setCompleted(true)
          setExtracting(false)
        } else if (statusData.status === 'failed') {
          clearInterval(interval)
          setError(statusData.error || 'Extraction failed')
          setExtracting(false)
        }
      } catch (err) {
        clearInterval(interval)
        setError('Status check failed')
        setExtracting(false)
      }
    }, 3000)
  }

  const downloadExport = async (format: string) => {
    const cleanUsername = username.replace('@', '')
    
    try {
      const res = await fetch('/api/export/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          sessionId: 'manual-test', // Dashboard downloads use test session
          username: cleanUsername,
          format
        })
      })

      if (!res.ok) {
        throw new Error('Download failed')
      }

      // Get the blob and trigger download
      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${cleanUsername}_followers.${format === 'xlsx' ? 'xlsx' : format}`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (err) {
      setError('Download failed. Please try again.')
    }
  }

  return (
    <div className="bg-[#16181c] border border-gray-800 rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-bold text-white">Export Followers</h3>
          <p className="text-sm text-gray-400">Download complete follower lists</p>
        </div>
        <span className="text-2xl">📥</span>
      </div>

      <div className="space-y-4">
        {/* Username Input */}
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-2">
            Username to export
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="@elonmusk"
              className="flex-1 px-4 py-2 bg-[#0f1419] border border-gray-700 rounded-lg text-white placeholder-gray-600 focus:outline-none focus:border-purple-500"
              disabled={checking || extracting}
            />
            <button
              onClick={checkPricing}
              disabled={checking || extracting}
              className="px-6 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors"
            >
              {checking ? 'Checking...' : 'Check Price'}
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/50 rounded-lg">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        {/* Pricing Info */}
        {exportData && !completed && (
          <div className={`p-4 rounded-lg border ${exportData.cached ? 'bg-green-500/10 border-green-500/50' : 'bg-blue-500/10 border-blue-500/50'}`}>
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className={`font-semibold ${exportData.cached ? 'text-green-400' : 'text-blue-400'}`}>
                  {exportData.cached ? '🎉 FREE Export Available!' : '💰 Pricing'}
                </p>
                <p className="text-sm text-gray-300 mt-1">{exportData.message}</p>
              </div>
              {!exportData.cached && (
                <p className="text-2xl font-bold text-white">${exportData.price.toFixed(2)}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm mb-4">
              <div>
                <span className="text-gray-500">Followers:</span>
                <span className="ml-2 font-semibold text-white">{exportData.followerCount.toLocaleString()}</span>
              </div>
              {exportData.tier && (
                <div>
                  <span className="text-gray-500">Tier:</span>
                  <span className="ml-2 font-semibold text-white">{exportData.tier}</span>
                </div>
              )}
            </div>

            <button
              onClick={handlePayment}
              disabled={extracting}
              className={`w-full px-4 py-3 ${exportData.cached ? 'bg-green-600 hover:bg-green-700' : 'bg-blue-600 hover:bg-blue-700'} disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors`}
            >
              {extracting ? '⏳ Extracting...' : exportData.cached ? '📥 Export Now (FREE)' : `💳 Pay $${exportData.price.toFixed(2)} & Export`}
            </button>
          </div>
        )}

        {/* Extracting Progress */}
        {extracting && (
          <div className="p-4 bg-yellow-500/10 border border-yellow-500/50 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="animate-spin rounded-full h-6 w-6 border-4 border-gray-700 border-t-yellow-600"></div>
              <div>
                <p className="font-semibold text-yellow-400">Extracting Followers...</p>
                <p className="text-sm text-gray-400">This may take 2-5 minutes</p>
              </div>
            </div>
          </div>
        )}

        {/* Export Complete */}
        {completed && (
          <div className="p-4 bg-green-500/10 border border-green-500/50 rounded-lg">
            <p className="font-semibold text-green-400 mb-3">✅ Export Complete!</p>
            <p className="text-sm text-gray-300 mb-4">Download in your preferred format:</p>
            
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => downloadExport('csv')}
                className="px-4 py-2 bg-[#0f1419] hover:bg-gray-800 text-white rounded-lg transition-colors text-sm"
              >
                📊 CSV
              </button>
              <button
                onClick={() => downloadExport('json')}
                className="px-4 py-2 bg-[#0f1419] hover:bg-gray-800 text-white rounded-lg transition-colors text-sm"
              >
                📄 JSON
              </button>
              <button
                onClick={() => downloadExport('xlsx')}
                className="px-4 py-2 bg-[#0f1419] hover:bg-gray-800 text-white rounded-lg transition-colors text-sm"
              >
                📈 Excel
              </button>
              <button
                onClick={() => downloadExport('md')}
                className="px-4 py-2 bg-[#0f1419] hover:bg-gray-800 text-white rounded-lg transition-colors text-sm"
              >
                📝 Markdown
              </button>
              <button
                onClick={() => downloadExport('txt')}
                className="px-4 py-2 bg-[#0f1419] hover:bg-gray-800 text-white rounded-lg transition-colors text-sm"
              >
                📃 Text
              </button>
            </div>
          </div>
        )}

        {/* Pricing Info */}
        <div className="pt-4 border-t border-gray-800">
          <p className="text-xs font-semibold text-gray-400 mb-2">💰 Pricing Tiers:</p>
          <div className="space-y-1 text-xs text-gray-500">
            <p>• Up to 500 followers: $1</p>
            <p>• 500-1,000: $3</p>
            <p>• 1,000-2,000: $5</p>
            <p>• 2,000-5,000: $10</p>
            <p>• 5,000+: $20-$200</p>
          </div>
          <p className="text-xs text-green-400 mt-2">✨ Export again within 7 days = FREE!</p>
        </div>
      </div>
    </div>
  )
}
