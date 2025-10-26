'use client'

import { useState } from 'react'

interface SessionCookieHelperProps {
  onCookiesProvided: (cookies: { auth_token: string; ct0?: string; twid?: string }) => void
  onSkip: () => void
}

export default function SessionCookieHelper({ onCookiesProvided, onSkip }: SessionCookieHelperProps) {
  const [authToken, setAuthToken] = useState('')
  const [ct0, setCt0] = useState('')
  const [twid, setTwid] = useState('')
  const [showInstructions, setShowInstructions] = useState(false)

  const handleSubmit = () => {
    if (!authToken.trim()) {
      alert('Please provide at least the auth_token cookie')
      return
    }

    onCookiesProvided({
      auth_token: authToken.trim(),
      ct0: ct0.trim() || undefined,
      twid: twid.trim() || undefined
    })
  }

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0">
          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
            <span className="text-blue-600 font-semibold">🍪</span>
          </div>
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-medium text-blue-900 mb-2">
            Enhanced Authentication Available
          </h3>
          <p className="text-blue-700 mb-4">
            For better results, you can provide X.com session cookies. This is optional - you can skip and use standard OAuth authentication.
          </p>

          {!showInstructions ? (
            <div className="space-x-3">
              <button
                onClick={() => setShowInstructions(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
              >
                Provide Session Cookies
              </button>
              <button
                onClick={onSkip}
                className="bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400 transition-colors"
              >
                Skip (Use OAuth)
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-white border border-blue-200 rounded-md p-4">
                <h4 className="font-medium text-blue-900 mb-2">How to get session cookies:</h4>
                <ol className="text-sm text-blue-700 space-y-1 list-decimal list-inside">
                  <li>Open X.com in your browser and make sure you&apos;re logged in</li>
                  <li>Press F12 to open Developer Tools</li>
                  <li>Go to &quot;Application&quot; tab → &quot;Cookies&quot; → &quot;https://x.com&quot;</li>
                  <li>Find and copy the <code className="bg-blue-100 px-1 rounded">auth_token</code> value</li>
                  <li>Optionally copy <code className="bg-blue-100 px-1 rounded">ct0</code> and <code className="bg-blue-100 px-1 rounded">twid</code> values</li>
                </ol>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-blue-900 mb-1">
                    auth_token (Required)
                  </label>
                  <input
                    type="text"
                    value={authToken}
                    onChange={(e) => setAuthToken(e.target.value)}
                    placeholder="Paste auth_token value here..."
                    className="w-full px-3 py-2 border border-blue-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-blue-900 mb-1">
                    ct0 (Optional)
                  </label>
                  <input
                    type="text"
                    value={ct0}
                    onChange={(e) => setCt0(e.target.value)}
                    placeholder="Paste ct0 value here..."
                    className="w-full px-3 py-2 border border-blue-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-blue-900 mb-1">
                    twid (Optional)
                  </label>
                  <input
                    type="text"
                    value={twid}
                    onChange={(e) => setTwid(e.target.value)}
                    placeholder="Paste twid value here..."
                    className="w-full px-3 py-2 border border-blue-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={handleSubmit}
                  disabled={!authToken.trim()}
                  className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                >
                  Use Session Cookies
                </button>
                <button
                  onClick={onSkip}
                  className="bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400 transition-colors"
                >
                  Skip (Use OAuth)
                </button>
                <button
                  onClick={() => setShowInstructions(false)}
                  className="text-blue-600 hover:text-blue-800 px-4 py-2"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}


