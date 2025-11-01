'use client'

import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'

export default function ScanDiagnostics() {
  const { user } = useAuth()
  const [diagnostics, setDiagnostics] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  async function runDiagnostics() {
    setLoading(true)
    try {
      const token = await user?.getIdToken()
      const response = await fetch('/api/debug/scan-status', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      
      if (response.ok) {
        const data = await response.json()
        setDiagnostics(data)
      } else {
        const error = await response.json()
        setDiagnostics({ error: error.error || 'Failed to load diagnostics' })
      }
    } catch (error) {
      console.error('Diagnostics error:', error)
      setDiagnostics({ error: 'Failed to run diagnostics' })
    } finally {
      setLoading(false)
    }
  }

  if (!diagnostics && !loading) {
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-medium mb-1">🔍 Scan Diagnostics</h3>
            <p className="text-sm text-gray-400">Check why unfollows aren't being detected</p>
          </div>
        </div>
        <button
          onClick={runDiagnostics}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm transition-colors"
        >
          Run Diagnostics
        </button>
      </div>
    )
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

  if (diagnostics?.error) {
    return (
      <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-6">
        <h3 className="text-lg font-medium mb-2 text-red-400">⚠️ Error</h3>
        <p className="text-sm text-gray-300">{diagnostics.error}</p>
        <button
          onClick={runDiagnostics}
          className="mt-4 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm transition-colors"
        >
          Retry
        </button>
      </div>
    )
  }

  const { summary, scanDiagnostics, troubleshooting, recentScans } = diagnostics

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-medium mb-1">🔍 Scan Diagnostics</h3>
            <p className="text-sm text-gray-400">Account: @{diagnostics.targetUsername}</p>
          </div>
          <button
            onClick={runDiagnostics}
            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm transition-colors"
          >
            Refresh
          </button>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-black/40 rounded-lg p-4">
            <div className="text-2xl font-bold text-green-400">{summary.totalFollowing}</div>
            <div className="text-xs text-gray-400 mt-1">Following in DB</div>
          </div>
          <div className="bg-black/40 rounded-lg p-4">
            <div className="text-2xl font-bold text-red-400">{summary.totalUnfollowed}</div>
            <div className="text-xs text-gray-400 mt-1">Unfollowed in DB</div>
          </div>
          <div className="bg-black/40 rounded-lg p-4">
            <div className="text-2xl font-bold text-blue-400">{summary.recentScans}</div>
            <div className="text-xs text-gray-400 mt-1">Recent Scans</div>
          </div>
          <div className="bg-black/40 rounded-lg p-4">
            <div className="text-2xl font-bold text-yellow-400">{summary.recentUnfollowEvents}</div>
            <div className="text-xs text-gray-400 mt-1">Recent Events</div>
          </div>
        </div>

        {/* Last Scan Analysis */}
        {scanDiagnostics && (
          <div className="bg-black/40 border border-gray-700 rounded-lg p-4">
            <h4 className="font-medium mb-3">Last Scan Analysis</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Status:</span>
                <span className={scanDiagnostics.status === 'completed' ? 'text-green-400' : 'text-yellow-400'}>
                  {scanDiagnostics.status}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Followers Extracted:</span>
                <span className="text-white">{scanDiagnostics.followersExtracted}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Total in Database:</span>
                <span className="text-white">{scanDiagnostics.totalFollowersInDb}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Extraction Coverage:</span>
                <span className={scanDiagnostics.coverageAbove80 ? 'text-green-400' : 'text-red-400'}>
                  {scanDiagnostics.extractionCoverage}
                  {scanDiagnostics.coverageAbove80 ? ' ✓' : ' ✗'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Unfollow Detection:</span>
                <span className={scanDiagnostics.unfollowDetectionEnabled ? 'text-green-400' : 'text-red-400'}>
                  {scanDiagnostics.unfollowDetectionEnabled ? 'ENABLED ✓' : 'DISABLED ✗'}
                </span>
              </div>
              {scanDiagnostics.completedAt && (
                <div className="flex justify-between">
                  <span className="text-gray-400">Completed:</span>
                  <span className="text-white">{new Date(scanDiagnostics.completedAt).toLocaleString()}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Troubleshooting */}
      {troubleshooting?.unfollowDetectionDisabled && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-6">
          <h3 className="text-lg font-medium mb-2 text-yellow-400">⚠️ Unfollow Detection Disabled</h3>
          <p className="text-sm text-gray-300 mb-3">{troubleshooting.reason}</p>
          <div className="bg-black/40 border border-yellow-500/20 rounded-lg p-4 mb-4">
            <h4 className="font-medium text-yellow-400 mb-2">💡 Solution</h4>
            <p className="text-sm text-gray-300">{troubleshooting.solution}</p>
          </div>
          <div className="text-sm text-gray-400">
            <p className="mb-2"><strong>Why this happens:</strong></p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Partial scans can cause false positives (marking active followers as unfollowers)</li>
              <li>System requires ≥80% coverage to safely detect unfollows</li>
              <li>Your last scan only captured {scanDiagnostics?.extractionCoverage} of known followers</li>
            </ul>
          </div>
        </div>
      )}

      {!troubleshooting?.unfollowDetectionDisabled && scanDiagnostics && (
        <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-6">
          <h3 className="text-lg font-medium mb-2 text-green-400">✓ Unfollow Detection Active</h3>
          <p className="text-sm text-gray-300">
            Your scans are properly detecting unfollows. If you're not seeing new unfollows, it may mean:
          </p>
          <ul className="text-sm text-gray-400 list-disc list-inside mt-2 space-y-1">
            <li>Your follower count hasn't actually changed (Twitter's count can fluctuate)</li>
            <li>The unfollows happened before your last scan</li>
            <li>You need to run a new scan to detect recent changes</li>
          </ul>
        </div>
      )}

      {/* Recent Scans Table */}
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
        <h3 className="text-lg font-medium mb-4">Recent Scans</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-gray-400 border-b border-gray-800">
              <tr>
                <th className="pb-2">Date</th>
                <th className="pb-2">Status</th>
                <th className="pb-2">Followers</th>
                <th className="pb-2">Coverage</th>
                <th className="pb-2">Detection</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {recentScans?.map((scan: any) => {
                const followersCount = scan.followersCount || scan.followers?.length || 0
                const coverage = summary.totalFollowing > 0 
                  ? ((followersCount / summary.totalFollowing) * 100).toFixed(1)
                  : '100.0'
                const detectionEnabled = parseFloat(coverage) >= 80
                
                return (
                  <tr key={scan.id} className="hover:bg-gray-800/50">
                    <td className="py-2">{new Date(scan.createdAt).toLocaleDateString()}</td>
                    <td className="py-2">
                      <span className={`px-2 py-1 rounded text-xs ${
                        scan.status === 'completed' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'
                      }`}>
                        {scan.status}
                      </span>
                    </td>
                    <td className="py-2">{followersCount}</td>
                    <td className="py-2">
                      <span className={detectionEnabled ? 'text-green-400' : 'text-red-400'}>
                        {coverage}%
                      </span>
                    </td>
                    <td className="py-2">
                      <span className={detectionEnabled ? 'text-green-400' : 'text-gray-500'}>
                        {detectionEnabled ? '✓ ON' : '✗ OFF'}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
