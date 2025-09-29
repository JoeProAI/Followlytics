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

      // Simplified approach - just try to capture session after a short delay
      let attempts = 0
      const maxAttempts = 15 // 30 seconds total
      
      const checkInterval = setInterval(async () => {
        attempts++
        
        try {
          // Check if popup is still open
          if (popup.closed) {
            clearInterval(checkInterval)
            setCapturing(false)
            return
          }

          console.log(`🔍 Attempt ${attempts}/${maxAttempts} - trying to capture session...`)
          
          // Try to capture session directly (skip login detection due to cross-origin issues)
          const sessionData = await captureSessionFromPopup(popup)
          
          if (sessionData && sessionData.cookies && Object.keys(sessionData.cookies).length > 0) {
            console.log('✅ Session data captured successfully!')
            
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
              console.log('✅ Session captured and stored successfully!')
            } else {
              throw new Error(result.error || 'Failed to store session')
            }
          } else {
            console.log(`⏳ No session data yet (attempt ${attempts}/${maxAttempts})...`)
            
            if (attempts >= maxAttempts) {
              clearInterval(checkInterval)
              popup.close()
              setCapturing(false)
              setError('Could not capture session. Please make sure you are logged into X.com and try again.')
            }
          }
        } catch (err) {
          console.log(`⚠️ Attempt ${attempts} failed:`, err)
          
          if (attempts >= maxAttempts) {
            clearInterval(checkInterval)
            popup.close()
            setCapturing(false)
            setError('Session capture failed. Please ensure you are logged into X.com and try again.')
          }
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

  const checkIfUserIsLoggedIn = async (popup: Window): Promise<boolean> => {
    return new Promise((resolve) => {
      try {
        // Inject script to check if user is logged in
        const script = popup.document.createElement('script')
        script.textContent = `
          (function() {
            try {
              // Check for authentication indicators - multiple methods
              const loginButton = document.querySelector('[data-testid="loginButton"]');
              const signUpButton = document.querySelector('[data-testid="signupButton"]');
              const homeTimeline = document.querySelector('[data-testid="primaryColumn"]');
              const userMenu = document.querySelector('[data-testid="SideNav_AccountSwitcher_Button"]');
              const tweetButton = document.querySelector('[data-testid="tweetButtonInline"]');
              const profileImage = document.querySelector('[data-testid="DashButton_ProfileSwitcher_Button"]');
              
              // Additional checks for logged in state
              const sideNavNewTweet = document.querySelector('[data-testid="SideNav_NewTweet_Button"]');
              const homeNavLink = document.querySelector('a[href="/home"]');
              const notificationsLink = document.querySelector('a[href="/notifications"]');
              const messagesLink = document.querySelector('a[href="/messages"]');
              const searchInput = document.querySelector('[data-testid="SearchBox_Search_Input"]');
              const avatarButton = document.querySelector('[data-testid="AppTabBar_Profile_Link"]');
              
              // Check URL - if we're on home, explore, notifications etc, we're likely logged in
              const currentUrl = window.location.href;
              const isOnAuthenticatedPage = currentUrl.includes('/home') || 
                                          currentUrl.includes('/notifications') || 
                                          currentUrl.includes('/messages') || 
                                          currentUrl.includes('/explore');
              
              // User is logged in if:
              // 1. No login/signup buttons AND has authenticated elements, OR
              // 2. On an authenticated page (home, notifications, etc), OR  
              // 3. Has navigation elements that only appear when logged in
              const isLoggedIn = (!loginButton && !signUpButton && (homeTimeline || userMenu || tweetButton || profileImage || sideNavNewTweet)) ||
                                isOnAuthenticatedPage ||
                                (homeNavLink && notificationsLink) ||
                                (searchInput && avatarButton);
              
              // Send result back to parent window
              window.parent.postMessage({
                type: 'LOGIN_STATUS_CHECK',
                isLoggedIn: isLoggedIn,
                indicators: {
                  loginButton: !!loginButton,
                  signUpButton: !!signUpButton,
                  homeTimeline: !!homeTimeline,
                  userMenu: !!userMenu,
                  tweetButton: !!tweetButton,
                  profileImage: !!profileImage
                }
              }, '*');
              
            } catch (error) {
              window.parent.postMessage({
                type: 'LOGIN_STATUS_ERROR',
                error: error.message
              }, '*');
            }
          })();
        `
        popup.document.head.appendChild(script)
        
        // Listen for the response
        const messageHandler = (event: MessageEvent) => {
          if (event.data.type === 'LOGIN_STATUS_CHECK') {
            window.removeEventListener('message', messageHandler)
            console.log('🔍 Login status check:', event.data.indicators)
            resolve(event.data.isLoggedIn)
          } else if (event.data.type === 'LOGIN_STATUS_ERROR') {
            window.removeEventListener('message', messageHandler)
            console.log('⚠️ Login status check error:', event.data.error)
            resolve(false)
          }
        }
        
        window.addEventListener('message', messageHandler)
        
        // Timeout after 5 seconds
        setTimeout(() => {
          window.removeEventListener('message', messageHandler)
          resolve(false)
        }, 5000)
        
      } catch (error) {
        console.log('⚠️ Could not check login status:', error)
        resolve(false)
      }
    })
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
            <strong>📋 Simple Instructions:</strong>
          </p>
          <ol className="text-sm text-yellow-700 mt-1 list-decimal list-inside space-y-1">
            <li>X.com popup window opened</li>
            <li>Make sure you're logged into X in the popup</li>
            <li>Wait 30 seconds for automatic session capture</li>
            <li>Popup will close automatically when complete</li>
          </ol>
          <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded">
            <p className="text-xs text-green-700">
              ✅ <strong>System will automatically capture your session</strong> - no manual steps needed!
            </p>
            <p className="text-xs text-green-600 mt-1">
              🔄 Trying every 2 seconds for 30 seconds total
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
