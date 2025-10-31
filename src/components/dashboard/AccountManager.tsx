'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'

interface TrackedAccount {
  username: string
  display_username: string
  last_extraction: string
  first_extraction: string
  total_followers: number
  total_extractions: number
}

export default function AccountManager() {
  const { user } = useAuth()
  const [myAccount, setMyAccount] = useState<TrackedAccount | null>(null)
  const [trackedAccounts, setTrackedAccounts] = useState<TrackedAccount[]>([])
  const [activeAccount, setActiveAccount] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [showSetAccount, setShowSetAccount] = useState(false)
  const [newAccountUsername, setNewAccountUsername] = useState('')

  useEffect(() => {
    if (user) {
      loadAccounts()
    }
  }, [user])

  async function loadAccounts() {
    try {
      const token = await user?.getIdToken()
      const response = await fetch('/api/tracked-accounts', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      
      if (response.ok) {
        const data = await response.json()
        setMyAccount(data.myAccount)
        setTrackedAccounts(data.trackedAccounts || [])
        setActiveAccount(data.activeAccount)
        
        // Show "set account" prompt if no account set
        if (!data.myAccount?.username) {
          setShowSetAccount(true)
        }
      }
    } catch (error) {
      console.error('Failed to load accounts:', error)
    } finally {
      setLoading(false)
    }
  }

  async function setMyAccountUsername() {
    if (!newAccountUsername.trim()) return

    try {
      const token = await user?.getIdToken()
      const response = await fetch('/api/user/set-my-account', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username: newAccountUsername })
      })
      
      if (response.ok) {
        setShowSetAccount(false)
        setNewAccountUsername('')
        loadAccounts()
      }
    } catch (error) {
      console.error('Failed to set account:', error)
    }
  }

  async function switchAccount(username: string) {
    try {
      const token = await user?.getIdToken()
      const response = await fetch('/api/tracked-accounts', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username })
      })
      
      if (response.ok) {
        window.location.reload()
      }
    } catch (error) {
      console.error('Failed to switch account:', error)
    }
  }

  async function removeAccount(username: string) {
    if (!confirm(`Remove @${username} and all its data? This cannot be undone.`)) {
      return
    }

    try {
      const token = await user?.getIdToken()
      const response = await fetch('/api/tracked-accounts', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username })
      })
      
      if (response.ok) {
        loadAccounts()
      }
    } catch (error) {
      console.error('Failed to remove account:', error)
    }
  }

  if (loading) {
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-800 rounded w-1/3 mb-4"></div>
          <div className="h-4 bg-gray-800 rounded w-1/2"></div>
        </div>
      </div>
    )
  }

  // Show "Set My Account" prompt
  if (showSetAccount || !myAccount?.username) {
    return (
      <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-6">
        <div className="mb-4">
          <h3 className="text-xl font-bold mb-2">👋 Welcome to Followlytics!</h3>
          <p className="text-sm text-gray-400">
            First, set your X account to start tracking your followers, unfollowers, and analytics.
          </p>
        </div>
        
        <div className="flex gap-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 bg-gray-900 border border-gray-700 rounded-lg px-4 py-3">
              <span className="text-gray-500">@</span>
              <input
                type="text"
                placeholder="YourUsername"
                value={newAccountUsername}
                onChange={(e) => setNewAccountUsername(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && setMyAccountUsername()}
                className="bg-transparent outline-none flex-1 text-white"
              />
            </div>
          </div>
          <button
            onClick={setMyAccountUsername}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition-colors"
          >
            Set My Account
          </button>
        </div>
        
        <div className="mt-4 text-xs text-gray-500">
          💡 This will be your primary account. You can track other accounts separately later.
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* My Account */}
      <div className="bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border border-blue-500/30 rounded-lg p-6">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <span className="text-2xl">📊</span>
            <div>
              <div className="text-xs text-blue-400 font-medium">MY ACCOUNT</div>
              <div className="text-xl font-bold">@{myAccount?.display_username || myAccount?.username}</div>
            </div>
          </div>
          
          {myAccount?.total_followers !== undefined && (
            <div className="text-right">
              <div className="text-2xl font-bold">{myAccount.total_followers.toLocaleString()}</div>
              <div className="text-xs text-gray-400">followers</div>
            </div>
          )}
        </div>

        {myAccount?.total_extractions && (
          <div className="flex items-center gap-4 text-sm text-gray-400">
            <div>
              <span className="text-white font-medium">{myAccount.total_extractions}</span> extractions
            </div>
            <div>
              Last: {new Date(myAccount.last_extraction).toLocaleDateString()}
            </div>
          </div>
        )}

        {activeAccount !== myAccount?.username && (
          <button
            onClick={() => switchAccount(myAccount?.username || '')}
            className="mt-3 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium transition-colors"
          >
            View My Analytics
          </button>
        )}

        {activeAccount === myAccount?.username && (
          <div className="mt-3 px-4 py-2 bg-blue-500/20 border border-blue-500/40 rounded-lg text-sm font-medium text-blue-400">
            ✓ Currently Viewing
          </div>
        )}
      </div>

      {/* Tracked Accounts */}
      {trackedAccounts.length > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-400 text-sm uppercase tracking-wide">
              Tracked Accounts ({trackedAccounts.length})
            </h3>
            <div className="text-xs text-gray-500">
              Competitors · Research · Monitoring
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {trackedAccounts.map((account) => (
              <div
                key={account.username}
                className={`
                  p-4 rounded-lg border transition-all
                  ${activeAccount === account.username
                    ? 'bg-purple-500/10 border-purple-500/40'
                    : 'bg-gray-800/50 border-gray-700 hover:border-gray-600'
                  }
                `}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">
                      {activeAccount === account.username ? '📊' : '👤'}
                    </span>
                    <div>
                      <div className="font-medium">@{account.display_username}</div>
                      <div className="text-xs text-gray-500">
                        {account.total_followers.toLocaleString()} followers
                      </div>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => removeAccount(account.username)}
                    className="text-gray-500 hover:text-red-400 transition-colors"
                    title="Remove this account"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <div className="flex gap-2">
                  {activeAccount === account.username ? (
                    <div className="flex-1 px-3 py-1.5 bg-purple-500/20 border border-purple-500/40 rounded text-xs font-medium text-purple-400 text-center">
                      ✓ Viewing
                    </div>
                  ) : (
                    <button
                      onClick={() => switchAccount(account.username)}
                      className="flex-1 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded text-xs font-medium transition-colors"
                    >
                      View
                    </button>
                  )}
                </div>

                <div className="mt-2 text-xs text-gray-500">
                  {account.total_extractions} extractions · Last {new Date(account.last_extraction).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Help Text */}
      <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <span className="text-xl">💡</span>
          <div className="text-sm text-gray-400">
            <p className="mb-2">
              <span className="font-medium text-white">Your Account:</span> Your primary X account with full analytics and unfollower tracking.
            </p>
            <p>
              <span className="font-medium text-white">Tracked Accounts:</span> Monitor competitors or accounts of interest. Each account's data is kept separate.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
