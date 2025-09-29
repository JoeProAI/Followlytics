'use client'

import React, { useState } from 'react'
import { useAuthState } from 'react-firebase-hooks/auth'
import { auth } from '@/lib/firebase'

export default function ManualQuickScanner() {
  const [user] = useAuthState(auth)
  const [followers, setFollowers] = useState<string[]>([])
  const [username, setUsername] = useState('JoeProAI')
  const [showInstructions, setShowInstructions] = useState(false)

  const openFollowersPage = () => {
    // Open the followers page
    const popup = window.open(
      `https://x.com/${username}/followers`,
      'x-followers',
      'width=1200,height=800,scrollbars=yes,resizable=yes'
    )

    if (popup) {
      setShowInstructions(true)
      
      // Listen for results
      const messageHandler = (event: MessageEvent) => {
        if (event.data.type === 'FOLLOWER_RESULTS') {
          setFollowers(event.data.followers || [])
          setShowInstructions(false)
          window.removeEventListener('message', messageHandler)
        }
      }
      
      window.addEventListener('message', messageHandler)
    }
  }

  const extractionCode = `
// X Follower Extractor - Paste this in console (F12)
(function() {
  console.log('🔍 Starting follower extraction...');
  
  let followers = [];
  let scrollCount = 0;
  const maxScrolls = 15; // Adjust for more/fewer followers
  
  function extractCurrentBatch() {
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
              !followers.includes(username)) {
            followers.push(username);
            newCount++;
          }
        }
      });
    });
    
    console.log('📊 Found', followers.length, 'followers so far...');
    return newCount;
  }
  
  function quickScan() {
    extractCurrentBatch();
    
    if (scrollCount < maxScrolls) {
      window.scrollTo(0, document.body.scrollHeight);
      scrollCount++;
      setTimeout(quickScan, 2000); // 2 second delay between scrolls
    } else {
      console.log('🎉 Extraction complete! Found', followers.length, 'followers');
      console.log('📋 Followers:', followers);
      
      // Send results back to dashboard
      if (window.opener) {
        window.opener.postMessage({
          type: 'FOLLOWER_RESULTS',
          followers: followers,
          count: followers.length
        }, '*');
        console.log('📤 Results sent to dashboard!');
      } else {
        console.log('📋 Copy this list:', followers.join(', '));
      }
    }
  }
  
  // Start extraction after 3 seconds
  console.log('⏳ Starting in 3 seconds...');
  setTimeout(quickScan, 3000);
})();
  `

  const copyCode = () => {
    navigator.clipboard.writeText(extractionCode).then(() => {
      alert('Code copied to clipboard! Now paste it in the X browser console.')
    }).catch(() => {
      alert('Please manually copy the code from the text area below.')
    })
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-900 mb-2">
          📋 Manual Quick Scanner
        </h2>
        <p className="text-gray-600">
          Simple 3-step process: Open followers page → Paste code in console → Get results
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
        />
      </div>

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
        onClick={openFollowersPage}
        disabled={!username.trim()}
        className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium py-3 px-4 rounded-lg transition-colors mb-4"
      >
        🚀 Step 1: Open Followers Page
      </button>

      {/* Instructions */}
      {showInstructions && (
        <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <h3 className="text-sm font-medium text-yellow-800 mb-2">
            📋 Step 2: Run Extraction Code
          </h3>
          <ol className="text-xs text-yellow-700 list-decimal list-inside space-y-1 mb-3">
            <li>Go to the X followers page that just opened</li>
            <li>Press <kbd className="bg-yellow-200 px-1 rounded">F12</kbd> to open browser console</li>
            <li>Paste the code below and press <kbd className="bg-yellow-200 px-1 rounded">Enter</kbd></li>
            <li>Wait for extraction to complete (about 2-3 minutes)</li>
            <li>Results will appear here automatically!</li>
          </ol>
          
          <button
            onClick={copyCode}
            className="w-full bg-yellow-600 hover:bg-yellow-700 text-white font-medium py-2 px-4 rounded-lg transition-colors mb-3"
          >
            📋 Copy Extraction Code
          </button>
          
          <textarea
            value={extractionCode}
            readOnly
            className="w-full h-32 p-2 text-xs font-mono bg-gray-50 border border-gray-300 rounded resize-none"
            placeholder="Extraction code will appear here..."
          />
        </div>
      )}

      {/* How it works */}
      <div className="mt-4 p-3 bg-gray-50 border border-gray-200 rounded-lg">
        <h4 className="text-sm font-medium text-gray-800 mb-2">📋 How it works:</h4>
        <ol className="text-xs text-gray-600 list-decimal list-inside space-y-1">
          <li><strong>Step 1:</strong> Click "Open Followers Page" (opens X with your login)</li>
          <li><strong>Step 2:</strong> Copy and paste code in browser console (F12)</li>
          <li><strong>Step 3:</strong> Wait 2-3 minutes for automatic extraction</li>
          <li><strong>Results:</strong> Followers appear here automatically</li>
        </ol>
        <p className="text-xs text-blue-600 mt-2">
          💡 This works because the code runs directly on X.com with your session!
        </p>
      </div>
    </div>
  )
}
