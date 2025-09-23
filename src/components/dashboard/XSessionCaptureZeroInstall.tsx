'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'

export default function XSessionCaptureZeroInstall() {
  const { user } = useAuth()
  const [sessionStatus, setSessionStatus] = useState<'none' | 'captured' | 'expired'>('none')
  const [loading, setLoading] = useState(true)
  const [capturing, setCapturing] = useState(false)

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

  const startCapture = async () => {
    if (!user) return

    setCapturing(true)

    try {
      // Create capture URL with user ID
      const captureUrl = `${window.location.origin}/x-capture?userId=${user.uid}`
      
      // Open popup window
      const popup = window.open(
        captureUrl,
        'x-session-capture',
        'width=500,height=700,scrollbars=yes,resizable=yes,location=yes'
      )

      if (!popup) {
        alert('Please allow popups for this site to capture your X session.')
        setCapturing(false)
        return
      }

      // Listen for messages from popup
      const handleMessage = (event: MessageEvent) => {
        if (event.origin !== window.location.origin) return
        
        if (event.data.type === 'SESSION_CAPTURED') {
          window.removeEventListener('message', handleMessage)
          popup.close()
          setCapturing(false)
          checkSessionStatus() // Refresh status
          
          // Auto-trigger follower scan
          const shouldStartScan = confirm('✅ X session captured successfully!\n\nWould you like to start a follower scan now?')
          if (shouldStartScan) {
            // Trigger the follower scanner
            const scanEvent = new CustomEvent('startFollowerScan', {
              detail: { hasSessionData: true }
            })
            window.dispatchEvent(scanEvent)
          }
        } else if (event.data.type === 'CAPTURE_ERROR') {
          window.removeEventListener('message', handleMessage)
          popup.close()
          setCapturing(false)
          alert('❌ Session capture failed: ' + event.data.error)
        } else if (event.data.type === 'CAPTURE_CANCELLED') {
          window.removeEventListener('message', handleMessage)
          setCapturing(false)
        }
      }

      window.addEventListener('message', handleMessage)

      // Check if popup was closed manually
      const checkClosed = setInterval(() => {
        if (popup.closed) {
          clearInterval(checkClosed)
          window.removeEventListener('message', handleMessage)
          setCapturing(false)
        }
      }, 1000)

      // Timeout after 10 minutes
      setTimeout(() => {
        clearInterval(checkClosed)
        window.removeEventListener('message', handleMessage)
        if (!popup.closed) {
          popup.close()
        }
        setCapturing(false)
      }, 10 * 60 * 1000)

    } catch (error) {
      console.error('Error starting capture:', error)
      alert('Error starting session capture. Please try again.')
      setCapturing(false)
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
            Click below to capture your X session. No installation required - just one click!
          </p>
        </div>
        <button
          onClick={startCapture}
          disabled={capturing}
          className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm px-4 py-2 rounded transition-colors"
        >
          {capturing ? '🔄 Capturing...' : '🔐 Capture X Session'}
        </button>
      </div>
      
      {capturing && (
        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
          <p className="text-sm text-yellow-800">
            <strong>📋 What's happening:</strong>
          </p>
          <ol className="text-sm text-yellow-700 mt-1 list-decimal list-inside space-y-1">
            <li>A secure popup window will open</li>
            <li>You'll be redirected to X.com to login</li>
            <li>Once logged in, click "Capture Session"</li>
            <li>The popup will close automatically when done</li>
          </ol>
          <p className="text-xs text-yellow-600 mt-2">
            If the popup doesn't appear, please allow popups for this site.
          </p>
        </div>
      )}
    </div>
  )
}
