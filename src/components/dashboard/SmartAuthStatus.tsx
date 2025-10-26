'use client'

import { useState, useEffect } from 'react'

interface AuthStatus {
  isSignedInToX: boolean
  hasOAuthTokens: boolean
  authMethod: 'existing_session' | 'oauth_tokens' | 'none'
  username?: string
}

export default function SmartAuthStatus() {
  const [authStatus, setAuthStatus] = useState<AuthStatus | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    checkAuthStatus()
  }, [])

  const checkAuthStatus = async () => {
    try {
      setLoading(true)
      
      // Check if user has OAuth tokens
      const oauthResponse = await fetch('/api/auth/X/status')
      const oauthData = await oauthResponse.json()
      
      // Check if user is signed in to X in their browser
      const sessionResponse = await fetch('/api/auth/x-session-status')
      const sessionData = await sessionResponse.json()
      
      const status: AuthStatus = {
        isSignedInToX: sessionData.isSignedIn || false,
        hasOAuthTokens: oauthData.hasTokens || false,
        authMethod: sessionData.isSignedIn ? 'existing_session' : 
                   oauthData.hasTokens ? 'oauth_tokens' : 'none',
        username: sessionData.username || oauthData.username
      }
      
      setAuthStatus(status)
    } catch (error) {
      console.error('Failed to check auth status:', error)
      setAuthStatus({
        isSignedInToX: false,
        hasOAuthTokens: false,
        authMethod: 'none'
      })
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center space-x-2">
          <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
          <span className="text-blue-700">Checking authentication status...</span>
        </div>
      </div>
    )
  }

  if (!authStatus) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="text-red-700">❌ Failed to check authentication status</div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* Current Auth Status */}
      <div className={`border rounded-lg p-4 ${
        authStatus.authMethod === 'existing_session' ? 'bg-green-50 border-green-200' :
        authStatus.authMethod === 'oauth_tokens' ? 'bg-blue-50 border-blue-200' :
        'bg-yellow-50 border-yellow-200'
      }`}>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-gray-900">Authentication Status</h3>
            <div className="mt-1 space-y-1">
              {authStatus.authMethod === 'existing_session' && (
                <>
                  <div className="flex items-center space-x-2">
                    <span className="text-green-600">✅</span>
                    <span className="text-green-700">Signed in to X.com</span>
                  </div>
                  <div className="text-sm text-green-600">
                    🎉 <strong>Easiest method!</strong> Using your existing X session
                  </div>
                  {authStatus.username && (
                    <div className="text-sm text-green-600">
                      Authenticated as: <strong>@{authStatus.username}</strong>
                    </div>
                  )}
                </>
              )}
              
              {authStatus.authMethod === 'oauth_tokens' && (
                <>
                  <div className="flex items-center space-x-2">
                    <span className="text-blue-600">🔑</span>
                    <span className="text-blue-700">Using OAuth tokens</span>
                  </div>
                  <div className="text-sm text-blue-600">
                    You have authorized Followlytics to access your X account
                  </div>
                  {authStatus.username && (
                    <div className="text-sm text-blue-600">
                      Authorized as: <strong>@{authStatus.username}</strong>
                    </div>
                  )}
                </>
              )}
              
              {authStatus.authMethod === 'none' && (
                <>
                  <div className="flex items-center space-x-2">
                    <span className="text-yellow-600">⚠️</span>
                    <span className="text-yellow-700">No authentication found</span>
                  </div>
                  <div className="text-sm text-yellow-600">
                    You need to either sign in to X.com or authorize Followlytics
                  </div>
                </>
              )}
            </div>
          </div>
          
          <button
            onClick={checkAuthStatus}
            className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Smart Recommendations */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <h4 className="font-medium text-gray-900 mb-2">💡 Smart Authentication</h4>
        <div className="text-sm text-gray-600 space-y-2">
          {authStatus.authMethod === 'existing_session' ? (
            <div>
              <strong>Perfect!</strong> You're already signed in to X.com. 
              Scans will use your existing session - no additional setup needed.
            </div>
          ) : authStatus.authMethod === 'oauth_tokens' ? (
            <div>
              <strong>Good!</strong> You have OAuth tokens configured. 
              Scans will work, but signing in to X.com directly would be even easier.
            </div>
          ) : (
            <div className="space-y-2">
              <div><strong>Recommended:</strong> Sign in to X.com in this browser for the easiest experience.</div>
              <div><strong>Alternative:</strong> Click "Authorize X Access" below for OAuth authentication.</div>
            </div>
          )}
        </div>
      </div>

      {/* Authentication Actions */}
      {authStatus.authMethod === 'none' && (
        <div className="flex space-x-3">
          <a
            href="https://x.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-center transition-colors"
          >
            🚀 Sign in to X.com (Easiest)
          </a>
          <button
            onClick={() => window.location.href = '/api/auth/X'}
            className="flex-1 bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors"
          >
            🔑 OAuth Authorization
          </button>
        </div>
      )}
    </div>
  )
}


