'use client'

import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'

export default function SetMainAccount({ currentMainAccount }: { currentMainAccount?: string }) {
  const { user } = useAuth()
  const [username, setUsername] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  const handleSetMainAccount = async () => {
    if (!username.trim()) {
      setMessage('❌ Please enter a username')
      return
    }

    setLoading(true)
    setMessage('')

    try {
      const token = await user?.getIdToken()
      const response = await fetch('/api/user/set-main-account', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          username: username.trim().replace('@', '') 
        })
      })

      if (response.ok) {
        setMessage('✅ Main account set successfully! Refreshing...')
        setTimeout(() => window.location.reload(), 1500)
      } else {
        const error = await response.json()
        setMessage(`❌ Failed: ${error.error || 'Unknown error'}`)
      }
    } catch (err) {
      console.error('Set main account error:', err)
      setMessage('❌ Failed to set main account')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-6 mb-6">
      <h3 className="text-lg font-bold text-white mb-2">
        🔒 Set Your Main Account
      </h3>
      <p className="text-sm text-gray-400 mb-4">
        {currentMainAccount 
          ? `Current main account: @${currentMainAccount}`
          : 'No main account set yet. This will be YOUR account that tracks unfollowers.'
        }
      </p>
      
      <div className="flex gap-3">
        <div className="flex-1">
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Enter your Twitter username (e.g., JoeProAI)"
            className="w-full px-4 py-2 bg-[#0f1419] border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
            disabled={loading}
          />
        </div>
        <button
          onClick={handleSetMainAccount}
          disabled={loading}
          className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 rounded-lg font-medium text-white transition-colors"
        >
          {loading ? 'Setting...' : 'Set Main Account'}
        </button>
      </div>

      {message && (
        <div className={`mt-3 text-sm ${
          message.startsWith('✅') ? 'text-green-400' : 'text-red-400'
        }`}>
          {message}
        </div>
      )}

      <div className="mt-4 text-xs text-gray-500">
        💡 <strong>Tip:</strong> Set this to your @JoeProAI account to track YOUR followers and mark others as competitors.
      </div>
    </div>
  )
}
