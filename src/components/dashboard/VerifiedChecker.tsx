'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import XSpinner from '@/components/ui/XSpinner'

export default function VerifiedChecker() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState('')
  const [twitterConnected, setTwitterConnected] = useState(false)
  const [checkingAuth, setCheckingAuth] = useState(true)

  useEffect(() => {
    if (user) {
      checkTwitterAuth()
    }
  }, [user])

  async function checkTwitterAuth() {
    if (!user) return
    
    try {
      const token = await user.getIdToken()
      const response = await fetch('/api/auth/twitter/status', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      
      if (response.ok) {
        const data = await response.json()
        setTwitterConnected(data.connected)
      }
    } catch (err) {
      console.error('Failed to check Twitter auth:', err)
    } finally {
      setCheckingAuth(false)
    }
  }

  async function connectTwitter() {
    window.location.href = '/api/auth/twitter'
  }

  async function checkVerified() {
    if (!user) return

    setChecking(true)
    setError('')
    setResult(null)

    try {
      const token = await user.getIdToken()
      
      // Get followers to check
      const followersResponse = await fetch('/api/followers/stored', {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (!followersResponse.ok) {
        throw new Error('No followers found. Extract followers first.')
      }

      const followersData = await followersResponse.json()
      const usernames = followersData.followers
        ?.slice(0, 100) // Check first 100
        .map((f: any) => f.username)
        .filter(Boolean)

      if (!usernames || usernames.length === 0) {
        throw new Error('No followers found to check')
      }

      console.log(`[Verified Check] Checking ${usernames.length} followers...`)

      // Call Daytona verification endpoint
      const response = await fetch('/api/daytona/check-verified', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ usernames })
      })

      const data = await response.json()

      if (data.needsAuth) {
        setTwitterConnected(false)
        throw new Error('Please authorize Twitter access first')
      }

      if (response.ok) {
        setResult(data)
      } else {
        throw new Error(data.error || 'Verification failed')
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setChecking(false)
    }
  }

  if (checkingAuth) {
    return (
      <div className="bg-black border border-gray-800 rounded-lg p-6">
        <div className="flex items-center justify-center py-8">
          <XSpinner size="md" />
        </div>
      </div>
    )
  }

  return (
    <div className="bg-black border border-gray-800 rounded-lg p-6">
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <h2 className="text-xl font-medium">✓ Verified Status Checker</h2>
          <span className="text-xs px-2 py-1 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded">
            DAYTONA BROWSER
          </span>
        </div>
        <p className="text-sm text-gray-400">
          Check verified status using browser automation. Sees badges exactly like you do on Twitter/X!
        </p>
      </div>

      {/* Twitter Auth Step */}
      {!twitterConnected && (
        <div className="mb-6 bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-yellow-400">⚠️</span>
            <h3 className="font-medium text-yellow-300">Twitter Authorization Required</h3>
          </div>
          <p className="text-sm text-gray-400 mb-4">
            To check verified status, we need to view Twitter profiles using your login (browser automation).
          </p>
          <button
            onClick={connectTwitter}
            className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-all"
          >
            🔗 Authorize Twitter Access
          </button>
        </div>
      )}

      {/* Check Button */}
      {twitterConnected && !result && (
        <div className="mb-6">
          <button
            onClick={checkVerified}
            disabled={checking}
            className="w-full px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 disabled:from-gray-700 disabled:to-gray-700 text-white rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {checking ? (
              <span className="flex items-center justify-center gap-2">
                <XSpinner size="md" />
                Checking verified status via browser...
              </span>
            ) : (
              '✓ Check First 100 Followers for Verified Badges'
            )}
          </button>
          <p className="text-xs text-gray-500 mt-2 text-center">
            Takes ~2-3 minutes • Uses Daytona browser automation
          </p>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="mb-4 bg-red-500/10 border border-red-500/30 text-red-300 px-4 py-3 rounded-lg text-sm">
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-green-300">✅ Verification Complete</h3>
            <span className="text-xs px-2 py-1 bg-green-500/20 rounded text-green-400">
              UPDATED
            </span>
          </div>
          
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="bg-black/40 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-white">{result.checked}</div>
              <div className="text-xs text-gray-400">Checked</div>
            </div>
            <div className="bg-black/40 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-blue-400">{result.verified}</div>
              <div className="text-xs text-gray-400">Verified</div>
            </div>
          </div>

          <p className="text-xs text-gray-400 text-center mb-3">
            Verified badges now visible in your follower list!
          </p>

          <button
            onClick={() => window.location.reload()}
            className="w-full px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm transition-all"
          >
            🔄 Refresh Dashboard
          </button>
        </div>
      )}

      {/* How it Works */}
      <div className="mt-6 bg-black/40 border border-gray-700 rounded-lg p-4">
        <h4 className="text-sm font-medium text-gray-300 mb-2">How It Works:</h4>
        <ul className="text-xs text-gray-400 space-y-1">
          <li>• Uses your Twitter login to view profiles</li>
          <li>• Browser automation sees verified badges (just like you!)</li>
          <li>• Checks first 100 followers automatically</li>
          <li>• Updates Firestore with verified status</li>
          <li>• ~2 minutes for 100 followers</li>
        </ul>
      </div>
    </div>
  )
}
