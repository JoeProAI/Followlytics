'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'

export default function XSessionCaptureEasy() {
  const { user } = useAuth()
  const [sessionStatus, setSessionStatus] = useState<'none' | 'captured' | 'expired'>('none')
  const [loading, setLoading] = useState(true)
  const [showInstructions, setShowInstructions] = useState(false)

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

  const startSessionCapture = () => {
    setShowInstructions(true)
  }

  const captureSessionData = async () => {
    if (!user) return

    try {
      setLoading(true)

      // Create a special capture page that will handle the session extraction
      const captureUrl = `${window.location.origin}/capture-session?userId=${user.uid}&returnUrl=${encodeURIComponent(window.location.href)}`
      
      // Open the capture page
      const captureWindow = window.open(captureUrl, 'session-capture', 'width=800,height=600,scrollbars=yes,resizable=yes')
      
      if (!captureWindow) {
        alert('Please allow popups for session capture to work.')
        return
      }

      // Listen for the capture completion
      const handleMessage = (event: MessageEvent) => {
        if (event.origin !== window.location.origin) return
        
        if (event.data.type === 'SESSION_CAPTURED') {
          window.removeEventListener('message', handleMessage)
          captureWindow.close()
          setShowInstructions(false)
          checkSessionStatus() // Refresh status
          alert('✅ X session captured successfully! You can now run follower scans.')
        } else if (event.data.type === 'CAPTURE_ERROR') {
          window.removeEventListener('message', handleMessage)
          alert('❌ Session capture failed: ' + event.data.error)
        }
      }

      window.addEventListener('message', handleMessage)

      // Timeout after 5 minutes
      setTimeout(() => {
        window.removeEventListener('message', handleMessage)
        if (!captureWindow.closed) {
          captureWindow.close()
        }
        setLoading(false)
        setShowInstructions(false)
      }, 5 * 60 * 1000)

    } catch (error) {
      console.error('Error starting session capture:', error)
      alert('Error starting session capture. Please try again.')
    } finally {
      setLoading(false)
    }
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
          <button
            onClick={checkSessionStatus}
            className="text-green-600 hover:text-green-700 text-sm"
          >
            🔄 Refresh
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium text-blue-800">
            🔐 X Session Required
          </h3>
          <p className="text-sm text-blue-700 mt-1">
            To scan followers, we need to capture your X login session. This is secure and automatic.
          </p>
        </div>
        <button
          onClick={startSessionCapture}
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm px-4 py-2 rounded"
        >
          {loading ? '🔄 Starting...' : '🔐 Capture X Session'}
        </button>
      </div>
      
      {showInstructions && (
        <div className="mt-4 p-4 bg-white border border-blue-200 rounded">
          <h4 className="text-sm font-medium text-blue-800 mb-2">
            📋 Simple Session Capture
          </h4>
          <div className="space-y-3">
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-xs font-medium text-blue-600">1</div>
              <p className="text-sm text-gray-700">A secure capture window will open</p>
            </div>
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-xs font-medium text-blue-600">2</div>
              <p className="text-sm text-gray-700">Login to X.com in that window (if not already logged in)</p>
            </div>
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-xs font-medium text-blue-600">3</div>
              <p className="text-sm text-gray-700">Click "Capture Session" - it will happen automatically</p>
            </div>
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-xs font-medium text-blue-600">4</div>
              <p className="text-sm text-gray-700">Window closes automatically when complete</p>
            </div>
          </div>
          
          <div className="mt-4 flex space-x-3">
            <button
              onClick={captureSessionData}
              disabled={loading}
              className="bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white text-sm px-4 py-2 rounded"
            >
              {loading ? '🔄 Opening...' : '🚀 Start Capture'}
            </button>
            <button
              onClick={() => setShowInstructions(false)}
              className="bg-gray-500 hover:bg-gray-600 text-white text-sm px-4 py-2 rounded"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}


