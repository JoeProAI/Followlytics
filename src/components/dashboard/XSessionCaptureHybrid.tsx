'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'

export default function XSessionCaptureHybrid() {
  const { user } = useAuth()
  const [sessionStatus, setSessionStatus] = useState<'none' | 'captured' | 'expired'>('none')
  const [loading, setLoading] = useState(true)
  const [capturing, setCapturing] = useState(false)
  const [captureProgress, setCaptureProgress] = useState('')
  const [XAuthStatus, setXAuthStatus] = useState<{
    authorized: boolean
    loading: boolean
  }>({ authorized: false, loading: true })

  useEffect(() => {
    checkSessionStatus()
    checkXAuth()
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

  const checkXAuth = async () => {
    if (!user) return

    try {
      const token = await user.getIdToken()
      const response = await fetch('/api/auth/X/status', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setXAuthStatus({ authorized: data.authorized, loading: false })
      }
    } catch (error) {
      console.error('Error checking X auth:', error)
      setXAuthStatus({ authorized: false, loading: false })
    }
  }

  const startXAuth = async () => {
    try {
      const token = await user?.getIdToken()
      const response = await fetch('/api/auth/X', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      if (response.ok) {
        const data = await response.json()
        if (data.authUrl) {
          window.location.href = data.authUrl
        }
      }
    } catch (error) {
      console.error('X auth error:', error)
    }
  }

  const startHybridCapture = async () => {
    if (!XAuthStatus.authorized) {
      alert('Please authorize X access first')
      return
    }

    setCapturing(true)
    setCaptureProgress('Using your X OAuth tokens to capture session...')

    try {
      const token = await user?.getIdToken()
      const response = await fetch('/api/daytona/hybrid-capture', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          captureType: 'hybrid_oauth_session'
        }),
      })

      if (!response.ok) {
        throw new Error(`Hybrid capture failed: ${response.status}`)
      }

      const data = await response.json()
      
      if (data.success) {
        setCaptureProgress('Session captured successfully!')
        setSessionStatus('captured')
        
        // Auto-trigger follower scan
        const shouldStartScan = confirm('✅ X session captured successfully!\n\nWould you like to start a follower scan now?')
        if (shouldStartScan) {
          const scanEvent = new CustomEvent('startFollowerScan', {
            detail: { hasSessionData: true, method: 'hybrid_capture' }
          })
          window.dispatchEvent(scanEvent)
        }
      } else {
        throw new Error(data.error || 'Hybrid capture failed')
      }

    } catch (error) {
      console.error('Hybrid capture error:', error)
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
      detail: { hasSessionData: true, method: 'hybrid_capture' }
    })
    window.dispatchEvent(scanEvent)
  }

  if (loading || XAuthStatus.loading) {
    return (
      <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
        <div className="flex items-center">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-sm text-gray-600">Checking authentication status...</span>
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
                Your X session is captured and ready for follower scanning.
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

  if (!XAuthStatus.authorized) {
    return (
      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-medium text-yellow-800">
              🔑 X Authorization Required
            </h3>
            <p className="text-sm text-yellow-700 mt-1">
              First authorize X access, then we'll capture your session in Daytona
            </p>
          </div>
          <button
            onClick={startXAuth}
            className="bg-yellow-600 hover:bg-yellow-700 text-white text-sm px-4 py-2 rounded"
          >
            🔓 Authorize X
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-medium text-blue-800">
            🔐 X Session Required
          </h3>
          <p className="text-sm text-blue-700 mt-1">
            Use your X OAuth tokens to capture full session data in Daytona
          </p>
        </div>
        <button
          onClick={startHybridCapture}
          className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-2 rounded"
        >
          🔓 Capture Session
        </button>
      </div>

      <div className="p-4 bg-white border border-blue-200 rounded">
        <h4 className="text-sm font-medium text-blue-800 mb-3">
          🛡️ How Hybrid Session Capture Works:
        </h4>
        
        <div className="space-y-3">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0 w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-xs font-medium text-blue-600">1</div>
            <div className="flex-1">
              <p className="text-sm text-gray-700">
                <strong>Use Your OAuth Tokens:</strong> Leverages your existing X authorization
              </p>
            </div>
          </div>
          
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0 w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-xs font-medium text-blue-600">2</div>
            <div className="flex-1">
              <p className="text-sm text-gray-700">
                <strong>Daytona Enhancement:</strong> Uses tokens to access X.com and capture full session
              </p>
            </div>
          </div>
          
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0 w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-xs font-medium text-blue-600">3</div>
            <div className="flex-1">
              <p className="text-sm text-gray-700">
                <strong>Complete Session:</strong> Captures cookies, localStorage, and session data
              </p>
            </div>
          </div>
          
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0 w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-xs font-medium text-blue-600">4</div>
            <div className="flex-1">
              <p className="text-sm text-gray-700">
                <strong>Ready for Scanning:</strong> Full session enables comprehensive follower extraction
              </p>
            </div>
          </div>
        </div>

        <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded">
          <h5 className="text-sm font-medium text-green-800 mb-2">
            ✅ Why This Works:
          </h5>
          <ul className="text-sm text-green-700 space-y-1">
            <li>• Uses your existing X OAuth authorization</li>
            <li>• No additional login or passwords required</li>
            <li>• Daytona enhances OAuth tokens to full session</li>
            <li>• Captures complete authentication state</li>
            <li>• Enterprise-grade security and isolation</li>
            <li>• Enables comprehensive follower extraction</li>
          </ul>
        </div>

        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded">
          <h5 className="text-sm font-medium text-blue-800 mb-2">
            🚀 Technical Process:
          </h5>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• ✅ Retrieves your stored OAuth tokens</li>
            <li>• ✅ Creates secure Daytona sandbox</li>
            <li>• ✅ Uses tokens to authenticate with X.com</li>
            <li>• ✅ Captures full browser session state</li>
            <li>• ✅ Stores session data securely</li>
            <li>• ✅ Enables advanced follower scanning</li>
          </ul>
        </div>
      </div>

      <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded">
        <p className="text-sm text-green-800">
          <strong>✅ X Authorized:</strong> You're ready to capture your full X session using your existing OAuth tokens.
        </p>
      </div>
    </div>
  )
}

