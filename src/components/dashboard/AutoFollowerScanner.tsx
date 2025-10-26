'use client'

import React, { useState } from 'react'
import { useAuthState } from 'react-firebase-hooks/auth'
import { auth } from '@/lib/firebase'

interface AutoFollowerScannerProps {
  detectedUsername?: string
}

interface ScanProgress {
  phase: string
  progress: number
  message: string
  followersFound: number
  estimatedTotal?: number
}

export default function AutoFollowerScanner({ detectedUsername }: AutoFollowerScannerProps) {
  const [user] = useAuthState(auth)
  const [scanning, setScanning] = useState(false)
  const [progress, setProgress] = useState<ScanProgress>({
    phase: 'idle',
    progress: 0,
    message: '',
    followersFound: 0
  })
  const [error, setError] = useState('')
  const [scanId, setScanId] = useState('')

  const startAutoScan = async () => {
    if (!user || !detectedUsername) return

    setScanning(true)
    setError('')
    setScanId('')
    setProgress({
      phase: 'initializing',
      progress: 0,
      message: '🚀 Initializing automated follower scan...',
      followersFound: 0
    })

    try {
      const token = await user.getIdToken()
      
      // Step 1: Start the automated scan via API
      const response = await fetch('/api/scan/auto-followers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          username: detectedUsername,
          scanType: 'complete', // Get all followers
          useBackground: true,   // Use background processing
          useSandbox: true      // Deploy sandbox for heavy lifting
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to start scan')
      }

      const result = await response.json()
      setScanId(result.scanId)
      
      setProgress({
        phase: 'started',
        progress: 10,
        message: `✅ Scan started! ID: ${result.scanId}`,
        followersFound: 0,
        estimatedTotal: result.estimatedTotal
      })

      // Step 2: Monitor progress
      monitorScanProgress(result.scanId, token)

    } catch (err: any) {
      setError(err.message)
      setScanning(false)
    }
  }

  const monitorScanProgress = async (scanId: string, token: string) => {
    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`/api/scan/auto-followers?scanId=${scanId}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })

        if (!response.ok) {
          throw new Error('Failed to get scan progress')
        }

        const progressData = await response.json()
        
        setProgress({
          phase: progressData.phase,
          progress: progressData.progress,
          message: progressData.message,
          followersFound: progressData.followersFound || 0,
          estimatedTotal: progressData.estimatedTotal
        })

        // Check if scan is complete
        if (progressData.phase === 'completed') {
          clearInterval(pollInterval)
          setScanning(false)
          setProgress(prev => ({
            ...prev,
            message: `🎉 Scan completed! Found ${progressData.followersFound} followers`
          }))
        } else if (progressData.phase === 'failed') {
          clearInterval(pollInterval)
          setScanning(false)
          setError(progressData.error || 'Scan failed')
        }

      } catch (err: any) {
        console.error('Progress monitoring error:', err)
        // Continue polling unless it's a critical error
      }
    }, 3000) // Poll every 3 seconds

    // Timeout after 30 minutes
    setTimeout(() => {
      clearInterval(pollInterval)
      if (scanning) {
        setScanning(false)
        setError('Scan timed out after 30 minutes')
      }
    }, 30 * 60 * 1000)
  }

  const getPhaseIcon = (phase: string) => {
    switch (phase) {
      case 'initializing': return '🚀'
      case 'getting_user_info': return '👤'
      case 'creating_sandbox': return '📦'
      case 'opening_browser': return '🌐'
      case 'navigating': return '🧭'
      case 'scrolling': return '📜'
      case 'extracting': return '⚡'
      case 'processing': return '🔄'
      case 'completed': return '🎉'
      case 'failed': return '❌'
      default: return '⏳'
    }
  }

  const getPhaseDescription = (phase: string) => {
    switch (phase) {
      case 'initializing': return 'Setting up scan parameters'
      case 'getting_user_info': return 'Getting user profile information'
      case 'creating_sandbox': return 'Creating Daytona sandbox for processing'
      case 'opening_browser': return 'Opening browser in sandbox'
      case 'navigating': return 'Navigating to followers page'
      case 'scrolling': return 'Auto-scrolling to load all followers'
      case 'extracting': return 'Extracting follower data'
      case 'processing': return 'Processing and analyzing data'
      case 'completed': return 'Scan completed successfully'
      case 'failed': return 'Scan failed'
      default: return 'Processing...'
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          🤖 Automated Follower Scanner
        </h2>
        <p className="text-gray-600">
          Fully automated follower scanning using background processing and sandboxes
        </p>
        {detectedUsername && (
          <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded">
            <p className="text-sm text-green-800">
              ✅ Ready to scan: <strong>@{detectedUsername}</strong>
            </p>
          </div>
        )}
        {!detectedUsername && (
          <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded">
            <p className="text-sm text-yellow-800">
              ⚠️ Please authorize X Access above first to get your username
            </p>
          </div>
        )}
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded">
          <p className="text-sm text-red-800">❌ {error}</p>
        </div>
      )}

      {/* Progress Display */}
      {scanning && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded">
          <div className="flex items-center mb-3">
            <span className="text-2xl mr-3">{getPhaseIcon(progress.phase)}</span>
            <div className="flex-1">
              <h3 className="font-semibold text-blue-900">
                {getPhaseDescription(progress.phase)}
              </h3>
              <p className="text-sm text-blue-700">{progress.message}</p>
            </div>
          </div>
          
          {/* Progress Bar */}
          <div className="w-full bg-gray-200 rounded-full h-3 mb-3">
            <div 
              className="bg-blue-600 h-3 rounded-full transition-all duration-500"
              style={{ width: `${progress.progress}%` }}
            ></div>
          </div>
          
          {/* Stats */}
          <div className="flex justify-between text-sm text-blue-700">
            <span>Progress: {progress.progress}%</span>
            <span>Found: {progress.followersFound}</span>
            {progress.estimatedTotal && (
              <span>Estimated Total: {progress.estimatedTotal}</span>
            )}
          </div>
          
          {scanId && (
            <div className="mt-2 text-xs text-blue-600">
              Scan ID: {scanId}
            </div>
          )}
        </div>
      )}

      {/* Control Buttons */}
      <div className="flex space-x-4 mb-6">
        <button
          onClick={startAutoScan}
          disabled={scanning || !detectedUsername}
          className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-bold py-3 px-6 rounded-lg transition-colors"
        >
          {scanning ? '🔄 Scanning...' : !detectedUsername ? '⚠️ Authorize X Access First' : '🤖 Start Automated Scan'}
        </button>

        {scanning && (
          <button
            onClick={() => {
              setScanning(false)
              setError('Scan cancelled by user')
            }}
            className="bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-lg transition-colors"
          >
            ⏹️ Cancel Scan
          </button>
        )}
      </div>

      {/* Features List */}
      <div className="border-t pt-6">
        <h3 className="text-lg font-semibold mb-4">🚀 Automated Features</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-start space-x-3">
            <span className="text-green-500 text-xl">✅</span>
            <div>
              <h4 className="font-medium">Background Processing</h4>
              <p className="text-sm text-gray-600">Runs in Daytona sandbox, no browser interference</p>
            </div>
          </div>
          <div className="flex items-start space-x-3">
            <span className="text-green-500 text-xl">✅</span>
            <div>
              <h4 className="font-medium">Auto-Scrolling</h4>
              <p className="text-sm text-gray-600">Automatically loads all followers</p>
            </div>
          </div>
          <div className="flex items-start space-x-3">
            <span className="text-green-500 text-xl">✅</span>
            <div>
              <h4 className="font-medium">Real-time Progress</h4>
              <p className="text-sm text-gray-600">Live updates on scan progress</p>
            </div>
          </div>
          <div className="flex items-start space-x-3">
            <span className="text-green-500 text-xl">✅</span>
            <div>
              <h4 className="font-medium">Complete Data</h4>
              <p className="text-sm text-gray-600">Gets all followers, not just visible ones</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}


