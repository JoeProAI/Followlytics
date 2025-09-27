'use client'

import React, { useState } from 'react'
import { useAuthState } from 'react-firebase-hooks/auth'
import { auth } from '@/lib/firebase'

export default function DirectXFollowerScanner() {
  const [user] = useAuthState(auth)
  const [scanning, setScanning] = useState(false)
  const [sessionCaptured, setSessionCaptured] = useState(false)
  const [followers, setFollowers] = useState<string[]>([])
  const [error, setError] = useState('')
  const [progress, setProgress] = useState('')
  const [username, setUsername] = useState('JoeProAI')

  const startDirectScan = async () => {
    if (!user) return

    setScanning(true)
    setError('')
    setFollowers([])
    setProgress('🚀 Starting direct X follower scan...')

    try {
      // Step 1: Capture X session
      setProgress('🔐 Opening X.com to capture session...')
      
      const popup = window.open(
        'https://x.com',
        'x-session-scan',
        'width=1200,height=800,scrollbars=yes,resizable=yes'
      )

      if (!popup) {
        throw new Error('Popup blocked. Please allow popups for this site.')
      }

      // Wait for user to login
      setProgress('⏳ Please sign in to X.com in the popup window...')
      
      await new Promise((resolve, reject) => {
        let sessionCaptured = false
        
        const checkInterval = setInterval(async () => {
          try {
            if (popup.closed) {
              clearInterval(checkInterval)
              if (!sessionCaptured) {
                reject(new Error('Popup closed before session capture'))
              }
              return
            }

            // Try to access popup and check if logged in
            try {
              const popupUrl = popup.location.href
              
              if (popupUrl.includes('x.com') || popupUrl.includes('twitter.com')) {
                // Check if user is logged in
                const script = popup.document.createElement('script')
                script.textContent = `
                  (function() {
                    const loginButton = document.querySelector('[data-testid="loginButton"]');
                    const homeTimeline = document.querySelector('[data-testid="primaryColumn"]');
                    const userMenu = document.querySelector('[data-testid="SideNav_AccountSwitcher_Button"]');
                    
                    const isLoggedIn = !loginButton && (homeTimeline || userMenu);
                    
                    if (isLoggedIn) {
                      window.parent.postMessage({ type: 'LOGGED_IN' }, '*');
                    }
                  })();
                `
                popup.document.head.appendChild(script)
              }
            } catch (crossOriginError) {
              // Expected for cross-origin, continue checking
            }
          } catch (err) {
            // Continue checking
          }
        }, 2000)

        // Listen for login confirmation
        const messageHandler = (event: MessageEvent) => {
          if (event.data.type === 'LOGGED_IN') {
            sessionCaptured = true
            setProgress('✅ X session detected! Navigating to followers page...')
            
            // Navigate to followers page
            popup.location.href = `https://x.com/${username}/followers`
            
            setTimeout(() => {
              setProgress('📜 Loading followers page...')
              
              // Wait a bit more then start extraction
              setTimeout(() => {
                setProgress('⚡ Extracting followers...')
                extractFollowersFromPopup(popup).then(extractedFollowers => {
                  setFollowers(extractedFollowers)
                  setProgress(`🎉 Extraction complete! Found ${extractedFollowers.length} followers`)
                  popup.close()
                  clearInterval(checkInterval)
                  window.removeEventListener('message', messageHandler)
                  resolve(extractedFollowers)
                }).catch(extractError => {
                  popup.close()
                  clearInterval(checkInterval)
                  window.removeEventListener('message', messageHandler)
                  reject(extractError)
                })
              }, 3000)
            }, 2000)
          }
        }
        
        window.addEventListener('message', messageHandler)
        
        // Timeout after 2 minutes
        setTimeout(() => {
          clearInterval(checkInterval)
          window.removeEventListener('message', messageHandler)
          if (!popup.closed) {
            popup.close()
          }
          if (!sessionCaptured) {
            reject(new Error('Session capture timed out'))
          }
        }, 2 * 60 * 1000)
      })

    } catch (err: any) {
      setError(err.message)
      setProgress('')
    } finally {
      setScanning(false)
    }
  }

  const extractFollowersFromPopup = async (popup: Window): Promise<string[]> => {
    return new Promise((resolve, reject) => {
      try {
        // Inject extraction script
        const script = popup.document.createElement('script')
        script.textContent = `
          (function() {
            console.log('🔍 Starting follower extraction...');
            
            let extractedFollowers = [];
            let scrollAttempts = 0;
            const maxScrolls = 20; // Limit scrolling for demo
            
            function extractCurrentFollowers() {
              const userCells = document.querySelectorAll('[data-testid="UserCell"]');
              console.log('Found', userCells.length, 'UserCell elements');
              
              userCells.forEach(cell => {
                const links = cell.querySelectorAll('a[href*="/"]');
                links.forEach(link => {
                  const href = link.getAttribute('href');
                  if (href && href.startsWith('/') && !href.includes('/status/')) {
                    const username = href.substring(1);
                    if (username && 
                        username.length > 0 && 
                        username.length < 16 &&
                        /^[a-zA-Z0-9_]+$/.test(username) &&
                        !extractedFollowers.includes(username)) {
                      extractedFollowers.push(username);
                      console.log('✅ Extracted:', username);
                    }
                  }
                });
              });
              
              return extractedFollowers.length;
            }
            
            function scrollAndExtract() {
              const currentCount = extractCurrentFollowers();
              
              window.parent.postMessage({
                type: 'EXTRACTION_PROGRESS',
                count: currentCount,
                scroll: scrollAttempts
              }, '*');
              
              if (scrollAttempts < maxScrolls) {
                // Scroll down
                window.scrollTo(0, document.body.scrollHeight);
                scrollAttempts++;
                
                // Continue after delay
                setTimeout(scrollAndExtract, 2000);
              } else {
                // Extraction complete
                window.parent.postMessage({
                  type: 'EXTRACTION_COMPLETE',
                  followers: extractedFollowers
                }, '*');
              }
            }
            
            // Start extraction
            setTimeout(scrollAndExtract, 1000);
          })();
        `
        popup.document.head.appendChild(script)
        
        // Listen for extraction results
        const messageHandler = (event: MessageEvent) => {
          if (event.data.type === 'EXTRACTION_PROGRESS') {
            setProgress(`⚡ Extracting... Found ${event.data.count} followers (scroll ${event.data.scroll}/20)`)
          } else if (event.data.type === 'EXTRACTION_COMPLETE') {
            window.removeEventListener('message', messageHandler)
            resolve(event.data.followers || [])
          }
        }
        
        window.addEventListener('message', messageHandler)
        
        // Timeout after 2 minutes
        setTimeout(() => {
          window.removeEventListener('message', messageHandler)
          reject(new Error('Extraction timed out'))
        }, 2 * 60 * 1000)
        
      } catch (error) {
        reject(error)
      }
    })
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-900 mb-2">
          🚀 Direct X Follower Scanner
        </h2>
        <p className="text-gray-600">
          Opens X.com directly, captures your session, navigates to followers page, and extracts followers in real-time.
        </p>
      </div>

      {/* Username Input */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Target Username
        </label>
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Enter username (e.g., JoeProAI)"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          disabled={scanning}
        />
      </div>

      {/* Progress Display */}
      {progress && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800">{progress}</p>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-800">❌ {error}</p>
        </div>
      )}

      {/* Results Display */}
      {followers.length > 0 && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
          <h3 className="text-sm font-medium text-green-800 mb-2">
            🎉 Found {followers.length} Followers:
          </h3>
          <div className="max-h-40 overflow-y-auto">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
              {followers.map((follower, index) => (
                <div key={index} className="text-xs text-green-700 bg-green-100 px-2 py-1 rounded">
                  @{follower}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Action Button */}
      <button
        onClick={startDirectScan}
        disabled={scanning || !username.trim()}
        className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium py-3 px-4 rounded-lg transition-colors"
      >
        {scanning ? '🔄 Scanning in Progress...' : '🚀 Start Direct X Scan'}
      </button>

      {/* Instructions */}
      <div className="mt-4 p-3 bg-gray-50 border border-gray-200 rounded-lg">
        <h4 className="text-sm font-medium text-gray-800 mb-2">📋 How it works:</h4>
        <ol className="text-xs text-gray-600 list-decimal list-inside space-y-1">
          <li>Opens X.com in a popup window</li>
          <li>Detects when you're logged in</li>
          <li>Automatically navigates to /{username}/followers</li>
          <li>Scrolls through the page to load followers</li>
          <li>Extracts usernames in real-time</li>
          <li>Shows progress and results</li>
        </ol>
        <p className="text-xs text-blue-600 mt-2">
          💡 Make sure you're logged into X.com for best results!
        </p>
      </div>
    </div>
  )
}
