'use client'

import React, { useState } from 'react'
import { useAuthState } from 'react-firebase-hooks/auth'
import { auth } from '@/lib/firebase'

interface ScanProgress {
  phase: string
  progress: number
  message: string
  followers?: string[]
  followerCount?: number
}

export default function QuickSessionScanner() {
  const [user] = useAuthState(auth)
  const [scanning, setScanning] = useState(false)
  const [progress, setProgress] = useState<ScanProgress | null>(null)
  const [followers, setFollowers] = useState<string[]>([])
  const [error, setError] = useState('')
  const [username, setUsername] = useState('JoeProAI')

  const startQuickScan = async () => {
    if (!user) return

    setScanning(true)
    setError('')
    setFollowers([])
    setProgress({ phase: 'starting', progress: 10, message: '🚀 Starting quick scan...' })

    try {
      // Step 1: Quick extraction from user's session
      setProgress({ phase: 'extracting', progress: 20, message: '📖 Opening followers page for quick extraction...' })
      
      const extractedFollowers = await quickExtractFollowers(username)
      
      if (extractedFollowers.length === 0) {
        throw new Error('No followers found. Make sure you\'re logged into X.com and the username exists.')
      }

      setFollowers(extractedFollowers)
      setProgress({ 
        phase: 'extracted', 
        progress: 60, 
        message: `✅ Quick extraction complete! Found ${extractedFollowers.length} followers`,
        followers: extractedFollowers,
        followerCount: extractedFollowers.length
      })

      // Step 2: Send to Daytona for analysis (optional supercharging)
      setProgress({ phase: 'analyzing', progress: 70, message: '🚀 Sending to Daytona for analysis...' })
      
      const analysisResult = await sendToDaytonaForAnalysis(extractedFollowers, username)
      
      setProgress({ 
        phase: 'completed', 
        progress: 100, 
        message: `🎉 Scan complete! Found ${extractedFollowers.length} followers + analysis ready`,
        followers: extractedFollowers,
        followerCount: extractedFollowers.length
      })

    } catch (err: any) {
      setError(err.message)
      setProgress(null)
    } finally {
      setScanning(false)
    }
  }

  const quickExtractFollowers = async (targetUsername: string): Promise<string[]> => {
    return new Promise((resolve, reject) => {
      // Open followers page in background
      const extractorWindow = window.open(
        `https://x.com/${targetUsername}/followers`,
        'quick-extractor',
        'width=1200,height=800,scrollbars=yes,resizable=yes'
      )

      if (!extractorWindow) {
        reject(new Error('Popup blocked. Please allow popups.'))
        return
      }

      let extractedFollowers: string[] = []
      let extractionComplete = false

      // Wait for page to load, then start quick extraction
      setTimeout(() => {
        try {
          // Inject quick extraction script
          const script = extractorWindow.document.createElement('script')
          script.textContent = `
            (function() {
              console.log('🔍 Starting quick follower extraction...');
              
              let followers = [];
              let scrollCount = 0;
              const maxScrolls = 10; // Quick scan - only 10 scrolls (about 200-500 followers)
              
              function extractCurrentBatch() {
                const userCells = document.querySelectorAll('[data-testid="UserCell"]');
                let newCount = 0;
                
                userCells.forEach(cell => {
                  const links = cell.querySelectorAll('a[href*="/"]');
                  links.forEach(link => {
                    const href = link.getAttribute('href');
                    if (href && href.startsWith('/') && !href.includes('/status/')) {
                      const username = href.substring(1).split('/')[0];
                      if (username && 
                          username.length > 0 && 
                          username.length < 16 &&
                          /^[a-zA-Z0-9_]+$/.test(username) &&
                          !followers.includes(username)) {
                        followers.push(username);
                        newCount++;
                      }
                    }
                  });
                });
                
                return newCount;
              }
              
              function quickScan() {
                extractCurrentBatch();
                
                window.parent.postMessage({
                  type: 'EXTRACTION_PROGRESS',
                  followers: followers,
                  count: followers.length,
                  scroll: scrollCount,
                  maxScrolls: maxScrolls
                }, '*');
                
                if (scrollCount < maxScrolls) {
                  // Quick scroll
                  window.scrollTo(0, document.body.scrollHeight);
                  scrollCount++;
                  
                  // Continue quickly
                  setTimeout(quickScan, 1500); // Faster scrolling
                } else {
                  // Quick extraction complete
                  window.parent.postMessage({
                    type: 'EXTRACTION_COMPLETE',
                    followers: followers,
                    count: followers.length
                  }, '*');
                }
              }
              
              // Start quick scan after brief delay
              setTimeout(quickScan, 2000);
              
            })();
          `
          extractorWindow.document.head.appendChild(script)
          
        } catch (crossOriginError) {
          reject(new Error('Cannot access X.com - please make sure you\'re logged in'))
        }
      }, 3000)

      // Listen for extraction results
      const messageHandler = (event: MessageEvent) => {
        if (event.data.type === 'EXTRACTION_PROGRESS') {
          setProgress({ 
            phase: 'extracting', 
            progress: 20 + (event.data.scroll / event.data.maxScrolls) * 40, 
            message: `📜 Quick scanning... Found ${event.data.count} followers (${event.data.scroll}/${event.data.maxScrolls} scrolls)`,
            followers: event.data.followers,
            followerCount: event.data.count
          })
        } else if (event.data.type === 'EXTRACTION_COMPLETE') {
          extractedFollowers = event.data.followers || []
          extractionComplete = true
          extractorWindow.close()
          window.removeEventListener('message', messageHandler)
          resolve(extractedFollowers)
        }
      }

      window.addEventListener('message', messageHandler)

      // Timeout after 2 minutes (quick scan)
      setTimeout(() => {
        window.removeEventListener('message', messageHandler)
        if (!extractionComplete) {
          extractorWindow.close()
          if (extractedFollowers.length > 0) {
            resolve(extractedFollowers) // Return what we have
          } else {
            reject(new Error('Quick scan timed out'))
          }
        }
      }, 2 * 60 * 1000)
    })
  }

  const sendToDaytonaForAnalysis = async (followers: string[], targetUsername: string) => {
    try {
      const token = await user?.getIdToken()
      
      const response = await fetch('/api/scan/daytona-analysis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          followers,
          targetUsername,
          analysisType: 'quick_profile_analysis'
        }),
      })

      const result = await response.json()
      
      if (!result.success) {
        console.warn('Daytona analysis failed:', result.error)
        // Don't fail the whole scan - analysis is optional
      }
      
      return result
    } catch (error) {
      console.warn('Daytona analysis error:', error)
      // Analysis failure doesn't fail the scan
      return null
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-900 mb-2">
          ⚡ Quick Session Scanner
        </h2>
        <p className="text-gray-600">
          Uses your existing X login session for fast follower extraction. Quick 2-minute scan gets 200-500 followers.
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
        <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-blue-800">{progress.message}</p>
            <span className="text-sm text-blue-600">{progress.progress}%</span>
          </div>
          <div className="w-full bg-blue-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
              style={{ width: `${progress.progress}%` }}
            ></div>
          </div>
          {progress.followerCount && (
            <p className="text-xs text-blue-700 mt-2">
              Found {progress.followerCount} followers so far...
            </p>
          )}
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
              {followers.slice(0, 50).map((follower, index) => (
                <div key={index} className="text-xs text-green-700 bg-green-100 px-2 py-1 rounded">
                  @{follower}
                </div>
              ))}
              {followers.length > 50 && (
                <div className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded border border-green-200">
                  +{followers.length - 50} more...
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Action Button */}
      <button
        onClick={startQuickScan}
        disabled={scanning || !username.trim()}
        className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium py-3 px-4 rounded-lg transition-colors"
      >
        {scanning ? '🔄 Quick Scanning...' : '⚡ Start Quick Scan (2 min)'}
      </button>

      {/* Info */}
      <div className="mt-4 p-3 bg-gray-50 border border-gray-200 rounded-lg">
        <h4 className="text-sm font-medium text-gray-800 mb-2">⚡ Quick Scan Features:</h4>
        <ul className="text-xs text-gray-600 list-disc list-inside space-y-1">
          <li><strong>Fast:</strong> 2-minute scan gets 200-500 followers</li>
          <li><strong>Uses your session:</strong> No login required</li>
          <li><strong>Background processing:</strong> Won't hold up your browsing</li>
          <li><strong>Daytona analysis:</strong> Optional profile analysis of followers</li>
          <li><strong>No session injection:</strong> Uses your real logged-in state</li>
        </ul>
        <p className="text-xs text-blue-600 mt-2">
          💡 Make sure you're logged into X.com first for best results!
        </p>
      </div>
    </div>
  )
}
