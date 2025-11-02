'use client'

import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'

export default function DataCleanup() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<string>('')

  async function deleteAllData() {
    if (!user) return

    const confirmed = window.confirm(
      '⚠️ WARNING: This will DELETE ALL your follower data!\n\n' +
      'This includes:\n' +
      '- All followers\n' +
      '- Unfollower history\n' +
      '- Analytics data\n' +
      '- Usage stats\n\n' +
      'This action CANNOT be undone!\n\n' +
      'Are you sure you want to continue?'
    )

    if (!confirmed) return

    const doubleCheck = window.confirm(
      'Are you ABSOLUTELY SURE?\n\n' +
      'Type YES in the next prompt to confirm.'
    )

    if (!doubleCheck) return

    const finalConfirm = window.prompt('Type YES to confirm deletion:')
    if (finalConfirm !== 'YES') {
      alert('Deletion cancelled.')
      return
    }

    setLoading(true)
    setResult('')

    try {
      const token = await user.getIdToken()
      const response = await fetch('/api/followers/delete', {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      })

      const data = await response.json()

      if (response.ok) {
        setResult(`✅ Successfully deleted ${data.deleted} followers and all related data!`)
        
        // Reload page after 2 seconds
        setTimeout(() => {
          window.location.reload()
        }, 2000)
      } else {
        setResult(`❌ Error: ${data.error}`)
      }
    } catch (error: any) {
      setResult(`❌ Error: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-red-500/5 border border-red-500/20 rounded-lg p-6">
      <div className="mb-4">
        <h3 className="text-lg font-medium text-red-400 mb-2">🗑️ Delete All Data</h3>
        <p className="text-sm text-gray-400">
          Permanently delete all your follower data, analytics, and history. This action cannot be undone.
        </p>
      </div>

      {result && (
        <div className={`mb-4 p-3 rounded-lg text-sm ${
          result.startsWith('✅') 
            ? 'bg-green-500/10 border border-green-500/30 text-green-300' 
            : 'bg-red-500/10 border border-red-500/30 text-red-300'
        }`}>
          {result}
        </div>
      )}

      <button
        onClick={deleteAllData}
        disabled={loading}
        className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-700 text-white rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm"
      >
        {loading ? 'Deleting...' : '🗑️ Delete All Data'}
      </button>

      <p className="text-xs text-gray-500 mt-3">
        This will require multiple confirmations before deletion.
      </p>
    </div>
  )
}
