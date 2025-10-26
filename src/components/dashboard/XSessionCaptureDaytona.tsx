'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'

export default function XSessionCaptureDaytona() {
  const { user } = useAuth()
  const [sessionStatus, setSessionStatus] = useState<'none' | 'captured' | 'expired'>('none')
  const [loading, setLoading] = useState(true)
  const [capturing, setCapturing] = useState(false)
  const [captureProgress, setCaptureProgress] = useState('')
  const [xUsername, setXUsername] = useState('')
  const [xPassword, setXPassword] = useState('')
  const [showCredentials, setShowCredentials] = useState(false)

  useEffect(() => {
    checkSessionStatus()
  }, [user])

  const checkSessionStatus = async () => {
    if (!user) return

    try {
      const token = await user.getIdToken()
      const response = await fetch('/api/auth/x-session-status', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setSessionStatus(data.hasValidSession ? 'captured' : 'none')
      }
    } catch (error) {
      console.error('Error checking session status:', error)
    } finally {
      setLoading(false)
    }
  }

  const startDaytonaCapture = async () => {
    if (!xUsername.trim() || !xPassword.trim()) {
      alert('Please enter your X username and password')
      return
    }

    setCapturing(true)
    setCaptureProgress('Creating secure sandbox...')

    try {
      const token = await user?.getIdToken()
      const response = await fetch('/api/daytona/capture-x-session', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          xUsername: xUsername.trim(),
          xPassword: xPassword.trim()
        }),
      })

      if (!response.ok) {
        throw new Error(`Capture failed: ${response.status}`)
      }

      const data = await response.json()
      
      if (data.success) {
        setCaptureProgress('Session captured successfully!')
        setSessionStatus('captured')
        setShowCredentials(false)
        setXPassword('') // Clear password for security
        
        // Auto-trigger follower scan
        const shouldStartScan = confirm('✅ X session captured successfully!\n\nWould you like to start a follower scan now?')
        if (shouldStartScan) {
          const scanEvent = new CustomEvent('startFollowerScan', {
            detail: { hasSessionData: true, username: xUsername }
          })
          window.dispatchEvent(scanEvent)
        }
      } else {
        throw new Error(data.error || 'Capture failed')
      }

    } catch (error) {
      console.error('Daytona capture error:', error)
      setCaptureProgress(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
      setTimeout(() => {
        setCaptureProgress('')
        setCapturing(false)
      }, 3000)
    } finally {
      if (sessionStatus === 'captured') {
        setCapturing(false)
        setCaptureProgress('')
      }
    }
  }

  const triggerAutoScan = () => {
    const scanEvent = new CustomEvent('startFollowerScan', {
      detail: { hasSessionData: true, username: xUsername }
    })
    window.dispatchEvent(scanEvent)
  }

  if (loading) {
    return (
      <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
        <div className="flex items-center">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-sm text-gray-600">Checking X session status...</span>
        </div>
      </div>
    )
  }

  if (sessionStatus === 'captured') {
    return (
      <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-green-800">
                ✅ X Session Active
              </h3>
              <p className="text-sm text-green-700">
                Your X authentication is captured and ready for follower scanning.
              </p>
            </div>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={triggerAutoScan}
              className="bg-green-600 hover:bg-green-700 text-white text-sm px-3 py-1 rounded"
            >
              🚀 Start Scan
            </button>
            <button
              onClick={checkSessionStatus}
              className="text-green-600 hover:text-green-700 text-sm"
            >
              🔄 Refresh
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (capturing) {
    return (
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-center">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800">
              🔐 Capturing X Session...
            </h3>
            <p className="text-sm text-blue-700">
              {captureProgress || 'Setting up secure environment...'}
            </p>
          </div>
        </div>
        <div className="mt-3 bg-blue-100 rounded-full h-2">
          <div className="bg-blue-600 h-2 rounded-full animate-pulse" style={{ width: '60%' }}></div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-medium text-orange-800">
            🔐 X Session Required
          </h3>
          <p className="text-sm text-orange-700 mt-1">
            Secure automated capture using Daytona sandbox - no browser setup needed!
          </p>
        </div>
        <button
          onClick={() => setShowCredentials(!showCredentials)}
          className="bg-orange-600 hover:bg-orange-700 text-white text-sm px-4 py-2 rounded"
        >
          {showCredentials ? '🔒 Hide' : '🔓 Setup Capture'}
        </button>
      </div>

      {showCredentials && (
        <div className="mt-4 p-4 bg-white border border-orange-200 rounded">
          <h4 className="text-sm font-medium text-orange-800 mb-3">
            🛡️ Secure X Authentication
          </h4>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                X Username (without @)
              </label>
              <input
                type="text"
                value={xUsername}
                onChange={(e) => setXUsername(e.target.value)}
                placeholder="your_username"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                X Password
              </label>
              <input
                type="password"
                value={xPassword}
                onChange={(e) => setXPassword(e.target.value)}
                placeholder="Your X password"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              />
            </div>
          </div>

          <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded">
            <h5 className="text-sm font-medium text-green-800 mb-2">
              🛡️ How Daytona Sandbox Capture Works:
            </h5>
            <ul className="text-sm text-green-700 space-y-1">
              <li>• Creates isolated sandbox environment</li>
              <li>• Automated browser login to X.com</li>
              <li>• Extracts session cookies securely</li>
              <li>• Destroys sandbox after capture</li>
              <li>• No data stored on your device</li>
              <li>• Enterprise-grade security</li>
            </ul>
          </div>

          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded">
            <h5 className="text-sm font-medium text-blue-800 mb-2">
              🚀 Benefits vs Browser Methods:
            </h5>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• ✅ No browser compatibility issues</li>
              <li>• ✅ No CSP or security policy blocks</li>
              <li>• ✅ No technical steps for users</li>
              <li>• ✅ Works with 2FA and complex logins</li>
              <li>• ✅ Handles rate limiting automatically</li>
              <li>• ✅ Scalable to multiple accounts</li>
            </ul>
          </div>

          <div className="mt-6 flex justify-between items-center">
            <button
              onClick={startDaytonaCapture}
              disabled={!xUsername.trim() || !xPassword.trim()}
              className="bg-orange-600 hover:bg-orange-700 disabled:bg-gray-400 text-white font-medium py-2 px-6 rounded-lg transition-colors"
            >
              🔐 Start Secure Capture
            </button>
            <button
              onClick={() => setShowCredentials(false)}
              className="text-gray-500 hover:text-gray-700 text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
        <p className="text-sm text-yellow-800">
          <strong>🔒 Security Note:</strong> Your credentials are only used temporarily in an isolated sandbox and are never stored permanently.
        </p>
      </div>
    </div>
  )
}


