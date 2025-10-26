'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import SessionCookieHelper from './SessionCookieHelper'
import { generateScanResultOG, generateScanProgressOG, shareToSocialMedia, generateScanResultMessage, generateScanProgressMessage } from '@/lib/og-utils'

interface ScanProgress {
  scanId: string
  status: 'pending' | 'initializing' | 'setting_up' | 'scanning' | 'completed' | 'failed' | 'authentication_required' | 'awaiting_user_signin'
  progress: number
  followerCount?: number
  error?: string
  requiresSessionCookies?: boolean
  authenticationMessage?: string
  userActionRequired?: boolean
  actionDescription?: string
  message?: string
}

interface Screenshot {
  name: string
  timestamp: string
  description: string
  url: string
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
  const [screenshots, setScreenshots] = useState<Screenshot[]>([])
  const [showScreenshots, setShowScreenshots] = useState(false)

  useEffect(() => {
    if (user) {
      fetchRecentScans()
      checkXAuthorization()
    }
  }, [user])

  // Listen for auto-scan trigger from session capture
  useEffect(() => {
    const handleAutoScan = (event: CustomEvent) => {
      if (event.detail?.hasSessionData && xAuthorized && xUsername.trim()) {
        // Auto-start scan with captured session data
        startFollowerScan(true) // true indicates we have session data
      } else if (event.detail?.hasSessionData) {
        // Prompt for username if not set
        const username = prompt('Enter the X username to scan (without @):')
        if (username) {
          setXUsername(username)
          // Start scan after username is set
          setTimeout(() => startFollowerScan(true), 100)
        }
      }
    }

    window.addEventListener('startFollowerScan', handleAutoScan as EventListener)
    return () => window.removeEventListener('startFollowerScan', handleAutoScan as EventListener)
  }, [xAuthorized, xUsername])

  const checkXAuthorization = async () => {
    try {
      const token = await user?.getIdToken()
      const response = await fetch('/api/auth/X/status', {
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
    window.location.href = '/api/auth/X'
  }

  useEffect(() => {
    let interval: NodeJS.Timeout
    
    if (scanProgress && ['pending', 'initializing', 'setting_up', 'scanning', 'awaiting_user_signin', 'extracting_followers'].includes(scanProgress.status)) {
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
          requiresSessionCookies: data.requiresSessionCookies,
          authenticationMessage: data.authenticationMessage,
        })

        if (['completed', 'failed'].includes(data.status)) {
          setIsScanning(false)
          fetchRecentScans() // Refresh the recent scans list
        } else if (data.status === 'authentication_required') {
          setIsScanning(false)
          setShowSessionCookieHelper(true) // Show session cookie helper when auth is required
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

    // No manual cookies needed - fully automated using OAuth tokens

    setIsScanning(true)
    setShowSessionCookieHelper(false)
    setScanProgress({
      scanId: '',
      status: 'pending',
      progress: 0,
    })

    try {
      const token = await user?.getIdToken()
      const response = await fetch('/api/scan/auto', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ 
          xUsername: xUsername.trim()
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
        if (error.needsAuth) {
          // Redirect to X authorization
          alert('X authorization required. Redirecting to authorize...')
          window.location.href = '/api/auth/X'
          return
        }
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
    
    // If we have a failed scan that needs retry, retry it
    if (scanProgress?.status === 'authentication_required' && scanProgress.scanId) {
      retryWithSessionCookies(scanProgress.scanId, cookies)
    } else {
      startFollowerScan(true)
    }
  }

  const handleSkipSessionCookies = () => {
    setShowSessionCookieHelper(false)
    startFollowerScan(false)
  }

  const retryWithSessionCookies = async (scanId: string, cookies: any) => {
    setIsScanning(true)
    setScanProgress(prev => prev ? { ...prev, status: 'initializing' } : null)

    try {
      const token = await user?.getIdToken()
      const response = await fetch('/api/scan/retry', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ 
          scanId: scanId,
          sessionCookies: cookies
        }),
      })

      if (response.ok) {
        const data = await response.json()
        console.log('✅ Retry scan started:', data)
        // The scan progress will be updated by the polling mechanism
      } else {
        const error = await response.json()
        throw new Error(error.error || 'Failed to retry scan')
      }
    } catch (error) {
      console.error('Failed to retry scan:', error)
      setIsScanning(false)
      alert(`Failed to retry scan: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const getStatusMessage = (status: string, progress?: ScanProgress) => {
    switch (status) {
      case 'pending':
        return 'Initializing scan...'
      case 'initializing':
        return 'Setting up sandbox...'
      case 'setting_up':
        return 'Installing dependencies...'
      case 'scanning':
        return 'Extracting followers...'
      case 'awaiting_user_signin':
        return progress?.message || 'Browser opened - please sign into your X account'
      case 'completed':
        return 'Scan completed successfully!'
      case 'failed':
        return 'Scan failed'
      case 'authentication_required':
        return 'Authentication required - please provide session cookies'
      default:
        return 'Unknown status'
    }
  }

  // Removed old authentication link - now handled at dashboard level

  const fetchScreenshots = async (scanId: string) => {
    try {
      const token = await user?.getIdToken()
      const response = await fetch(`/api/sandbox/screenshots?scanId=${scanId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setScreenshots(data.screenshots || [])
        setShowScreenshots(true)
      } else {
        const error = await response.json()
        console.error('Failed to fetch screenshots:', error)
      }
    } catch (error) {
      console.error('Failed to fetch screenshots:', error)
    }
  }

  const shareResults = async (username: string, followerCount: number, status: string = 'completed') => {
    try {
      const ogImageUrl = generateScanResultOG({
        username,
        followers: followerCount,
        status: status as 'completed' | 'failed' | 'scanning'
      })
      
      const message = generateScanResultMessage(username, followerCount)
      await shareToSocialMedia(ogImageUrl, message)
    } catch (error) {
      console.error('Failed to share results:', error)
      alert('Failed to generate share content. Please try again.')
    }
  }

  const shareProgress = async (username: string, progress: number, currentCount?: number) => {
    try {
      const ogImageUrl = generateScanProgressOG({
        username,
        progress,
        current: currentCount,
        phase: 'scanning_followers'
      })
      
      const message = generateScanProgressMessage(username, progress)
      await shareToSocialMedia(ogImageUrl, message)
    } catch (error) {
      console.error('Failed to share progress:', error)
      alert('Failed to generate share content. Please try again.')
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-green-600'
      case 'failed':
        return 'text-red-600'
      case 'authentication_required':
        return 'text-orange-600'
      case 'awaiting_user_signin':
        return 'text-yellow-600'
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

            {/* User Action Required Alert */}
            {scanProgress.status === 'awaiting_user_signin' && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-yellow-800">
                      🚨 User Action Required
                    </h3>
                    <div className="mt-2 text-sm text-yellow-700">
                      <p className="font-semibold">X OAuth authentication in progress.</p>
                      <p className="mt-1">{scanProgress.actionDescription || 'Using your stored X OAuth tokens for automatic authentication.'}</p>
                      <p className="mt-2 text-xs">
                        💡 <strong>7-Step OAuth Method:</strong> No manual sign-in required - using your authorized X tokens.
                      </p>
                      <div className="mt-4 space-x-3">
                        <div className="text-sm text-blue-600 bg-blue-50 p-3 rounded-lg">
                          ℹ️ Authentication is now handled automatically with your X OAuth tokens. No manual sign-in required.
                        </div>
                        <button
                          onClick={() => fetchScreenshots(scanProgress.scanId)}
                          className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        >
                          📸 View Screenshots
                        </button>
                        <button
                          onClick={() => shareProgress(xUsername, scanProgress.progress, scanProgress.followerCount)}
                          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
                        >
                          📱 Share Progress
                        </button>
                        <button
                          onClick={() => startFollowerScan()}
                          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                        >
                          🔄 Restart Scan
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {scanProgress.status === 'completed' && scanProgress.followerCount && (
              <div className="bg-green-50 border border-green-200 rounded-md p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3 flex-1">
                    <h3 className="text-sm font-medium text-green-800">
                      ✅ Scan Completed Successfully!
                    </h3>
                    <div className="mt-2 text-sm text-green-700">
                      <p>Found <strong>{scanProgress.followerCount.toLocaleString()}</strong> followers for @{xUsername}</p>
                      <p className="mt-1">Your follower data is ready for analysis.</p>
                    </div>
                    <div className="mt-4">
                      <button
                        onClick={() => shareResults(xUsername, scanProgress.followerCount || 0)}
                        className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                      >
                        📱 Share Results
                      </button>
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
                      @{scan.xUsername || scan.XUsername}
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

      {/* Screenshots Display */}
      {showScreenshots && screenshots.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6 mt-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-gray-900">
              📸 Sandbox Screenshots
            </h3>
            <button
              onClick={() => setShowScreenshots(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {screenshots.map((screenshot, index) => (
              <div key={index} className="border rounded-lg p-4">
                <div className="aspect-video bg-gray-100 rounded-lg mb-3 flex items-center justify-center">
                  <div className="text-center text-gray-500">
                    <div className="text-4xl mb-2">📸</div>
                    <p className="text-sm">{screenshot.name}</p>
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="font-medium text-gray-900">{screenshot.description}</p>
                  <p className="text-sm text-gray-500">
                    {new Date(screenshot.timestamp).toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
          
          <div className="mt-4 text-sm text-gray-600">
            <p>💡 Screenshots are taken automatically during the extraction process to help monitor progress and debug any issues.</p>
          </div>
        </div>
      )}
    </div>
  )
}


