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

  // Auto-refresh Twitter auth status after redirect
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    if (urlParams.get('twitter_success') === 'true' && user) {
      // Remove the query param
      window.history.replaceState({}, '', window.location.pathname)
      // Recheck auth status
      setTimeout(() => {
        checkTwitterAuth()
      }, 1000)
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
      console.error('Failed to check X auth:', err)
    } finally {
      setCheckingAuth(false)
    }
  }

  async function connectTwitter() {
    // If user is logged in, use POST endpoint to preserve session
    if (user) {
      try {
        const token = await user.getIdToken()
        const response = await fetch('/api/auth/twitter', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        })
        
        const data = await response.json()
        if (data.authUrl) {
          // Store tokens in sessionStorage to prevent account switching
          sessionStorage.setItem('oauth_token', data.oauth_token)
          sessionStorage.setItem('oauth_token_secret', data.oauth_token_secret)
          sessionStorage.setItem('linking_to_user', user.uid)
          window.location.href = data.authUrl
        }
      } catch (error) {
        console.error('Failed to initialize X OAuth:', error)
        // Fallback to GET method
        window.location.href = '/api/auth/twitter'
      }
    } else {
      // Not logged in - use GET method
      window.location.href = '/api/auth/twitter'
    }
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
        throw new Error('X not connected. Please authorize X access first.')
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
          Check verified status using browser automation. Sees badges exactly like you do on X!
        </p>
      </div>

      {/* Security Badge - Show logged in as user */}
      {twitterConnected && (
        <div className="mb-6 bg-gradient-to-r from-green-500/10 to-blue-500/10 border border-green-500/20 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-10 h-10 bg-green-500/20 rounded-full flex items-center justify-center">
              <svg className="w-5 h-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-medium text-green-300">🔐 Secure Verification</h3>
                <span className="text-xs px-2 py-0.5 bg-green-500/20 border border-green-500/30 rounded text-green-400">
                  YOUR ACCOUNT
                </span>
              </div>
              <p className="text-sm text-gray-400 mb-2">
                Browser automation logs in <strong className="text-white">as YOU</strong> to verify followers.
              </p>
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <span className="flex items-center gap-1">
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Uses your X OAuth
                </span>
                <span className="flex items-center gap-1">
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Sees what you see
                </span>
                <span className="flex items-center gap-1">
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                  </svg>
                  100% secure
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Twitter Auth Step */}
      {!twitterConnected && !checkingAuth && (
        <div className="mb-6 bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-yellow-400">⚠️</span>
            <h3 className="font-medium text-yellow-300">X Authorization Required</h3>
          </div>
          <p className="text-sm text-gray-400 mb-4">
            To check verified status, we need to view X profiles using your login (browser automation).
          </p>
          <div className="flex gap-2">
            <button
              onClick={connectTwitter}
              className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-all"
            >
              🔗 Authorize X Access
            </button>
            <button
              onClick={checkTwitterAuth}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-all text-sm"
            >
              🔄 Refresh
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            If you just authorized, click Refresh to update status
          </p>
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
          
          {/* Live Status During Check */}
          {checking && (
            <div className="mt-4 bg-black/40 border border-blue-500/30 rounded-lg p-4 animate-pulse">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-2 h-2 bg-blue-400 rounded-full animate-ping"></div>
                <span className="text-sm font-medium text-blue-300">🔒 Logged in as YOUR X account</span>
              </div>
              <div className="space-y-2 text-xs text-gray-400">
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-green-400 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Opening browser with your credentials...</span>
                </div>
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                    <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                  </svg>
                  <span>Visiting follower profiles as you...</span>
                </div>
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-purple-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span>Detecting verified badges...</span>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-gray-700">
                <p className="text-xs text-gray-500 text-center">
                  🛡️ Your X session is secure and temporary
                </p>
              </div>
            </div>
          )}
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
          <li>• Uses your X login to view profiles</li>
          <li>• Browser automation sees verified badges (just like you!)</li>
          <li>• Checks first 100 followers automatically</li>
          <li>• Updates Firestore with verified status</li>
          <li>• ~2 minutes for 100 followers</li>
        </ul>
      </div>
    </div>
  )
}
