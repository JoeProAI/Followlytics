'use client'

import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'

export default function XSessionCapture() {
  const { user } = useAuth()
  const [capturing, setCapturing] = useState(false)
  const [sessionCaptured, setSessionCaptured] = useState(false)
  const [error, setError] = useState('')

  const captureXSession = async () => {
    if (!user) return

    setCapturing(true)
    setError('')

    try {
      // Open X.com in a popup window
      const popup = window.open(
        'https://x.com',
        'x-session-capture',
        'width=800,height=600,scrollbars=yes,resizable=yes'
      )

      if (!popup) {
        throw new Error('Popup blocked. Please allow popups for this site.')
      }

      // Wait for user to login and navigate to their profile
      const checkInterval = setInterval(async () => {
        try {
          // Check if popup is still open and user is on X.com
          if (popup.closed) {
            clearInterval(checkInterval)
            setCapturing(false)
            return
          }

          // Try to access popup content (will fail if different domain)
          const popupUrl = popup.location.href
          
          if (popupUrl.includes('x.com') || popupUrl.includes('twitter.com')) {
            // User is on X.com, try to capture session
            const sessionData = await captureSessionFromPopup(popup)
            
            if (sessionData) {
              // Send session data to our API
              const token = await user.getIdToken()
              const response = await fetch('/api/auth/capture-x-session', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({ sessionData }),
              })

              const result = await response.json()
              
              if (result.success) {
                setSessionCaptured(true)
                popup.close()
                clearInterval(checkInterval)
              } else {
                throw new Error(result.error || 'Failed to capture session')
              }
            }
          }
        } catch (err) {
          // Ignore cross-origin errors, continue checking
          console.log('Waiting for user to complete X login...')
        }
      }, 2000)

      // Timeout after 5 minutes
      setTimeout(() => {
        clearInterval(checkInterval)
        if (!popup.closed) {
          popup.close()
        }
        if (capturing) {
          setCapturing(false)
          setError('Session capture timed out. Please try again.')
        }
      }, 5 * 60 * 1000)

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to capture X session')
      setCapturing(false)
    }
  }

  const captureSessionFromPopup = async (popup: Window): Promise<any> => {
    return new Promise((resolve) => {
      try {
        // Inject script into popup to capture session data
        const script = popup.document.createElement('script')
        script.textContent = `
          (function() {
            try {
              // Capture cookies
              const cookies = {};
              document.cookie.split(';').forEach(cookie => {
                const [name, value] = cookie.trim().split('=');
                if (name && value) cookies[name] = value;
              });
              
              // Capture localStorage
              const localStorage = {};
              for (let i = 0; i < window.localStorage.length; i++) {
                const key = window.localStorage.key(i);
                localStorage[key] = window.localStorage.getItem(key);
              }
              
              // Capture sessionStorage
              const sessionStorage = {};
              for (let i = 0; i < window.sessionStorage.length; i++) {
                const key = window.sessionStorage.key(i);
                sessionStorage[key] = window.sessionStorage.getItem(key);
              }
              
              const sessionData = {
                cookies,
                localStorage,
                sessionStorage,
                userAgent: navigator.userAgent,
                url: window.location.href,
                timestamp: new Date().toISOString()
              };
              
              // Send data back to parent window
              window.parent.postMessage({
                type: 'X_SESSION_CAPTURED',
                data: sessionData
              }, '*');
              
            } catch (error) {
              window.parent.postMessage({
                type: 'X_SESSION_ERROR',
                error: error.message
              }, '*');
            }
          })();
        `
        popup.document.head.appendChild(script)
        
        // Listen for the response
        const messageHandler = (event: MessageEvent) => {
          if (event.data.type === 'X_SESSION_CAPTURED') {
            window.removeEventListener('message', messageHandler)
            resolve(event.data.data)
          } else if (event.data.type === 'X_SESSION_ERROR') {
            window.removeEventListener('message', messageHandler)
            resolve(null)
          }
        }
        
        window.addEventListener('message', messageHandler)
        
        // Timeout after 10 seconds
        setTimeout(() => {
          window.removeEventListener('message', messageHandler)
          resolve(null)
        }, 10000)
        
      } catch (error) {
        resolve(null)
      }
    })
  }

  if (sessionCaptured) {
    return (
      <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-green-800">
              ✅ X Session Captured Successfully!
            </h3>
            <p className="text-sm text-green-700 mt-1">
              Your X authentication session has been captured and stored. You can now run follower scans that will use your real X login.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium text-blue-800">
            🔐 X Session Authentication Required
          </h3>
          <p className="text-sm text-blue-700 mt-1">
            To access your followers, we need to capture your X login session. This is secure and only stored temporarily.
          </p>
          {error && (
            <p className="text-sm text-red-600 mt-2">
              ❌ {error}
            </p>
          )}
        </div>
        <button
          onClick={captureXSession}
          disabled={capturing}
          className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm px-4 py-2 rounded-lg transition-colors"
        >
          {capturing ? '🔄 Capturing...' : '🔐 Capture X Session'}
        </button>
      </div>
      
      {capturing && (
        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
          <p className="text-sm text-yellow-800">
            <strong>Instructions:</strong>
          </p>
          <ol className="text-sm text-yellow-700 mt-1 list-decimal list-inside space-y-1">
            <li>A popup window will open to X.com</li>
            <li>Login to your X account if not already logged in</li>
            <li>Navigate to your profile or followers page</li>
            <li>The session will be captured automatically</li>
            <li>The popup will close when complete</li>
          </ol>
        </div>
      )}
    </div>
  )
}
