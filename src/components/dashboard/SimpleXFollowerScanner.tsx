'use client'

import React, { useState } from 'react'
import { useAuthState } from 'react-firebase-hooks/auth'
import { auth } from '@/lib/firebase'

export default function SimpleXFollowerScanner() {
  const [user] = useAuthState(auth)
  const [scanning, setScanning] = useState(false)
  const [followers, setFollowers] = useState<string[]>([])
  const [error, setError] = useState('')
  const [progress, setProgress] = useState('')
  const [username, setUsername] = useState('JoeProAI')

  const startSimpleScan = async () => {
    if (!user) return

    setScanning(true)
    setError('')
    setFollowers([])
    setProgress('🚀 Opening X followers page...')

    try {
      // Create the extraction script that will run in the popup
      const extractionScript = `
        <html>
        <head>
          <title>X Follower Extraction</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; background: #f0f0f0; }
            .container { max-width: 800px; margin: 0 auto; background: white; padding: 20px; border-radius: 10px; }
            .progress { background: #e3f2fd; padding: 10px; border-radius: 5px; margin: 10px 0; }
            .followers { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 10px; margin-top: 20px; }
            .follower { background: #e8f5e8; padding: 5px 10px; border-radius: 15px; font-size: 12px; }
            .button { background: #1976d2; color: white; padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer; margin: 5px; }
            .button:hover { background: #1565c0; }
            .button:disabled { background: #ccc; cursor: not-allowed; }
          </style>
        </head>
        <body>
          <div class="container">
            <h2>🔍 X Follower Scanner</h2>
            <div class="progress" id="progress">Ready to scan @${username} followers...</div>
            
            <button class="button" onclick="navigateToFollowers()">📍 Go to Followers Page</button>
            <button class="button" onclick="startExtraction()" id="extractBtn" disabled>⚡ Start Extraction</button>
            <button class="button" onclick="sendResults()">📤 Send Results to Dashboard</button>
            
            <div id="results">
              <p><strong>Found Followers:</strong> <span id="count">0</span></p>
              <div class="followers" id="followersList"></div>
            </div>
          </div>

          <script>
            let extractedFollowers = [];
            let isExtracting = false;
            
            function updateProgress(message) {
              document.getElementById('progress').textContent = message;
              console.log('📊', message);
            }
            
            function navigateToFollowers() {
              updateProgress('🧭 Navigating to followers page...');
              window.location.href = 'https://x.com/${username}/followers';
              
              // Enable extraction button after navigation
              setTimeout(() => {
                document.getElementById('extractBtn').disabled = false;
                updateProgress('✅ Ready to extract! Click "Start Extraction" when page loads.');
              }, 3000);
            }
            
            function startExtraction() {
              if (isExtracting) return;
              isExtracting = true;
              
              updateProgress('⚡ Starting follower extraction...');
              document.getElementById('extractBtn').disabled = true;
              
              extractFollowers();
            }
            
            function extractFollowers() {
              let scrollCount = 0;
              const maxScrolls = 20;
              
              function extractCurrentBatch() {
                const userCells = document.querySelectorAll('[data-testid="UserCell"]');
                let newFollowers = 0;
                
                userCells.forEach(cell => {
                  // Look for profile links
                  const links = cell.querySelectorAll('a[href*="/"]');
                  links.forEach(link => {
                    const href = link.getAttribute('href');
                    if (href && href.startsWith('/') && !href.includes('/status/') && !href.includes('/photo/')) {
                      const username = href.substring(1).split('/')[0];
                      if (username && 
                          username.length > 0 && 
                          username.length < 16 &&
                          /^[a-zA-Z0-9_]+$/.test(username) &&
                          !extractedFollowers.includes(username)) {
                        extractedFollowers.push(username);
                        newFollowers++;
                        
                        // Add to display
                        const followerDiv = document.createElement('div');
                        followerDiv.className = 'follower';
                        followerDiv.textContent = '@' + username;
                        document.getElementById('followersList').appendChild(followerDiv);
                      }
                    }
                  });
                });
                
                document.getElementById('count').textContent = extractedFollowers.length;
                updateProgress(\`⚡ Extracted \${extractedFollowers.length} followers (scroll \${scrollCount}/\${maxScrolls})\`);
                
                return newFollowers;
              }
              
              function scrollAndExtract() {
                const newFollowers = extractCurrentBatch();
                
                if (scrollCount < maxScrolls) {
                  // Scroll down
                  window.scrollTo(0, document.body.scrollHeight);
                  scrollCount++;
                  
                  // Continue after delay
                  setTimeout(scrollAndExtract, 2000);
                } else {
                  // Extraction complete
                  updateProgress(\`🎉 Extraction complete! Found \${extractedFollowers.length} followers\`);
                  isExtracting = false;
                  document.getElementById('extractBtn').disabled = false;
                }
              }
              
              // Start the extraction process
              setTimeout(scrollAndExtract, 1000);
            }
            
            function sendResults() {
              if (extractedFollowers.length === 0) {
                alert('No followers extracted yet. Please run extraction first.');
                return;
              }
              
              // Send results to parent window
              if (window.opener) {
                window.opener.postMessage({
                  type: 'EXTRACTION_RESULTS',
                  followers: extractedFollowers,
                  count: extractedFollowers.length
                }, '*');
                
                updateProgress(\`📤 Sent \${extractedFollowers.length} followers to dashboard!\`);
                
                // Close after sending
                setTimeout(() => {
                  window.close();
                }, 2000);
              } else {
                alert('Cannot send results - parent window not found.');
              }
            }
            
            // Auto-detect if we're on a followers page
            if (window.location.href.includes('/followers')) {
              document.getElementById('extractBtn').disabled = false;
              updateProgress('✅ Followers page detected! Click "Start Extraction" to begin.');
            }
          </script>
        </body>
        </html>
      `

      // Open popup with the extraction script
      const popup = window.open('', 'x-follower-scanner', 'width=1200,height=800,scrollbars=yes,resizable=yes')
      
      if (!popup) {
        throw new Error('Popup blocked. Please allow popups for this site.')
      }

      // Write the extraction script to the popup
      popup.document.write(extractionScript)
      popup.document.close()

      setProgress('📖 Extraction tool opened! Follow the instructions in the popup window.')

      // Listen for results from popup
      const messageHandler = (event: MessageEvent) => {
        if (event.data.type === 'EXTRACTION_RESULTS') {
          setFollowers(event.data.followers || [])
          setProgress(`🎉 Received ${event.data.count} followers from extraction tool!`)
          setScanning(false)
          window.removeEventListener('message', messageHandler)
        }
      }

      window.addEventListener('message', messageHandler)

      // Cleanup after 10 minutes
      setTimeout(() => {
        window.removeEventListener('message', messageHandler)
        if (scanning) {
          setScanning(false)
          setProgress('⏰ Scan timed out after 10 minutes')
        }
      }, 10 * 60 * 1000)

    } catch (err: any) {
      setError(err.message)
      setProgress('')
      setScanning(false)
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-900 mb-2">
          🎯 Simple X Follower Scanner
        </h2>
        <p className="text-gray-600">
          Opens a dedicated extraction tool that navigates to X and extracts followers step-by-step.
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
        onClick={startSimpleScan}
        disabled={scanning || !username.trim()}
        className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium py-3 px-4 rounded-lg transition-colors"
      >
        {scanning ? '🔄 Extraction Tool Open...' : '🎯 Open Extraction Tool'}
      </button>

      {/* Instructions */}
      <div className="mt-4 p-3 bg-gray-50 border border-gray-200 rounded-lg">
        <h4 className="text-sm font-medium text-gray-800 mb-2">📋 How it works:</h4>
        <ol className="text-xs text-gray-600 list-decimal list-inside space-y-1">
          <li>Opens a dedicated extraction tool in a popup</li>
          <li>Click "Go to Followers Page" to navigate to X</li>
          <li>Click "Start Extraction" to begin scanning</li>
          <li>Watch followers appear in real-time</li>
          <li>Click "Send Results to Dashboard" when done</li>
          <li>Results appear here automatically</li>
        </ol>
        <p className="text-xs text-blue-600 mt-2">
          💡 This avoids cross-origin issues by running the extraction script directly in the X domain!
        </p>
      </div>
    </div>
  )
}
