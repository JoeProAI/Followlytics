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
    console.log('🔍 X-Capture page loaded, checking location...')
    console.log('Current hostname:', window.location.hostname)
    console.log('Current URL:', window.location.href)
    
    // Check if we're already on X.com
    const currentHost = window.location.hostname
    const isXSite = currentHost.includes('x.com') || currentHost.includes('twitter.com')
    
    if (isXSite) {
      console.log('✅ On X.com, ready to capture')
      setIsOnX(true)
      setStatus('ready')
    } else {
      console.log('ℹ️ Not on X.com, showing instructions to go there')
      // Instead of auto-redirecting, show instructions
      setStatus('ready')
    }
  }, [])

  const captureSession = async () => {
    if (!userId) {
      setError('Missing user ID')
      setStatus('error')
      return
    }

    console.log('🔐 Starting session capture for user:', userId)

    // Check if we're on X.com first
    const currentHost = window.location.hostname
    const isXSite = currentHost.includes('x.com') || currentHost.includes('twitter.com')
    
    if (!isXSite) {
      setError('Please navigate to X.com first, then try capturing your session.')
      setStatus('error')
      return
    }

    try {
      setStatus('capturing')
      console.log('📊 Extracting session data...')
      
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

      console.log('📊 Session data extracted:', {
        cookieCount: Object.keys(cookies).length,
        localStorageCount: Object.keys(localStorage).length,
        sessionStorageCount: Object.keys(sessionStorage).length,
        url: window.location.href
      })

      if (Object.keys(cookies).length === 0) {
        throw new Error('No cookies found. Please make sure you are logged into X.com!')
      }

      console.log('📤 Sending session data to API...')

      // Send to Followlytics API
      const response = await fetch('https://followlytics-zeta.vercel.app/api/auth/capture-x-session-direct', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sessionData, userId }),
      })

      console.log('📥 API Response status:', response.status)

      if (!response.ok) {
        throw new Error(`API request failed with status ${response.status}`)
      }

      const result = await response.json()
      console.log('📥 API Response data:', result)

      if (result.success) {
        console.log('✅ Session capture successful!')
        setStatus('success')
        
        // Notify parent window with multiple origin attempts
        if (window.opener) {
          const origins = [
            'https://followlytics-zeta.vercel.app',
            window.location.origin,
            '*'
          ]
          
          origins.forEach(origin => {
            try {
              window.opener.postMessage({
                type: 'SESSION_CAPTURED',
                data: result
              }, origin)
              console.log('📨 Sent success message to origin:', origin)
            } catch (e) {
              console.log('Failed to send to origin:', origin, e)
            }
          })
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
      console.error('❌ Session capture error:', errorMessage)
      setError(errorMessage)
      setStatus('error')
      
      // Notify parent window of error
      if (window.opener) {
        const origins = [
          'https://followlytics-zeta.vercel.app',
          window.location.origin,
          '*'
        ]
        
        origins.forEach(origin => {
          try {
            window.opener.postMessage({
              type: 'CAPTURE_ERROR',
              error: errorMessage
            }, origin)
            console.log('📨 Sent error message to origin:', origin)
          } catch (e) {
            console.log('Failed to send error to origin:', origin, e)
          }
        })
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
        const currentHost = window.location.hostname
        const isXSite = currentHost.includes('x.com') || currentHost.includes('twitter.com')
        
        return (
          <div className="text-center">
            <div className="mb-6">
              <div className={`mx-auto flex items-center justify-center h-12 w-12 rounded-full ${isXSite ? 'bg-green-100' : 'bg-yellow-100'}`}>
                {isXSite ? (
                  <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="h-6 w-6 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                )}
              </div>
            </div>
            
            {isXSite ? (
              <>
                <h2 className="text-xl font-semibold text-green-900 mb-2">✅ Ready to Capture X Session</h2>
                <p className="text-green-700 mb-6">
                  Perfect! You're on X.com. Make sure you're logged in, then click capture.
                </p>
              </>
            ) : (
              <>
                <h2 className="text-xl font-semibold text-yellow-900 mb-2">⚠️ Need to Go to X.com First</h2>
                <p className="text-yellow-700 mb-4">
                  You need to be on X.com to capture your session.
                </p>
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                  <h3 className="text-sm font-medium text-yellow-800 mb-2">Steps:</h3>
                  <ol className="text-sm text-yellow-700 space-y-1 text-left list-decimal list-inside">
                    <li>Click "Go to X.com" below</li>
                    <li>Login to your X account</li>
                    <li>Come back to this window</li>
                    <li>Click "Capture X Session"</li>
                  </ol>
                </div>
              </>
            )}
            
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
              {!isXSite && (
                <a
                  href="https://x.com"
                  target="_blank"
                  className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-lg transition-colors inline-block"
                >
                  🌐 Go to X.com
                </a>
              )}
              <button
                onClick={captureSession}
                disabled={!isXSite}
                className={`font-medium py-3 px-6 rounded-lg transition-colors ${
                  isXSite 
                    ? 'bg-green-600 hover:bg-green-700 text-white' 
                    : 'bg-gray-400 text-gray-600 cursor-not-allowed'
                }`}
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
            
            <p className="text-xs text-gray-500 mt-4">
              Current site: {window.location.hostname}
            </p>
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
