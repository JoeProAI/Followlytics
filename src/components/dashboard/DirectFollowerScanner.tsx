'use client'

import React, { useState, useRef } from 'react'
import { useAuthState } from 'react-firebase-hooks/auth'
import { auth } from '@/lib/firebase'

interface FollowerData {
  username: string
  displayName: string
  profileImage?: string
  isVerified?: boolean
  followerCount?: string
}

interface DirectFollowerScannerProps {
  detectedUsername?: string
}

export default function DirectFollowerScanner({ detectedUsername }: DirectFollowerScannerProps) {
  const [user] = useAuthState(auth)
  const [scanning, setScanning] = useState(false)
  const [followers, setFollowers] = useState<FollowerData[]>([])
  const [progress, setProgress] = useState(0)
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const iframeRef = useRef<HTMLIFrameElement>(null)

  const startDirectScan = async () => {
    if (!user) return

    setScanning(true)
    setError('')
    setFollowers([])
    setProgress(0)
    setStatus('🚀 Starting direct follower scan...')

    try {
      // Use the username from X auth status
      const username = detectedUsername
      
      if (!username) {
        throw new Error('Username not available. Please make sure X Access is authorized above.')
      }

      setStatus(`✅ Using username: @${username}`)
      setProgress(10)

      // Step 2: Start scanning followers
      setStatus('📊 Scanning your followers...')
      await scanFollowersDirectly(username)

    } catch (err: any) {
      setError(err.message)
      setScanning(false)
    }
  }


  const scanFollowersDirectly = async (username: string) => {
    return new Promise<void>((resolve, reject) => {
      // Create iframe to followers page
      const iframe = document.createElement('iframe')
      iframe.src = `https://x.com/${username}/followers`
      iframe.style.display = 'none'
      document.body.appendChild(iframe)

      let extractedFollowers: FollowerData[] = []
      let scrollAttempts = 0
      const maxScrolls = 50 // Limit scrolling to prevent infinite loops

      iframe.onload = () => {
        setStatus('📋 Extracting follower data...')
        setProgress(20)

        const extractFollowers = () => {
          try {
            const script = iframe.contentDocument?.createElement('script')
            if (script && iframe.contentDocument) {
              script.textContent = `
                (function() {
                  try {
                    const followers = [];
                    
                    // Look for follower cells using multiple selectors
                    const followerCells = document.querySelectorAll('[data-testid="UserCell"], [data-testid="user-cell"], .user-cell, [role="button"][tabindex="0"]');
                    
                    for (const cell of followerCells) {
                      try {
                        // Extract username
                        const usernameEl = cell.querySelector('[href*="/"]');
                        if (!usernameEl) continue;
                        
                        const href = usernameEl.getAttribute('href');
                        if (!href || !href.startsWith('/')) continue;
                        
                        const username = href.substring(1);
                        if (!username || username.includes('/') || username === '${username}') continue;
                        
                        // Extract display name
                        const displayNameEl = cell.querySelector('[dir="ltr"]') || cell.querySelector('span');
                        const displayName = displayNameEl ? displayNameEl.textContent?.trim() : username;
                        
                        // Extract profile image
                        const imgEl = cell.querySelector('img');
                        const profileImage = imgEl ? imgEl.src : undefined;
                        
                        // Check if verified
                        const verifiedEl = cell.querySelector('[data-testid="icon-verified"], .verified');
                        const isVerified = !!verifiedEl;
                        
                        followers.push({
                          username,
                          displayName: displayName || username,
                          profileImage,
                          isVerified
                        });
                      } catch (cellError) {
                        console.log('Error processing cell:', cellError);
                      }
                    }
                    
                    window.parent.postMessage({
                      type: 'FOLLOWERS_EXTRACTED',
                      followers: followers,
                      totalFound: followers.length
                    }, '*');
                    
                  } catch (error) {
                    window.parent.postMessage({
                      type: 'EXTRACTION_ERROR',
                      error: error.message
                    }, '*');
                  }
                })();
              `
              iframe.contentDocument.head.appendChild(script)
            }
          } catch (error) {
            reject(error)
          }
        }

        // Start extraction
        setTimeout(extractFollowers, 2000)

        // Set up auto-scrolling to load more followers
        const scrollInterval = setInterval(() => {
          if (scrollAttempts >= maxScrolls) {
            clearInterval(scrollInterval)
            setStatus(`✅ Scan completed! Found ${extractedFollowers.length} followers`)
            setProgress(100)
            setScanning(false)
            document.body.removeChild(iframe)
            resolve()
            return
          }

          try {
            // Scroll down in the iframe
            if (iframe.contentWindow) {
              iframe.contentWindow.scrollTo(0, iframe.contentWindow.document.body.scrollHeight)
              scrollAttempts++
              setProgress(Math.min(20 + (scrollAttempts / maxScrolls) * 70, 90))
              setStatus(`📊 Scrolling and extracting... (${extractedFollowers.length} found)`)
            }
          } catch (scrollError) {
            console.log('Scroll error:', scrollError)
          }

          // Extract followers after each scroll
          setTimeout(extractFollowers, 1000)
        }, 3000)
      }

      // Listen for extraction results
      const messageHandler = (event: MessageEvent) => {
        if (event.data.type === 'FOLLOWERS_EXTRACTED') {
          const newFollowers = event.data.followers.filter((f: FollowerData) => 
            !extractedFollowers.some(existing => existing.username === f.username)
          )
          
          extractedFollowers = [...extractedFollowers, ...newFollowers]
          setFollowers([...extractedFollowers])
          
          console.log(`📊 Extracted ${newFollowers.length} new followers, total: ${extractedFollowers.length}`)
        } else if (event.data.type === 'EXTRACTION_ERROR') {
          window.removeEventListener('message', messageHandler)
          reject(new Error(event.data.error))
        }
      }

      window.addEventListener('message', messageHandler)

      // Cleanup timeout
      setTimeout(() => {
        window.removeEventListener('message', messageHandler)
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe)
        }
        setScanning(false)
        resolve()
      }, 5 * 60 * 1000) // 5 minute timeout
    })
  }

  const sendToSandboxForProcessing = async () => {
    if (!user || followers.length === 0) return

    setStatus('🚀 Sending to sandbox for advanced processing...')
    
    try {
      const token = await user.getIdToken()
      const response = await fetch('/api/scan/process-followers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          followers: followers,
          processingType: 'analysis' // Can be 'analysis', 'comparison', 'export', etc.
        })
      })

      if (response.ok) {
        const result = await response.json()
        setStatus(`✅ Sandbox processing completed! Job ID: ${result.jobId}`)
      } else {
        throw new Error('Failed to start sandbox processing')
      }
    } catch (error: any) {
      setError(`Sandbox processing failed: ${error.message}`)
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          🎯 Direct Follower Scanner
        </h2>
        <p className="text-gray-600">
          Scan your own followers directly from your browser session - no authentication issues!
        </p>
        {detectedUsername && (
          <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded">
            <p className="text-sm text-green-800">
              ✅ Ready to scan: <strong>@{detectedUsername}</strong>
            </p>
          </div>
        )}
        {!detectedUsername && (
          <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded">
            <p className="text-sm text-yellow-800">
              ⚠️ Please authorize X Access above first to get your username
            </p>
          </div>
        )}
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded">
          <p className="text-sm text-red-800">❌ {error}</p>
        </div>
      )}

      {status && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded">
          <p className="text-sm text-blue-800">{status}</p>
          {progress > 0 && (
            <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
          )}
        </div>
      )}

      <div className="flex space-x-4 mb-6">
        <button
          onClick={startDirectScan}
          disabled={scanning || !detectedUsername}
          className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-bold py-3 px-6 rounded-lg transition-colors"
        >
          {scanning ? '🔄 Scanning...' : !detectedUsername ? '⚠️ Authorize X Access First' : '🚀 Start Direct Scan'}
        </button>

        {followers.length > 0 && !scanning && (
          <button
            onClick={sendToSandboxForProcessing}
            className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-6 rounded-lg transition-colors"
          >
            ⚡ Process in Sandbox
          </button>
        )}
      </div>

      {followers.length > 0 && (
        <div className="border-t pt-6">
          <h3 className="text-lg font-semibold mb-4">
            📊 Found {followers.length} Followers
          </h3>
          <div className="max-h-96 overflow-y-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {followers.slice(0, 50).map((follower, index) => (
                <div key={index} className="flex items-center space-x-3 p-2 bg-gray-50 rounded">
                  {follower.profileImage && (
                    <img 
                      src={follower.profileImage} 
                      alt={follower.username}
                      className="w-8 h-8 rounded-full"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      @{follower.username}
                      {follower.isVerified && <span className="text-blue-500 ml-1">✓</span>}
                    </p>
                    <p className="text-xs text-gray-500 truncate">
                      {follower.displayName}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            {followers.length > 50 && (
              <p className="text-sm text-gray-500 mt-4 text-center">
                ... and {followers.length - 50} more followers
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

