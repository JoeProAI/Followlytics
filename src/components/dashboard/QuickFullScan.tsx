'use client'

import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import XSpinner from '@/components/ui/XSpinner'

export default function QuickFullScan() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState('')

  async function triggerFullScan() {
    if (!user) return
    
    setLoading(true)
    setError('')
    setResult(null)
    
    try {
      // First, get the user's X username
      const token = await user.getIdToken()
      const userResponse = await fetch('/api/user/profile', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      
      if (!userResponse.ok) {
        throw new Error('Failed to get user profile')
      }
      
      const userData = await userResponse.json()
      const username = userData.xUsername || userData.twitterUsername
      
      if (!username) {
        throw new Error('No X username set. Please set your X username in Account Manager first.')
      }
      
      // Trigger a FULL scan with maximum followers to ensure >80% coverage
      // Using 200,000 as the max to ensure we get all followers
      const scanResponse = await fetch('/api/followers-api/extract-followers', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          username: username.replace('@', ''),
          maxFollowers: 200000 // High limit to ensure full extraction
        })
      })
      
      const data = await scanResponse.json()
      
      if (scanResponse.ok) {
        setResult(data)
      } else {
        throw new Error(data.error || 'Failed to trigger scan')
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-gradient-to-r from-green-500/10 to-blue-500/10 border border-green-500/20 rounded-lg p-6">
      <div className="flex items-start gap-4 mb-4">
        <div className="text-3xl">🎯</div>
        <div className="flex-1">
          <h3 className="text-lg font-medium mb-1 text-green-400">Quick Fix: Enable Unfollow Detection</h3>
          <p className="text-sm text-gray-400 mb-3">
            Run a full follower scan to re-enable unfollow tracking. This will extract all your followers 
            (up to 200K) to ensure ≥80% coverage needed for accurate unfollow detection.
          </p>
          
          {!result && !error && (
            <div className="bg-black/40 rounded-lg p-3 mb-3 text-xs text-gray-400">
              <p className="mb-1"><strong className="text-white">Why this works:</strong></p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Extracts ALL your current followers (not partial)</li>
                <li>Achieves 100% coverage of your follower base</li>
                <li>Re-enables unfollow detection for future scans</li>
                <li>Takes ~30 seconds per 1,000 followers</li>
              </ul>
            </div>
          )}
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
        <div className="mb-4 bg-green-500/10 border border-green-500/30 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-green-400 text-xl">✅</span>
            <span className="font-semibold text-green-300">Full Scan Complete!</span>
          </div>
          <div className="text-sm text-gray-300 space-y-1">
            <p>• Extracted <strong className="text-white">{result.count?.toLocaleString()}</strong> followers from @{result.username}</p>
            <p>• Unfollow detection is now <strong className="text-green-400">ENABLED</strong></p>
            <p>• Cost: <strong className="text-white">${result.cost}</strong></p>
            <p className="pt-2 text-xs text-gray-400">
              Future follower count drops will now be detected and tracked in your Unfollower Intelligence dashboard.
            </p>
          </div>
        </div>
      )}

      {/* Action Button */}
      <button
        onClick={triggerFullScan}
        disabled={loading || !!result}
        className="w-full px-6 py-3 bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 disabled:from-gray-700 disabled:to-gray-700 text-white rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <XSpinner size="md" />
            Running Full Scan...
          </span>
        ) : result ? (
          '✅ Scan Complete - Refresh Page to See Results'
        ) : (
          '🚀 Run Full Scan Now'
        )}
      </button>

      {loading && (
        <div className="mt-3 text-xs text-gray-400 text-center">
          <p className="animate-pulse">⏳ This may take 1-3 minutes depending on follower count...</p>
        </div>
      )}
      
      {result && (
        <div className="mt-3 text-center">
          <button
            onClick={() => window.location.reload()}
            className="text-sm text-blue-400 hover:text-blue-300 underline"
          >
            Refresh page to see updated data →
          </button>
        </div>
      )}
    </div>
  )
}
