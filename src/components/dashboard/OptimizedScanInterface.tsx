'use client'

import React, { useState, useEffect } from 'react'
import { useAuthState } from 'react-firebase-hooks/auth'
import { auth } from '@/lib/firebase'

interface ScanProgress {
  scanId: string
  status: 'initializing' | 'creating_sandbox' | 'setting_up_environment' | 'authenticating' | 'extracting_followers' | 'processing_results' | 'completed' | 'failed'
  progress: number
  message: string
  sandboxId?: string
  startTime: number
  estimatedCompletion?: number
  followersFound?: number
  error?: string
}

interface ScanConfig {
  username: string
  scanType: 'small' | 'medium' | 'large' | 'enterprise'
  maxFollowers?: number
  useSnapshot: boolean
  timeoutDisabled: boolean
}

const SCAN_TYPE_CONFIGS = {
  small: {
    name: 'Small Account',
    description: 'Up to 10K followers',
    estimatedTime: '2-5 minutes',
    features: ['Basic extraction', 'Standard performance'],
    maxFollowers: 10000,
    cost: 'Low resource usage'
  },
  medium: {
    name: 'Medium Account', 
    description: '10K-100K followers',
    estimatedTime: '5-15 minutes',
    features: ['Optimized extraction', 'Enhanced performance', 'Snapshot support'],
    maxFollowers: 100000,
    cost: 'Medium resource usage'
  },
  large: {
    name: 'Large Account',
    description: '100K-1M followers',
    estimatedTime: '15-30 minutes',
    features: ['Parallel processing', 'Advanced optimization', 'Enterprise patterns'],
    maxFollowers: 1000000,
    cost: 'High resource usage'
  },
  enterprise: {
    name: 'Enterprise Account',
    description: '1M+ followers',
    estimatedTime: '30-60 minutes',
    features: ['Maximum parallelization', 'All optimizations', 'Priority processing'],
    maxFollowers: 10000000,
    cost: 'Maximum resource usage'
  }
}

export default function OptimizedScanInterface() {
  const [user] = useAuthState(auth)
  const [scanConfig, setScanConfig] = useState<ScanConfig>({
    username: '',
    scanType: 'medium',
    maxFollowers: undefined,
    useSnapshot: true,
    timeoutDisabled: true
  })
  const [currentScan, setCurrentScan] = useState<ScanProgress | null>(null)
  const [isScanning, setIsScanning] = useState(false)
  const [XAuthStatus, setXAuthStatus] = useState<'checking' | 'authorized' | 'unauthorized'>('checking')

  useEffect(() => {
    checkXAuthStatus()
  }, [user])

  useEffect(() => {
    let interval: NodeJS.Timeout
    if (currentScan && currentScan.status !== 'completed' && currentScan.status !== 'failed') {
      interval = setInterval(() => {
        pollScanProgress(currentScan.scanId)
      }, 2000)
    }
    return () => {
      if (interval) clearInterval(interval)
    }
  }, [currentScan])

  const checkXAuthStatus = async () => {
    if (!user) return

    try {
      const token = await user.getIdToken()
      const response = await fetch('/api/auth/X/status', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      
      if (response.ok) {
        const data = await response.json()
        setXAuthStatus(data.authorized ? 'authorized' : 'unauthorized')
      } else {
        setXAuthStatus('unauthorized')
      }
    } catch (error) {
      console.error('Failed to check X auth status:', error)
      setXAuthStatus('unauthorized')
    }
  }

  const handleXAuth = async () => {
    if (!user) return

    try {
      const token = await user.getIdToken()
      const response = await fetch('/api/auth/X', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      })
      
      if (response.ok) {
        const data = await response.json()
        window.location.href = data.authUrl
      }
    } catch (error) {
      console.error('Failed to initiate X auth:', error)
    }
  }

  const startOptimizedScan = async () => {
    if (!user || !scanConfig.username) return

    setIsScanning(true)
    
    try {
      const token = await user.getIdToken()
      const response = await fetch('/api/scan/optimized', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(scanConfig)
      })

      if (response.ok) {
        const data = await response.json()
        setCurrentScan({
          scanId: data.scanId,
          status: 'initializing',
          progress: 0,
          message: 'Starting optimized scan...',
          startTime: Date.now()
        })
      } else {
        const error = await response.json()
        throw new Error(error.error || 'Failed to start scan')
      }
    } catch (error: any) {
      console.error('Failed to start scan:', error)
      alert(`Failed to start scan: ${error.message}`)
    } finally {
      setIsScanning(false)
    }
  }

  const pollScanProgress = async (scanId: string) => {
    try {
      const response = await fetch(`/api/scan/optimized?scanId=${scanId}`)
      if (response.ok) {
        const progress = await response.json()
        setCurrentScan(progress)
      }
    } catch (error) {
      console.error('Failed to poll scan progress:', error)
    }
  }

  const getProgressColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-500'
      case 'failed': return 'bg-red-500'
      case 'extracting_followers': return 'bg-blue-500'
      default: return 'bg-yellow-500'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return '✅'
      case 'failed': return '❌'
      case 'extracting_followers': return '🔍'
      case 'creating_sandbox': return '🚀'
      case 'setting_up_environment': return '⚙️'
      case 'authenticating': return '🔐'
      case 'processing_results': return '📊'
      default: return '⏳'
    }
  }

  if (XAuthStatus === 'checking') {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        <span className="ml-2">Checking X authorization...</span>
      </div>
    )
  }

  if (XAuthStatus === 'unauthorized') {
    return (
      <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-lg">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">X Authorization Required</h2>
          <p className="text-gray-600 mb-6">
            To use the optimized follower scanning, you need to authorize Followlytics to access your X account.
          </p>
          <button
            onClick={handleXAuth}
            className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-6 rounded-lg transition-colors"
          >
            🔗 Authorize X Access
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6 rounded-lg">
        <h1 className="text-3xl font-bold mb-2">⚡ Optimized Follower Scanner</h1>
        <p className="text-blue-100">
          Enterprise-grade scanning with X Developer Platform hidden gems integration
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <span className="bg-white/20 px-3 py-1 rounded-full text-sm">🚀 Timeout Disabled</span>
          <span className="bg-white/20 px-3 py-1 rounded-full text-sm">📸 Snapshot Support</span>
          <span className="bg-white/20 px-3 py-1 rounded-full text-sm">🔧 Enterprise Patterns</span>
          <span className="bg-white/20 px-3 py-1 rounded-full text-sm">⚡ Performance Optimized</span>
        </div>
      </div>

      {/* Scan Configuration */}
      {!currentScan && (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Configure Optimized Scan</h2>
          
          {/* Username Input */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Target X Username (without @)
            </label>
            <input
              type="text"
              value={scanConfig.username}
              onChange={(e) => setScanConfig(prev => ({ ...prev, username: e.target.value }))}
              placeholder="elonmusk"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className="text-sm text-gray-500 mt-1">
              Enter any public X account username to scan their followers
            </p>
          </div>

          {/* Scan Type Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-4">
              Scan Type & Optimization Level
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(SCAN_TYPE_CONFIGS).map(([type, config]) => (
                <div
                  key={type}
                  className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                    scanConfig.scanType === type
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => setScanConfig(prev => ({ ...prev, scanType: type as any }))}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-gray-900">{config.name}</h3>
                    <span className="text-sm text-gray-500">{config.estimatedTime}</span>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">{config.description}</p>
                  <div className="text-xs text-gray-500 mb-2">{config.cost}</div>
                  <div className="flex flex-wrap gap-1">
                    {config.features.map((feature, idx) => (
                      <span key={idx} className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs">
                        {feature}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Advanced Options */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Advanced Options</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Maximum Followers (optional)
                </label>
                <input
                  type="number"
                  value={scanConfig.maxFollowers || ''}
                  onChange={(e) => setScanConfig(prev => ({ 
                    ...prev, 
                    maxFollowers: e.target.value ? parseInt(e.target.value) : undefined 
                  }))}
                  placeholder="Leave empty for no limit"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="flex items-center space-x-6">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={scanConfig.useSnapshot}
                    onChange={(e) => setScanConfig(prev => ({ ...prev, useSnapshot: e.target.checked }))}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">
                    📸 Use Optimized Snapshot (faster startup)
                  </span>
                </label>

                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={scanConfig.timeoutDisabled}
                    onChange={(e) => setScanConfig(prev => ({ ...prev, timeoutDisabled: e.target.checked }))}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">
                    ⏰ Disable Timeout (recommended for large accounts)
                  </span>
                </label>
              </div>
            </div>
          </div>

          {/* Start Scan Button */}
          <button
            onClick={startOptimizedScan}
            disabled={!scanConfig.username || isScanning}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-400 text-white font-bold py-3 px-6 rounded-lg transition-all transform hover:scale-105 disabled:scale-100 disabled:cursor-not-allowed"
          >
            {isScanning ? (
              <span className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                Starting Optimized Scan...
              </span>
            ) : (
              '🚀 Start Optimized Scan'
            )}
          </button>
        </div>
      )}

      {/* Scan Progress */}
      {currentScan && (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-gray-900">Scan Progress</h2>
            <div className="text-sm text-gray-500">
              Scan ID: {currentScan.scanId}
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">
                {getStatusIcon(currentScan.status)} {currentScan.message}
              </span>
              <span className="text-sm text-gray-500">{currentScan.progress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className={`h-3 rounded-full transition-all duration-300 ${getProgressColor(currentScan.status)}`}
                style={{ width: `${currentScan.progress}%` }}
              ></div>
            </div>
          </div>

          {/* Scan Details */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="text-sm text-gray-500">Status</div>
              <div className="font-semibold text-gray-900 capitalize">
                {currentScan.status.replace('_', ' ')}
              </div>
            </div>
            
            {currentScan.sandboxId && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="text-sm text-gray-500">Sandbox ID</div>
                <div className="font-mono text-sm text-gray-900">
                  {currentScan.sandboxId.substring(0, 8)}...
                </div>
              </div>
            )}
            
            {currentScan.followersFound !== undefined && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="text-sm text-gray-500">Followers Found</div>
                <div className="font-semibold text-gray-900">
                  {currentScan.followersFound.toLocaleString()}
                </div>
              </div>
            )}
          </div>

          {/* Error Display */}
          {currentScan.status === 'failed' && currentScan.error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
              <div className="flex items-center">
                <span className="text-red-500 mr-2">❌</span>
                <span className="font-semibold text-red-800">Scan Failed</span>
              </div>
              <div className="text-red-700 mt-2">{currentScan.error}</div>
            </div>
          )}

          {/* Success Display */}
          {currentScan.status === 'completed' && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
              <div className="flex items-center">
                <span className="text-green-500 mr-2">✅</span>
                <span className="font-semibold text-green-800">Scan Completed Successfully!</span>
              </div>
              <div className="text-green-700 mt-2">
                Found {currentScan.followersFound?.toLocaleString()} followers in{' '}
                {Math.round((Date.now() - currentScan.startTime) / 1000)}s
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex space-x-4">
            {currentScan.status === 'completed' || currentScan.status === 'failed' ? (
              <button
                onClick={() => setCurrentScan(null)}
                className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-lg transition-colors"
              >
                🔄 Start New Scan
              </button>
            ) : (
              <button
                disabled
                className="bg-gray-400 text-white font-bold py-2 px-4 rounded-lg cursor-not-allowed"
              >
                ⏳ Scan in Progress...
              </button>
            )}
          </div>
        </div>
      )}

      {/* Features Showcase */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">🎯 Optimization Features</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="p-4 border border-gray-200 rounded-lg">
            <div className="text-lg font-semibold text-gray-900 mb-2">🚀 Timeout Disabled</div>
            <div className="text-sm text-gray-600">
              Long-running scans won't be terminated prematurely, ensuring complete data extraction.
            </div>
          </div>
          
          <div className="p-4 border border-gray-200 rounded-lg">
            <div className="text-lg font-semibold text-gray-900 mb-2">📸 Snapshot Support</div>
            <div className="text-sm text-gray-600">
              Pre-configured environments with all dependencies for faster startup times.
            </div>
          </div>
          
          <div className="p-4 border border-gray-200 rounded-lg">
            <div className="text-lg font-semibold text-gray-900 mb-2">🔧 Enterprise Patterns</div>
            <div className="text-sm text-gray-600">
              Production-grade error handling and retry logic from X Developer Platform.
            </div>
          </div>
          
          <div className="p-4 border border-gray-200 rounded-lg">
            <div className="text-lg font-semibold text-gray-900 mb-2">⚡ Performance Optimized</div>
            <div className="text-sm text-gray-600">
              Memory and CPU optimizations for handling large follower lists efficiently.
            </div>
          </div>
          
          <div className="p-4 border border-gray-200 rounded-lg">
            <div className="text-lg font-semibold text-gray-900 mb-2">🔄 Auto Recovery</div>
            <div className="text-sm text-gray-600">
              Automatic sandbox recovery and retry mechanisms for maximum reliability.
            </div>
          </div>
          
          <div className="p-4 border border-gray-200 rounded-lg">
            <div className="text-lg font-semibold text-gray-900 mb-2">📊 Real-time Progress</div>
            <div className="text-sm text-gray-600">
              Live progress tracking with detailed status updates and estimated completion times.
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}


