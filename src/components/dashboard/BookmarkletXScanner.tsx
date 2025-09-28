'use client'

import React, { useState } from 'react'
import { useAuthState } from 'react-firebase-hooks/auth'
import { auth } from '@/lib/firebase'

export default function BookmarkletXScanner() {
  const [user] = useAuthState(auth)
  const [scanning, setScanning] = useState(false)
  const [followers, setFollowers] = useState<string[]>([])
  const [error, setError] = useState('')
  const [progress, setProgress] = useState('')
  const [username, setUsername] = useState('JoeProAI')

  const createBookmarklet = () => {
    const extractionCode = `
      (function() {
        // Create extraction UI overlay
        const overlay = document.createElement('div');
        overlay.id = 'follower-extractor-overlay';
        overlay.style.cssText = \`
          position: fixed;
          top: 20px;
          right: 20px;
          width: 350px;
          background: white;
          border: 2px solid #1976d2;
          border-radius: 10px;
          padding: 20px;
          z-index: 10000;
          box-shadow: 0 4px 20px rgba(0,0,0,0.3);
          font-family: Arial, sans-serif;
          font-size: 14px;
        \`;
        
        overlay.innerHTML = \`
          <div style="margin-bottom: 15px;">
            <h3 style="margin: 0 0 10px 0; color: #1976d2;">🔍 X Follower Extractor</h3>
            <div id="status" style="background: #e3f2fd; padding: 8px; border-radius: 5px; margin-bottom: 10px;">
              Ready to extract followers...
            </div>
          </div>
          
          <div style="margin-bottom: 15px;">
            <button id="startBtn" style="background: #1976d2; color: white; border: none; padding: 10px 15px; border-radius: 5px; cursor: pointer; width: 100%; margin-bottom: 10px;">
              ⚡ Start Extraction
            </button>
            <button id="stopBtn" style="background: #d32f2f; color: white; border: none; padding: 8px 15px; border-radius: 5px; cursor: pointer; width: 100%; margin-bottom: 10px;" disabled>
              ⏹️ Stop Extraction
            </button>
            <button id="sendBtn" style="background: #388e3c; color: white; border: none; padding: 8px 15px; border-radius: 5px; cursor: pointer; width: 100%;" disabled>
              📤 Send to Dashboard
            </button>
          </div>
          
          <div>
            <div style="font-weight: bold; margin-bottom: 5px;">Found: <span id="count">0</span> followers</div>
            <div id="followers" style="max-height: 200px; overflow-y: auto; background: #f5f5f5; padding: 10px; border-radius: 5px; font-size: 12px;">
              No followers extracted yet...
            </div>
          </div>
          
          <button id="closeBtn" style="position: absolute; top: 5px; right: 10px; background: none; border: none; font-size: 18px; cursor: pointer;">×</button>
        \`;
        
        document.body.appendChild(overlay);
        
        let extractedFollowers = [];
        let isExtracting = false;
        let extractionInterval;
        
        function updateStatus(message) {
          document.getElementById('status').textContent = message;
          console.log('📊 Follower Extractor:', message);
        }
        
        function updateFollowersList() {
          const followersDiv = document.getElementById('followers');
          const countSpan = document.getElementById('count');
          
          countSpan.textContent = extractedFollowers.length;
          
          if (extractedFollowers.length === 0) {
            followersDiv.textContent = 'No followers extracted yet...';
          } else {
            followersDiv.innerHTML = extractedFollowers.map(f => 
              \`<span style="display: inline-block; background: #e8f5e8; padding: 2px 6px; margin: 2px; border-radius: 10px;">@\${f}</span>\`
            ).join('');
          }
        }
        
        function extractCurrentFollowers() {
          const userCells = document.querySelectorAll('[data-testid="UserCell"]');
          let newCount = 0;
          
          userCells.forEach(cell => {
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
                  newCount++;
                }
              }
            });
          });
          
          return newCount;
        }
        
        function startExtraction() {
          if (isExtracting) return;
          
          isExtracting = true;
          document.getElementById('startBtn').disabled = true;
          document.getElementById('stopBtn').disabled = false;
          
          updateStatus('⚡ Extracting followers...');
          
          let scrollCount = 0;
          const maxScrolls = 30;
          
          extractionInterval = setInterval(() => {
            const newFollowers = extractCurrentFollowers();
            updateFollowersList();
            
            if (scrollCount < maxScrolls) {
              // Scroll down to load more
              window.scrollTo(0, document.body.scrollHeight);
              scrollCount++;
              updateStatus(\`⚡ Extracting... Found \${extractedFollowers.length} followers (scroll \${scrollCount}/\${maxScrolls})\`);
            } else {
              stopExtraction();
            }
          }, 2000);
        }
        
        function stopExtraction() {
          isExtracting = false;
          clearInterval(extractionInterval);
          
          document.getElementById('startBtn').disabled = false;
          document.getElementById('stopBtn').disabled = true;
          document.getElementById('sendBtn').disabled = false;
          
          updateStatus(\`🎉 Extraction complete! Found \${extractedFollowers.length} followers\`);
        }
        
        function sendToDashboard() {
          if (extractedFollowers.length === 0) {
            alert('No followers to send!');
            return;
          }
          
          // Try to send to parent window (if opened from dashboard)
          if (window.opener) {
            window.opener.postMessage({
              type: 'BOOKMARKLET_RESULTS',
              followers: extractedFollowers,
              count: extractedFollowers.length,
              source: 'bookmarklet'
            }, '*');
            
            updateStatus(\`📤 Sent \${extractedFollowers.length} followers to dashboard!\`);
          } else {
            // Fallback: copy to clipboard
            const followersText = extractedFollowers.map(f => '@' + f).join('\\n');
            navigator.clipboard.writeText(followersText).then(() => {
              updateStatus('📋 Followers copied to clipboard!');
            }).catch(() => {
              // Show results in alert as final fallback
              alert('Followers extracted:\\n\\n' + followersText);
            });
          }
        }
        
        function closeExtractor() {
          document.body.removeChild(overlay);
        }
        
        // Event listeners
        document.getElementById('startBtn').onclick = startExtraction;
        document.getElementById('stopBtn').onclick = stopExtraction;
        document.getElementById('sendBtn').onclick = sendToDashboard;
        document.getElementById('closeBtn').onclick = closeExtractor;
        
        // Auto-detect if we're on a followers page
        if (window.location.href.includes('/followers')) {
          updateStatus('✅ Followers page detected! Click "Start Extraction" to begin.');
        } else {
          updateStatus('⚠️ Navigate to a followers page first, then click "Start Extraction".');
        }
        
      })();
    `;

    return `javascript:${encodeURIComponent(extractionCode)}`;
  }

  const openFollowersPageWithBookmarklet = () => {
    setScanning(true)
    setError('')
    setFollowers([])
    setProgress('🚀 Opening followers page with extraction tool...')

    // Open the followers page
    const popup = window.open(`https://x.com/${username}/followers`, 'x-followers-extractor', 'width=1200,height=800,scrollbars=yes,resizable=yes')
    
    if (!popup) {
      setError('Popup blocked. Please allow popups for this site.')
      setScanning(false)
      return
    }

    // Wait for page to load, then inject the bookmarklet
    setTimeout(() => {
      try {
        // Inject the extraction script
        const script = popup.document.createElement('script')
        script.textContent = `
          (function() {
            ${createBookmarklet().replace('javascript:', '').replace(/^[^(]*/, '')}
          })();
        `
        popup.document.head.appendChild(script)
        setProgress('✅ Extraction tool loaded! Use the blue panel on the right side of the X page.')
      } catch (crossOriginError) {
        // Fallback: show bookmarklet instructions
        setProgress('⚠️ Please manually run the extraction tool. Copy the bookmarklet below and paste it in the browser address bar.')
      }
    }, 3000)

    // Listen for results
    const messageHandler = (event: MessageEvent) => {
      if (event.data.type === 'BOOKMARKLET_RESULTS') {
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
  }

  const copyBookmarklet = () => {
    const bookmarklet = createBookmarklet()
    navigator.clipboard.writeText(bookmarklet).then(() => {
      setProgress('📋 Bookmarklet copied to clipboard! Paste it in your browser address bar on any X followers page.')
    }).catch(() => {
      setError('Failed to copy to clipboard')
    })
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-900 mb-2">
          🔖 Bookmarklet X Follower Scanner
        </h2>
        <p className="text-gray-600">
          Injects an extraction tool directly into X.com that stays open while you browse followers.
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

      {/* Action Buttons */}
      <div className="space-y-3">
        <button
          onClick={openFollowersPageWithBookmarklet}
          disabled={scanning || !username.trim()}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium py-3 px-4 rounded-lg transition-colors"
        >
          {scanning ? '🔄 Extraction Tool Active...' : '🚀 Open Followers Page + Extractor'}
        </button>
        
        <button
          onClick={copyBookmarklet}
          className="w-full bg-purple-600 hover:bg-purple-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
        >
          📋 Copy Bookmarklet (Manual Use)
        </button>
      </div>

      {/* Instructions */}
      <div className="mt-4 p-3 bg-gray-50 border border-gray-200 rounded-lg">
        <h4 className="text-sm font-medium text-gray-800 mb-2">📋 How it works:</h4>
        <ol className="text-xs text-gray-600 list-decimal list-inside space-y-1">
          <li>Click "Open Followers Page + Extractor" to open X with the tool</li>
          <li>Look for the blue extraction panel on the right side</li>
          <li>Click "Start Extraction" to begin scanning</li>
          <li>Watch followers appear in real-time</li>
          <li>Click "Send to Dashboard" when done</li>
          <li>Results appear here automatically</li>
        </ol>
        <p className="text-xs text-blue-600 mt-2">
          💡 The extraction tool stays open as an overlay while you browse X!
        </p>
      </div>
    </div>
  )
}
