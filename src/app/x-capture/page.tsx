'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'

function XCaptureContent() {
  const searchParams = useSearchParams()
  const userId = searchParams.get('userId')
  
  const [status, setStatus] = useState<'loading' | 'redirecting' | 'ready' | 'capturing' | 'success' | 'error'>('loading')
  const [error, setError] = useState('')
  const [isOnX, setIsOnX] = useState(false)

  useEffect(() => {
    // Check if we're already on X.com
    const currentHost = window.location.hostname
    const isXSite = currentHost.includes('x.com') || currentHost.includes('twitter.com')
    
    if (isXSite) {
      setIsOnX(true)
      setStatus('ready')
    } else {
      // We're on Followlytics domain, need to redirect to X.com
      setStatus('redirecting')
      // Redirect to X.com with our capture page URL
      const redirectUrl = `https://x.com`
      window.location.href = redirectUrl
    }
  }, [])

  const captureSession = async () => {
    if (!userId) {
      setError('Missing user ID')
      setStatus('error')
      return
    }

    try {
      setStatus('capturing')
      
      // Extract session data
      const cookies: Record<string, string> = {}
      document.cookie.split(';').forEach(cookie => {
        const [name, value] = cookie.trim().split('=')
        if (name && value) cookies[name] = value
      })

      const localStorage: Record<string, string> = {}
      try {
        for (let i = 0; i < window.localStorage.length; i++) {
          const key = window.localStorage.key(i)
          if (key) localStorage[key] = window.localStorage.getItem(key) || ''
        }
      } catch (e) {
        console.log('localStorage access failed:', e)
      }

      const sessionStorage: Record<string, string> = {}
      try {
        for (let i = 0; i < window.sessionStorage.length; i++) {
          const key = window.sessionStorage.key(i)
          if (key) sessionStorage[key] = window.sessionStorage.getItem(key) || ''
        }
      } catch (e) {
        console.log('sessionStorage access failed:', e)
      }

      const sessionData = {
        cookies,
        localStorage,
        sessionStorage,
        userAgent: navigator.userAgent,
        url: window.location.href,
        timestamp: new Date().toISOString()
      }

      if (Object.keys(cookies).length === 0) {
        throw new Error('No cookies found. Please make sure you are logged into X.com!')
      }

      // Send to Followlytics API
      const response = await fetch('https://followlytics-zeta.vercel.app/api/auth/capture-x-session-direct', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sessionData, userId }),
      })

      const result = await response.json()

      if (result.success) {
        setStatus('success')
        
        // Notify parent window
        if (window.opener) {
          window.opener.postMessage({
            type: 'SESSION_CAPTURED',
            data: result
          }, window.location.origin.replace('x.com', 'followlytics-zeta.vercel.app'))
        }
        
        // Auto-close after 3 seconds
        setTimeout(() => {
          window.close()
        }, 3000)
        
      } else {
        throw new Error(result.error || 'Capture failed')
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      setError(errorMessage)
      setStatus('error')
      
      // Notify parent window of error
      if (window.opener) {
        window.opener.postMessage({
          type: 'CAPTURE_ERROR',
          error: errorMessage
        }, window.location.origin.replace('x.com', 'followlytics-zeta.vercel.app'))
      }
    }
  }

  const cancelCapture = () => {
    if (window.opener) {
      window.opener.postMessage({
        type: 'CAPTURE_CANCELLED'
      }, window.location.origin.replace('x.com', 'followlytics-zeta.vercel.app'))
    }
    window.close()
  }

  const renderContent = () => {
    switch (status) {
      case 'loading':
        return (
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Loading...</h2>
            <p className="text-gray-600">Preparing X session capture...</p>
          </div>
        )

      case 'redirecting':
        return (
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Redirecting to X.com...</h2>
            <p className="text-gray-600">Please wait while we redirect you to X.com for session capture.</p>
          </div>
        )

      case 'ready':
        return (
          <div className="text-center">
            <div className="mb-6">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-blue-100">
                <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Ready to Capture X Session</h2>
            <p className="text-gray-600 mb-6">
              Make sure you're logged into X.com, then click the button below to capture your session.
            </p>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <h3 className="text-sm font-medium text-blue-800 mb-2">What this does:</h3>
              <ul className="text-sm text-blue-700 space-y-1 text-left">
                <li>• Securely captures your X login session</li>
                <li>• Allows Followlytics to access your followers</li>
                <li>• Session expires automatically in 24 hours</li>
                <li>• No passwords or sensitive data stored</li>
              </ul>
            </div>
            <div className="space-x-4">
              <button
                onClick={captureSession}
                className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-lg transition-colors"
              >
                🔐 Capture X Session
              </button>
              <button
                onClick={cancelCapture}
                className="bg-gray-500 hover:bg-gray-600 text-white font-medium py-3 px-6 rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )

      case 'capturing':
        return (
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Capturing Session...</h2>
            <p className="text-gray-600">Please wait while we securely capture your X session data.</p>
          </div>
        )

      case 'success':
        return (
          <div className="text-center">
            <div className="mb-6">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
                <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>
            <h2 className="text-xl font-semibold text-green-900 mb-2">✅ Session Captured Successfully!</h2>
            <p className="text-green-700 mb-4">
              Your X session has been captured and stored securely. You can now run follower scans in Followlytics.
            </p>
            <p className="text-sm text-gray-600">This window will close automatically...</p>
          </div>
        )

      case 'error':
        return (
          <div className="text-center">
            <div className="mb-6">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
            </div>
            <h2 className="text-xl font-semibold text-red-900 mb-2">❌ Capture Failed</h2>
            <p className="text-red-700 mb-4">
              There was an error capturing your X session: {error}
            </p>
            <div className="space-x-4">
              <button
                onClick={captureSession}
                className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded transition-colors"
              >
                🔄 Try Again
              </button>
              <button
                onClick={cancelCapture}
                className="bg-gray-500 hover:bg-gray-600 text-white font-medium py-2 px-4 rounded transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-blue-600">📊 Followlytics</h1>
          <p className="text-gray-600">X Session Capturer</p>
        </div>
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          {renderContent()}
        </div>
      </div>
    </div>
  )
}

export default function XCapturePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    }>
      <XCaptureContent />
    </Suspense>
  )
}
