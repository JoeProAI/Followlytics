'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'

interface ScanProgress {
  scanId: string
  status: 'pending' | 'initializing' | 'setting_up' | 'scanning' | 'completed' | 'failed'
  progress: number
  followerCount?: number
  error?: string
}

export default function FollowerScanner() {
  const { user } = useAuth()
  const [isScanning, setIsScanning] = useState(false)
  const [scanProgress, setScanProgress] = useState<ScanProgress | null>(null)
  const [xUsername, setXUsername] = useState('')
  const [recentScans, setRecentScans] = useState<any[]>([])

  useEffect(() => {
    if (user) {
      fetchRecentScans()
    }
  }, [user])

  useEffect(() => {
    let interval: NodeJS.Timeout
    
    if (scanProgress && ['pending', 'initializing', 'setting_up', 'scanning'].includes(scanProgress.status)) {
      interval = setInterval(() => {
        checkScanProgress(scanProgress.scanId)
      }, 3000) // Check every 3 seconds
    }

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [scanProgress])

  const fetchRecentScans = async () => {
    try {
      const token = await user?.getIdToken()
      const response = await fetch('/api/scan/followers', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setRecentScans(data.scans || [])
      }
    } catch (error) {
      console.error('Failed to fetch recent scans:', error)
    }
  }

  const checkScanProgress = async (scanId: string) => {
    try {
      const token = await user?.getIdToken()
      const response = await fetch(`/api/scan/followers?scanId=${scanId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setScanProgress({
          scanId: data.id,
          status: data.status,
          progress: data.progress || 0,
          followerCount: data.followerCount,
          error: data.error,
        })

        if (['completed', 'failed'].includes(data.status)) {
          setIsScanning(false)
          fetchRecentScans() // Refresh the recent scans list
        }
      }
    } catch (error) {
      console.error('Failed to check scan progress:', error)
    }
  }

  const startFollowerScan = async () => {
    if (!xUsername.trim()) {
      alert('Please enter a Twitter username')
      return
    }

    setIsScanning(true)
    setScanProgress({
      scanId: '',
      status: 'pending',
      progress: 0,
    })

    try {
      const token = await user?.getIdToken()
      const response = await fetch('/api/scan/followers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ xUsername: xUsername.trim() }),
      })

      if (response.ok) {
        const data = await response.json()
        setScanProgress({
          scanId: data.scanId,
          status: data.status,
          progress: 0,
        })
      } else {
        const error = await response.json()
        throw new Error(error.error || 'Failed to start scan')
      }
    } catch (error) {
      console.error('Failed to start follower scan:', error)
      setIsScanning(false)
      setScanProgress(null)
      alert(`Failed to start scan: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const getStatusMessage = (status: string) => {
    switch (status) {
      case 'pending':
        return 'Initializing scan...'
      case 'initializing':
        return 'Creating secure sandbox environment...'
      case 'setting_up':
        return 'Installing browser automation tools...'
      case 'scanning':
        return 'Scanning Twitter followers...'
      case 'completed':
        return 'Scan completed successfully!'
      case 'failed':
        return 'Scan failed'
      default:
        return 'Unknown status'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-green-600'
      case 'failed':
        return 'text-red-600'
      default:
        return 'text-blue-600'
    }
  }

  return (
    <div className="space-y-6">
      {/* Scan Form */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
          X Follower Scanner
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-300 mb-6">
          Enter an X username to scan their followers and detect unfollowers
        </p>
        <div className="flex space-x-4">
          <div className="flex-1">
            <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-2">
              X Username
            </label>
            <input
              type="text"
              id="username"
              value={xUsername}
              onChange={(e) => setXUsername(e.target.value)}
              placeholder="Enter X username (without @)"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              disabled={isScanning}
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={startFollowerScan}
              disabled={isScanning}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isScanning ? 'Scanning...' : 'Start Scan'}
            </button>
          </div>
        </div>

        <div className="mt-4 text-sm text-gray-600">
          <p>🔒 <strong>Powered by Daytona:</strong> Your scan runs in a secure, isolated sandbox environment</p>
          <p>🤖 <strong>Browser Automation:</strong> Uses Playwright for reliable Twitter data extraction</p>
          <p>⚡ <strong>Auto-cleanup:</strong> Sandbox automatically deletes after completion</p>
        </div>
      </div>

      {/* Progress Display */}
      {scanProgress && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Scan Progress
          </h3>
          
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm font-medium text-gray-700 mb-2">
                <span className={getStatusColor(scanProgress.status)}>
                  {getStatusMessage(scanProgress.status)}
                </span>
                <span>{scanProgress.progress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all duration-300 ${
                    scanProgress.status === 'failed' ? 'bg-red-500' : 
                    scanProgress.status === 'completed' ? 'bg-green-500' : 'bg-blue-500'
                  }`}
                  style={{ width: `${scanProgress.progress}%` }}
                ></div>
              </div>
            </div>

            {scanProgress.status === 'completed' && scanProgress.followerCount && (
              <div className="bg-green-50 border border-green-200 rounded-md p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-green-800">
                      Scan Completed Successfully!
                    </h3>
                    <div className="mt-2 text-sm text-green-700">
                      <p>Found {scanProgress.followerCount} followers for @{xUsername}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {scanProgress.status === 'failed' && scanProgress.error && (
              <div className="bg-red-50 border border-red-200 rounded-md p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800">
                      Scan Failed
                    </h3>
                    <div className="mt-2 text-sm text-red-700">
                      <p>{scanProgress.error}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Recent Scans */}
      {recentScans.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Recent Scans
          </h3>
          
          <div className="overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Username
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Followers
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {recentScans.map((scan) => (
                  <tr key={scan.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      @{scan.twitterUsername}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        scan.status === 'completed' ? 'bg-green-100 text-green-800' :
                        scan.status === 'failed' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {scan.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {scan.followerCount || 0}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(scan.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
