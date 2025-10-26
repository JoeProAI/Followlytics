'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'

export default function XSessionCaptureOAuth() {
  const { user } = useAuth()
  const [sessionStatus, setSessionStatus] = useState<'none' | 'captured' | 'expired'>('none')
  const [loading, setLoading] = useState(true)
  const [capturing, setCapturing] = useState(false)
  const [captureProgress, setCaptureProgress] = useState('')

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

  const startOAuthCapture = async () => {
    setCapturing(true)
    setCaptureProgress('Creating secure OAuth sandbox...')

    try {
      const token = await user?.getIdToken()
      const response = await fetch('/api/daytona/oauth-capture', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          captureType: 'oauth_session'
        }),
      })

      if (!response.ok) {
        throw new Error(`OAuth capture failed: ${response.status}`)
      }

      const data = await response.json()
      
      if (data.success) {
        setCaptureProgress('OAuth capture completed successfully!')
        setSessionStatus('captured')
        
        // Auto-trigger follower scan
        const shouldStartScan = confirm('✅ X OAuth session captured successfully!\n\nWould you like to start a follower scan now?')
        if (shouldStartScan) {
          const scanEvent = new CustomEvent('startFollowerScan', {
            detail: { hasSessionData: true, method: 'oauth_capture' }
          })
          window.dispatchEvent(scanEvent)
        }
      } else {
        throw new Error(data.error || 'OAuth capture failed')
      }

    } catch (error) {
      console.error('OAuth capture error:', error)
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
      detail: { hasSessionData: true, method: 'oauth_capture' }
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
                Your X OAuth session is captured and ready for follower scanning.
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
              🔐 Capturing X OAuth Session...
            </h3>
            <p className="text-sm text-blue-700">
              {captureProgress || 'Setting up secure OAuth environment...'}
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
    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-medium text-blue-800">
            🔐 X Session Required
          </h3>
          <p className="text-sm text-blue-700 mt-1">
            Secure OAuth authentication via Daytona sandbox - official X sign-in process!
          </p>
        </div>
        <button
          onClick={startOAuthCapture}
          className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-2 rounded"
        >
          🔓 Start OAuth Capture
        </button>
      </div>

      <div className="p-4 bg-white border border-blue-200 rounded">
        <h4 className="text-sm font-medium text-blue-800 mb-3">
          🛡️ How OAuth Session Capture Works:
        </h4>
        
        <div className="space-y-3">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0 w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-xs font-medium text-blue-600">1</div>
            <div className="flex-1">
              <p className="text-sm text-gray-700">
                <strong>Secure Sandbox Creation:</strong> Creates isolated Daytona environment
              </p>
            </div>
          </div>
          
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0 w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-xs font-medium text-blue-600">2</div>
            <div className="flex-1">
              <p className="text-sm text-gray-700">
                <strong>Official X OAuth:</strong> Uses official X OAuth consent flow (no passwords!)
              </p>
            </div>
          </div>
          
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0 w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-xs font-medium text-blue-600">3</div>
            <div className="flex-1">
              <p className="text-sm text-gray-700">
                <strong>Session Extraction:</strong> Captures OAuth tokens and session cookies
              </p>
            </div>
          </div>
          
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0 w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-xs font-medium text-blue-600">4</div>
            <div className="flex-1">
              <p className="text-sm text-gray-700">
                <strong>Secure Storage:</strong> Stores session data encrypted in Firebase
              </p>
            </div>
          </div>
        </div>

        <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded">
          <h5 className="text-sm font-medium text-green-800 mb-2">
            ✅ Security & Privacy Benefits:
          </h5>
          <ul className="text-sm text-green-700 space-y-1">
            <li>• No passwords required - uses official X OAuth</li>
            <li>• Enterprise-grade sandbox isolation</li>
            <li>• Encrypted session storage</li>
            <li>• Automatic sandbox cleanup</li>
            <li>• No data stored on your device</li>
            <li>• Follows X's official authentication flow</li>
          </ul>
        </div>

        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded">
          <h5 className="text-sm font-medium text-blue-800 mb-2">
            🚀 Why This Works Better:
          </h5>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• ✅ Official X OAuth consent (no ToS violations)</li>
            <li>• ✅ No password security risks</li>
            <li>• ✅ Handles 2FA automatically</li>
            <li>• ✅ Works with all X account types</li>
            <li>• ✅ Scalable Daytona infrastructure</li>
            <li>• ✅ Professional-grade reliability</li>
          </ul>
        </div>
      </div>

      <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
        <p className="text-sm text-yellow-800">
          <strong>🔒 Privacy Note:</strong> This process uses X's official OAuth flow. You'll see X's consent screen where you authorize Followlytics to access your follower data.
        </p>
      </div>
    </div>
  )
}

