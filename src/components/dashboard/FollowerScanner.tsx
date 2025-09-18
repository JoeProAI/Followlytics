'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import SessionCookieHelper from './SessionCookieHelper'

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
  const [xAuthorized, setXAuthorized] = useState(false)
  const [checkingAuth, setCheckingAuth] = useState(true)
  const [showSessionCookieHelper, setShowSessionCookieHelper] = useState(false)
  const [sessionCookies, setSessionCookies] = useState<any>(null)

  useEffect(() => {
    if (user) {
      fetchRecentScans()
      checkXAuthorization()
    }
  }, [user])

  const checkXAuthorization = async () => {
    try {
      const token = await user?.getIdToken()
      const response = await fetch('/api/auth/twitter/status', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setXAuthorized(data.authorized || false)
      }
    } catch (error) {
      console.error('Failed to check X authorization:', error)
      setXAuthorized(false)
    } finally {
      setCheckingAuth(false)
    }
  }

  const handleXAuthorization = () => {
    window.location.href = '/api/auth/twitter'
  }

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

  const startFollowerScan = async (useSessionCookies = false) => {
    if (!xUsername.trim()) {
      alert('Please enter an X username')
      return
    }

    // If user wants to use session cookies but hasn't provided them, show helper
    if (useSessionCookies && !sessionCookies) {
      setShowSessionCookieHelper(true)
      return
    }

    setIsScanning(true)
    setShowSessionCookieHelper(false)
    setScanProgress({
      scanId: '',
      status: 'pending',
      progress: 0,
    })

    try {
      const token = await user?.getIdToken()
      const response = await fetch('/api/scan/hybrid', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ 
          xUsername: xUsername.trim(),
          sessionCookies: useSessionCookies ? sessionCookies : null
        }),
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

  const handleSessionCookiesProvided = (cookies: any) => {
    setSessionCookies(cookies)
    setShowSessionCookieHelper(false)
    startFollowerScan(true)
  }

  const handleSkipSessionCookies = () => {
    setShowSessionCookieHelper(false)
    startFollowerScan(false)
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
        return 'Scanning X followers...'
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

  if (checkingAuth) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Checking X authorization status...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* X Authorization Step */}
      {!xAuthorized ? (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-center">
            <div className="w-12 h-12 bg-black rounded-full flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
              </svg>
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              Step 1: Authorize X Access
            </h2>
            <p className="text-gray-600 mb-4 max-w-md mx-auto">
              To scan followers, you need to authorize Followlytics to access X on your behalf. This creates a secure sandbox environment for automated scanning.
            </p>
            <button
              onClick={handleXAuthorization}
              className="bg-black hover:bg-gray-800 text-white px-6 py-2 rounded-lg font-medium flex items-center justify-center gap-2 mx-auto transition-colors"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
              </svg>
              Authorize X Access
            </button>
            <p className="text-sm text-gray-500 mt-4">
              You&apos;ll be redirected to X to grant permission, then return here to start scanning.
            </p>
          </div>
        </div>
      ) : (
        <>
          {/* Authorization Success */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-green-500 mr-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span className="text-green-800 font-medium">✓ X Access Authorized</span>
            </div>
          </div>

          {/* Scan Form */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">
              Step 2: Start Follower Scan
            </h2>
            <p className="text-sm text-gray-600 mb-6">
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
                  onClick={() => startFollowerScan()}
                  disabled={isScanning}
                  className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isScanning ? 'Scanning...' : 'Start Scan'}
                </button>
              </div>
            </div>

            <div className="mt-4 text-sm text-gray-600">
              <p>🔒 <strong>Powered by Daytona:</strong> Your scan runs in a secure, isolated sandbox environment</p>
              <p>🤖 <strong>Browser Automation:</strong> Uses Playwright for reliable X data extraction</p>
              <p>⚡ <strong>Auto-cleanup:</strong> Sandbox automatically deletes after completion</p>
            </div>
          </div>
        </>
      )}

      {/* Session Cookie Helper */}
      {showSessionCookieHelper && (
        <SessionCookieHelper
          onCookiesProvided={handleSessionCookiesProvided}
          onSkip={handleSkipSessionCookies}
        />
      )}

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
                      @{scan.xUsername || scan.twitterUsername}
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
