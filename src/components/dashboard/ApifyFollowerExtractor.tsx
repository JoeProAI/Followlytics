'use client'

import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'

export default function ApifyFollowerExtractor() {
  const { user } = useAuth()
  const [username, setUsername] = useState('')
  const [maxFollowers, setMaxFollowers] = useState(1000)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<any>(null)

  async function extractFollowers() {
    if (!user || !username.trim()) return
    
    setLoading(true)
    setError('')
    setResult(null)
    
    try {
      const token = await user.getIdToken()
      
      const response = await fetch('/api/apify/extract-followers', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          username: username.replace('@', ''),
          maxFollowers
        })
      })
      
      const data = await response.json()
      
      if (response.ok) {
        setResult(data)
      } else {
        setError(data.error || 'Failed to extract followers')
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-black border border-gray-800 rounded-lg p-6">
      <div className="mb-6">
        <h2 className="text-xl font-medium mb-2">Extract Twitter Followers</h2>
        <p className="text-sm text-gray-400">
          Get comprehensive follower data including bios, metrics, and verified status
        </p>
      </div>

      {/* Input Section */}
      <div className="space-y-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Twitter Username
          </label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="elonmusk"
            className="w-full bg-black/40 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-purple-500"
            disabled={loading}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Max Followers to Extract
          </label>
          <select
            value={maxFollowers}
            onChange={(e) => setMaxFollowers(Number(e.target.value))}
            className="w-full bg-black/40 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-purple-500"
            disabled={loading}
          >
            <option value={100}>100 followers (~$0.02)</option>
            <option value={500}>500 followers (~$0.08)</option>
            <option value={1000}>1,000 followers (~$0.15)</option>
            <option value={5000}>5,000 followers (~$0.75)</option>
            <option value={10000}>10,000 followers (~$1.50)</option>
            <option value={50000}>50,000 followers (~$7.50)</option>
            <option value={100000}>100,000 followers (~$15.00)</option>
          </select>
          <p className="text-xs text-gray-500 mt-1">
            Cost: $0.15 per 1,000 followers extracted
          </p>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-4 bg-red-500/10 border border-red-500/30 text-red-300 px-4 py-3 rounded-lg text-sm">
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* Success Display */}
      {result && (
        <div className="mb-4 bg-green-500/10 border border-green-500/30 text-green-300 px-4 py-3 rounded-lg">
          <div className="font-semibold mb-2">✅ Extraction Complete!</div>
          <div className="text-sm space-y-1">
            <div>Followers extracted: <strong>{result.count.toLocaleString()}</strong></div>
            <div>Target account: <strong>@{result.username}</strong></div>
            <div>Cost: <strong>${result.cost}</strong></div>
            <div className="text-xs text-gray-400 mt-2">
              Data saved to your account. View in Analytics tab.
            </div>
          </div>
        </div>
      )}

      {/* Action Button */}
      <button
        onClick={extractFollowers}
        disabled={loading || !username.trim()}
        className="w-full px-6 py-3 bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 disabled:from-gray-700 disabled:to-gray-700 text-white rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            Extracting followers...
          </span>
        ) : (
          '🚀 Extract Followers'
        )}
      </button>

      {/* Info Box */}
      <div className="mt-6 bg-black/40 border border-gray-700 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <svg className="w-5 h-5 text-purple-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="text-xs text-gray-400 space-y-1">
            <p><strong className="text-gray-300">How it works:</strong> We use Apify's premium Twitter scraper to extract follower data directly from Twitter's website.</p>
            <p><strong className="text-gray-300">What you get:</strong> Username, name, bio, follower count, verification status, profile image, location, and more.</p>
            <p><strong className="text-gray-300">Processing time:</strong> ~30 seconds per 1,000 followers.</p>
            <p><strong className="text-gray-300">Rate limits:</strong> No Twitter API limits - scrapes directly from web.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
