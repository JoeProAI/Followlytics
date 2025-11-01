'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'

export default function VerifiedCounter() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<any>(null)

  useEffect(() => {
    if (!user) {
      setLoading(false)
      return
    }
    
    async function fetchVerifiedCount() {
      try {
        if (!user) return
        const token = await user.getIdToken()
        const response = await fetch('/api/analytics/verified-count', {
          headers: { 'Authorization': `Bearer ${token}` }
        })
        
        if (response.ok) {
          const result = await response.json()
          setData(result)
        }
      } catch (error) {
        console.error('Failed to fetch verified count:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchVerifiedCount()
  }, [user])

  if (loading) {
    return (
      <div className="bg-black border border-gray-800 rounded-lg p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-800 rounded w-1/3 mb-4"></div>
          <div className="h-8 bg-gray-800 rounded w-1/2"></div>
        </div>
      </div>
    )
  }

  if (!data) return null

  return (
    <div className="bg-black border border-gray-800 rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium">✓ Verified Followers</h3>
        {data.has_verified_data && (
          <span className="text-xs px-2 py-1 bg-green-500/10 text-green-400 border border-green-500/20 rounded">
            DATA AVAILABLE
          </span>
        )}
      </div>

      {data.has_verified_data ? (
        <div className="space-y-4">
          {/* Main Count */}
          <div className="flex items-baseline gap-3">
            <div className="text-4xl font-bold text-blue-400">
              {data.verified_count}
            </div>
            <div className="text-gray-400">
              / {data.total_followers} followers
            </div>
          </div>

          {/* Percentage */}
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-gray-400">Verified Percentage</span>
              <span className="text-white font-medium">{data.verified_percent}%</span>
            </div>
            <div className="w-full bg-gray-800 rounded-full h-2">
              <div 
                className="bg-blue-500 h-2 rounded-full transition-all" 
                style={{ width: `${data.verified_percent}%` }}
              ></div>
            </div>
          </div>

          {/* Breakdown */}
          <div className="grid grid-cols-2 gap-3 pt-3 border-t border-gray-800">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-400">{data.verified_count}</div>
              <div className="text-xs text-gray-500">Verified</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-400">{data.total_followers - data.verified_count}</div>
              <div className="text-xs text-gray-500">Not Verified</div>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-8">
          <div className="text-4xl mb-3">❓</div>
          <p className="text-gray-400 text-sm mb-4">{data.message}</p>
          <p className="text-xs text-gray-500">
            Enrichment adds verified badges to your followers.
          </p>
        </div>
      )}
    </div>
  )
}
