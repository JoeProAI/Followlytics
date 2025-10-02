'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'

interface XAuthStatus {
  connected: boolean
  username?: string
  lastSync?: string
}

export default function XAuthConnect() {
  const { user } = useAuth()
  const [status, setStatus] = useState<XAuthStatus>({ connected: false })
  const [loading, setLoading] = useState(true)
  const [authorizing, setAuthorizing] = useState(false)

  useEffect(() => {
    checkAuthStatus()
  }, [user])

  const checkAuthStatus = async () => {
    if (!user) return
    
    try {
      const token = await user.getIdToken()
      const response = await fetch('/api/x-auth/status', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      
      if (response.ok) {
        const data = await response.json()
        setStatus(data)
      }
    } catch (error) {
      console.error('Failed to check X auth status:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleConnect = async () => {
    if (!user) return
    
    // For now, just store the existing tokens from env
    setAuthorizing(true)
    
    try {
      const token = await user.getIdToken()
      const response = await fetch('/api/x-auth/store-tokens', {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
      
      if (response.ok) {
        await checkAuthStatus()
        setAuthorizing(false)
      } else {
        const error = await response.json()
        console.error('Failed to store tokens:', error)
        setAuthorizing(false)
      }
    } catch (error) {
      console.error('Failed to connect X:', error)
      setAuthorizing(false)
    }
  }

  const handleDisconnect = async () => {
    if (!user || !confirm('Disconnect X account?')) return
    
    try {
      const token = await user.getIdToken()
      await fetch('/api/x-auth/disconnect', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      })
      
      setStatus({ connected: false })
    } catch (error) {
      console.error('Failed to disconnect X:', error)
    }
  }

  if (loading) {
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
        <div className="animate-pulse flex items-center gap-3">
          <div className="w-10 h-10 bg-gray-800 rounded-lg"></div>
          <div className="flex-1">
            <div className="h-4 bg-gray-800 rounded w-32 mb-2"></div>
            <div className="h-3 bg-gray-800 rounded w-48"></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          {/* X Logo */}
          <div className="w-12 h-12 bg-black border border-gray-700 rounded-lg flex items-center justify-center">
            <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
            </svg>
          </div>

          <div>
            <h3 className="text-lg font-medium mb-1 flex items-center gap-2">
              X (Twitter) Account
              {status.connected && (
                <span className="text-xs px-2 py-0.5 bg-green-500/10 text-green-400 border border-green-500/20 rounded-full">
                  Connected
                </span>
              )}
            </h3>
            
            {status.connected ? (
              <div className="text-sm space-y-1">
                <p className="text-gray-400">
                  Connected as <span className="text-white font-medium">@{status.username}</span>
                </p>
                {status.lastSync && (
                  <p className="text-gray-500 text-xs">
                    Last synced: {new Date(status.lastSync).toLocaleString()}
                  </p>
                )}
              </div>
            ) : (
              <p className="text-sm text-gray-400">
                Connect your X account to access follower data, competitor tracking, and AI insights
              </p>
            )}
          </div>
        </div>

        <div>
          {status.connected ? (
            <button
              onClick={handleDisconnect}
              className="text-sm px-4 py-2 border border-gray-700 text-gray-400 hover:text-white hover:border-gray-600 rounded-lg transition-colors"
            >
              Disconnect
            </button>
          ) : (
            <button
              onClick={handleConnect}
              disabled={authorizing}
              className="text-sm px-6 py-2 bg-white text-black hover:bg-gray-200 disabled:bg-gray-700 disabled:text-gray-500 rounded-lg transition-colors font-medium"
            >
              {authorizing ? 'Authorizing...' : 'Connect X Account'}
            </button>
          )}
        </div>
      </div>

      {/* Features enabled by X connection */}
      {!status.connected && (
        <div className="mt-4 pt-4 border-t border-gray-800">
          <p className="text-xs text-gray-500 mb-3">Features unlocked after connecting:</p>
          <div className="grid grid-cols-2 gap-2">
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <svg className="w-4 h-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Follower analytics
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <svg className="w-4 h-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Competitor tracking
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <svg className="w-4 h-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              AI content analysis
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <svg className="w-4 h-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Automated reports
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
