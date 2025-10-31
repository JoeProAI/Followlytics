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

interface AccountSwitcherProps {
  onAccountChange?: (username: string) => void
}

export default function AccountSwitcher({ onAccountChange }: AccountSwitcherProps) {
  const { user } = useAuth()
  const [accounts, setAccounts] = useState<TrackedAccount[]>([])
  const [activeAccount, setActiveAccount] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user) {
      loadTrackedAccounts()
    }
  }, [user])

  async function loadTrackedAccounts() {
    try {
      const token = await user?.getIdToken()
      const response = await fetch('/api/tracked-accounts', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      
      if (response.ok) {
        const data = await response.json()
        setAccounts(data.trackedAccounts || [])
        setActiveAccount(data.activeAccount)
      }
    } catch (error) {
      console.error('Failed to load tracked accounts:', error)
    } finally {
      setLoading(false)
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
        setActiveAccount(username)
        if (onAccountChange) {
          onAccountChange(username)
        }
        // Reload the page to refresh all data
        window.location.reload()
      }
    } catch (error) {
      console.error('Failed to switch account:', error)
    }
  }

  if (loading) {
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
        <div className="animate-pulse h-8 bg-gray-800 rounded w-48"></div>
      </div>
    )
  }

  if (accounts.length === 0) {
    return null // Don't show if no accounts tracked yet
  }

  if (accounts.length === 1) {
    // If only one account, show it as a badge (no switcher needed)
    const account = accounts[0]
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
        <div className="flex items-center gap-3">
          <div className="text-sm text-gray-400">Tracking:</div>
          <div className="flex items-center gap-2 bg-blue-500/10 border border-blue-500/30 rounded-lg px-3 py-2">
            <span className="text-lg">📊</span>
            <div>
              <div className="font-medium text-blue-400">@{account.display_username}</div>
              <div className="text-xs text-gray-500">
                {account.total_followers.toLocaleString()} followers · {account.total_extractions} extractions
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
      <div className="flex items-center gap-4 flex-wrap">
        <div className="text-sm text-gray-400 font-medium">Viewing:</div>
        
        <div className="flex gap-2 flex-wrap">
          {accounts.map((account) => (
            <button
              key={account.username}
              onClick={() => switchAccount(account.username)}
              className={`
                flex items-center gap-2 px-4 py-2 rounded-lg transition-all
                ${activeAccount === account.username
                  ? 'bg-blue-500/20 border-2 border-blue-500/50 text-blue-400'
                  : 'bg-gray-800 border border-gray-700 text-gray-400 hover:bg-gray-750 hover:text-white'
                }
              `}
            >
              <span className="text-base">
                {activeAccount === account.username ? '📊' : '👤'}
              </span>
              <div className="text-left">
                <div className="font-medium text-sm">
                  @{account.display_username}
                </div>
                <div className="text-xs opacity-75">
                  {account.total_followers.toLocaleString()} followers
                </div>
              </div>
            </button>
          ))}
        </div>

        <div className="text-xs text-gray-500 ml-auto">
          {accounts.length} account{accounts.length !== 1 ? 's' : ''} tracked
        </div>
      </div>

      {accounts.length > 1 && (
        <div className="mt-3 pt-3 border-t border-gray-800">
          <div className="text-xs text-gray-500">
            💡 <span className="font-medium">Tip:</span> Each account's followers, unfollowers, and analytics are tracked separately.
            Click an account above to view its data.
          </div>
        </div>
      )}
    </div>
  )
}
