'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'

export default function DiagnosticPanel() {
  const { user } = useAuth()
  const [diagnostics, setDiagnostics] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [cleaningUp, setCleaningUp] = useState(false)

  const runDiagnostics = async () => {
    if (!user) return
    
    try {
      setLoading(true)
      const token = await user.getIdToken()
      
      // Check scan monitor
      const monitorResponse = await fetch('/api/scan/monitor', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      
      let monitorData = null
      if (monitorResponse.ok) {
        monitorData = await monitorResponse.json()
      }

      // Check OAuth status
      const oauthResponse = await fetch('/api/auth/oauth-status', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      
      let oauthData = null
      if (oauthResponse.ok) {
        oauthData = await oauthResponse.json()
      }

      setDiagnostics({
        timestamp: new Date().toISOString(),
        scanMonitor: monitorData,
        oauthStatus: oauthData,
        systemHealth: {
          hasStuckScans: monitorData?.activeScans?.length > 0,
          authRequired: monitorData?.summary?.authenticationRequiredScans > 0
        }
      })
      
    } catch (error) {
      console.error('Diagnostics failed:', error)
      setDiagnostics({
        error: error instanceof Error ? error.message : 'Diagnostics failed'
      })
    } finally {
      setLoading(false)
    }
  }

  const cleanupStuckScans = async () => {
    if (!user) return
    
    try {
      setCleaningUp(true)
      const token = await user.getIdToken()
      
      const response = await fetch('/api/scan/cleanup', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      })
      
      if (response.ok) {
        const result = await response.json()
        alert(`Cleanup completed: ${result.cleanedUp} scans cleaned up`)
        runDiagnostics() // Refresh diagnostics
      } else {
        const error = await response.json()
        alert(`Cleanup failed: ${error.error}`)
      }
      
    } catch (error) {
      console.error('Cleanup failed:', error)
      alert(`Cleanup failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setCleaningUp(false)
    }
  }

  useEffect(() => {
    if (user) {
      runDiagnostics()
    }
  }, [user])

  if (!user) return null

  return (
    <div className="bg-white rounded-lg shadow p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-gray-900">System Diagnostics</h3>
        <div className="space-x-2">
          <button
            onClick={runDiagnostics}
            disabled={loading}
            className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Checking...' : 'Refresh'}
          </button>
          <button
            onClick={cleanupStuckScans}
            disabled={cleaningUp}
            className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700 disabled:opacity-50"
          >
            {cleaningUp ? 'Cleaning...' : 'Cleanup Stuck Scans'}
          </button>
        </div>
      </div>

      {diagnostics && (
        <div className="space-y-4">
          {diagnostics.error ? (
            <div className="bg-red-50 border border-red-200 rounded p-3">
              <p className="text-red-800 text-sm">Error: {diagnostics.error}</p>
            </div>
          ) : (
            <>
              {/* Scan Status */}
              {diagnostics.scanMonitor && (
                <div className="bg-gray-50 rounded p-3">
                  <h4 className="font-medium text-gray-900 mb-2">Scan Activity</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Active:</span>
                      <span className="ml-2 font-medium">{diagnostics.scanMonitor.summary.activeScans}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Auth Required:</span>
                      <span className="ml-2 font-medium text-orange-600">{diagnostics.scanMonitor.summary.authenticationRequiredScans}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Completed:</span>
                      <span className="ml-2 font-medium text-green-600">{diagnostics.scanMonitor.summary.completedScans}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Total:</span>
                      <span className="ml-2 font-medium">{diagnostics.scanMonitor.summary.totalScans}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* OAuth Status */}
              {diagnostics.oauthStatus && (
                <div className="bg-gray-50 rounded p-3">
                  <h4 className="font-medium text-gray-900 mb-2">OAuth Status</h4>
                  <div className="text-sm">
                    <p>
                      <span className="text-gray-600">Has Tokens:</span>
                      <span className={`ml-2 font-medium ${diagnostics.oauthStatus.hasOAuthTokens ? 'text-green-600' : 'text-red-600'}`}>
                        {diagnostics.oauthStatus.hasOAuthTokens ? 'Yes' : 'No'}
                      </span>
                    </p>
                    <p>
                      <span className="text-gray-600">API Working:</span>
                      <span className={`ml-2 font-medium ${diagnostics.oauthStatus.apiAccessWorking ? 'text-green-600' : 'text-red-600'}`}>
                        {diagnostics.oauthStatus.apiAccessWorking ? 'Yes' : 'No'}
                      </span>
                    </p>
                    {diagnostics.oauthStatus.userInfo && (
                      <p>
                        <span className="text-gray-600">Account:</span>
                        <span className="ml-2 font-medium">@{diagnostics.oauthStatus.userInfo.screenName}</span>
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* System Health Warnings */}
              {diagnostics.systemHealth.hasStuckScans && (
                <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
                  <p className="text-yellow-800 text-sm">
                    ⚠️ You have active scans that may be stuck. Consider using the cleanup button if they've been running for more than an hour.
                  </p>
                </div>
              )}

              {diagnostics.systemHealth.authRequired && (
                <div className="bg-orange-50 border border-orange-200 rounded p-3">
                  <p className="text-orange-800 text-sm">
                    🍪 Some scans require session cookies to continue. Check the scan status above.
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}


