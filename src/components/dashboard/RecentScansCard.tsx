'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'

interface BotScan {
  scanId: string
  username: string
  status: string
  createdAt: string
  analysis?: {
    botPercentage: number
    riskScore: number
    totalFollowers: number
  }
  gammaUrl?: string
}

export default function RecentScansCard() {
  const { user } = useAuth()
  const [scans, setScans] = useState<BotScan[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return

    fetchRecentScans()
  }, [user])

  const fetchRecentScans = async () => {
    try {
      const token = await user?.getIdToken()
      const response = await fetch('/api/bot-analysis/history', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setScans(data.scans || [])
      }
    } catch (err) {
      console.error('Failed to fetch scans:', err)
    } finally {
      setLoading(false)
    }
  }

  const getRiskColor = (score: number) => {
    if (score >= 70) return 'text-red-500'
    if (score >= 40) return 'text-yellow-500'
    return 'text-green-500'
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded">✓ Complete</span>
      case 'analyzing':
        return <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 text-xs rounded">⏳ Analyzing</span>
      case 'failed':
        return <span className="px-2 py-1 bg-red-500/20 text-red-400 text-xs rounded">✗ Failed</span>
      default:
        return <span className="px-2 py-1 bg-gray-500/20 text-gray-400 text-xs rounded">{status}</span>
    }
  }

  return (
    <div className="bg-[#16181c] border border-gray-800 rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-white">Recent Analyses</h3>
        <button
          onClick={fetchRecentScans}
          className="text-sm text-gray-400 hover:text-white transition-colors"
        >
          ↻ Refresh
        </button>
      </div>

      {loading ? (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-gray-700 border-t-purple-600"></div>
        </div>
      ) : scans.length === 0 ? (
        <div className="text-center py-8">
          <span className="text-4xl mb-2 block">🔍</span>
          <p className="text-gray-400 text-sm">No analyses yet</p>
          <p className="text-gray-500 text-xs mt-1">Start by analyzing an account</p>
        </div>
      ) : (
        <div className="space-y-3">
          {scans.slice(0, 10).map((scan) => (
            <div
              key={scan.scanId}
              className="bg-[#0f1419] border border-gray-800 rounded-lg p-4 hover:border-gray-700 transition-colors"
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-white">@{scan.username}</span>
                    {getStatusBadge(scan.status)}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {new Date(scan.createdAt).toLocaleDateString()} at{' '}
                    {new Date(scan.createdAt).toLocaleTimeString()}
                  </p>
                </div>
              </div>

              {scan.analysis && (
                <div className="mt-3 pt-3 border-t border-gray-800">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-gray-500">Bots:</span>
                      <span className="ml-2 font-semibold text-red-400">
                        {scan.analysis.botPercentage}%
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500">Risk:</span>
                      <span className={`ml-2 font-semibold ${getRiskColor(scan.analysis.riskScore)}`}>
                        {scan.analysis.riskScore}/100
                      </span>
                    </div>
                  </div>
                  
                  {scan.gammaUrl && (
                    <a
                      href={scan.gammaUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-3 block w-full text-center px-3 py-2 bg-purple-600/20 hover:bg-purple-600/30 text-purple-400 text-xs font-medium rounded transition-colors"
                    >
                      🎨 View Gamma Report →
                    </a>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {scans.length > 10 && (
        <div className="mt-4 text-center">
          <button className="text-sm text-gray-400 hover:text-white transition-colors">
            View all {scans.length} analyses →
          </button>
        </div>
      )}
    </div>
  )
}
