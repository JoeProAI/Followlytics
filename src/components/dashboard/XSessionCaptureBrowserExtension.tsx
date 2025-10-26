'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'

export default function XSessionCaptureBrowserExtension() {
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

  const downloadExtension = () => {
    // Create a zip file download or provide GitHub link
    window.open('https://github.com/JoeProAI/Followlytics/tree/main/browser-extension', '_blank')
  }

  const copyUserId = async () => {
    if (!user) return
    
    try {
      await navigator.clipboard.writeText(user.uid)
      alert('✅ User ID copied to clipboard!')
    } catch (error) {
      // Fallback - show in alert
      alert(`Your User ID: ${user.uid}\n\nCopy this ID to use in the browser extension.`)
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
            Install our simple browser extension to capture your X session with one click.
          </p>
        </div>
        <button
          onClick={() => setShowInstructions(!showInstructions)}
          className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-2 rounded"
        >
          {showInstructions ? 'Hide' : '🔐 Get Extension'}
        </button>
      </div>
      
      {showInstructions && (
        <div className="mt-4 p-4 bg-white border border-blue-200 rounded">
          <h4 className="text-sm font-medium text-blue-800 mb-3">
            📱 Simple Browser Extension (Recommended)
          </h4>
          
          <div className="space-y-4">
            {/* Step 1: Your User ID */}
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-xs font-medium text-blue-600">1</div>
              <div className="flex-1">
                <p className="text-sm text-gray-700 mb-2">
                  <strong>Your User ID:</strong>
                </p>
                <div className="flex items-center space-x-2">
                  <code className="bg-gray-100 px-2 py-1 rounded text-xs font-mono">
                    {user?.uid || 'Loading...'}
                  </code>
                  <button
                    onClick={copyUserId}
                    className="text-blue-600 hover:text-blue-700 text-xs"
                  >
                    📋 Copy
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  You'll need this ID in the extension
                </p>
              </div>
            </div>
            
            {/* Step 2: Download Extension */}
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-xs font-medium text-blue-600">2</div>
              <div className="flex-1">
                <p className="text-sm text-gray-700 mb-2">
                  <strong>Download & Install Extension:</strong>
                </p>
                <button
                  onClick={downloadExtension}
                  className="bg-green-600 hover:bg-green-700 text-white text-sm px-4 py-2 rounded"
                >
                  📥 Download Extension
                </button>
                <p className="text-xs text-gray-500 mt-1">
                  Chrome/Edge: Enable Developer Mode → Load Unpacked
                </p>
              </div>
            </div>
            
            {/* Step 3: Use Extension */}
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-xs font-medium text-blue-600">3</div>
              <div className="flex-1">
                <p className="text-sm text-gray-700 mb-2">
                  <strong>Capture Session:</strong>
                </p>
                <ol className="text-sm text-gray-600 space-y-1 list-decimal list-inside">
                  <li>Go to <a href="https://x.com" target="_blank" className="text-blue-600 hover:underline">x.com</a> and login</li>
                  <li>Click the Followlytics extension icon</li>
                  <li>Enter your User ID (copied above)</li>
                  <li>Click "Capture X Session"</li>
                  <li>Return here - session will be active!</li>
                </ol>
              </div>
            </div>
          </div>
          
          <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded">
            <p className="text-sm text-green-800">
              <strong>✅ Why this is better:</strong>
            </p>
            <ul className="text-sm text-green-700 mt-1 space-y-1">
              <li>• One-click session capture</li>
              <li>• No technical knowledge required</li>
              <li>• Works reliably in all browsers</li>
              <li>• Secure and private</li>
              <li>• Remembers your User ID</li>
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

