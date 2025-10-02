'use client'

import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'

export default function DaytonaFeatures() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')

  const triggerOAuthCapture = async () => {
    if (!user) return
    
    setLoading(true)
    setError('')
    setStatus('🏗️ Creating Daytona sandbox...')
    
    try {
      const token = await user.getIdToken()
      const response = await fetch('/api/daytona/oauth-capture', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ captureType: 'oauth_session' })
      })
      
      const data = await response.json()
      
      if (response.ok) {
        setStatus('✅ Session captured successfully! You can now access advanced analytics.')
      } else {
        setError(data.error || 'Failed to capture session')
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const triggerHybridCapture = async () => {
    if (!user) return
    
    setLoading(true)
    setError('')
    setStatus('🏗️ Creating Daytona sandbox for hybrid capture...')
    
    try {
      const token = await user.getIdToken()
      const response = await fetch('/api/daytona/hybrid-capture', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({})
      })
      
      const data = await response.json()
      
      if (response.ok) {
        setStatus('✅ Hybrid capture complete! Enhanced data available.')
      } else {
        setError(data.error || 'Failed to complete hybrid capture')
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-gradient-to-br from-purple-900/20 to-blue-900/20 border border-purple-500/30 rounded-lg p-6">
      <div className="flex items-start gap-4 mb-6">
        {/* Daytona Logo/Icon */}
        <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-blue-500 rounded-lg flex items-center justify-center flex-shrink-0">
          <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>

        <div className="flex-1">
          <h3 className="text-lg font-medium mb-1 flex items-center gap-2">
            Daytona Browser Automation
            <span className="text-xs px-2 py-0.5 bg-purple-500/20 text-purple-300 border border-purple-500/30 rounded-full">
              ADVANCED
            </span>
          </h3>
          <p className="text-sm text-gray-400">
            Use isolated browser sandboxes to capture authenticated X sessions and access data beyond API limitations
          </p>
        </div>
      </div>

      {/* Status Messages */}
      {status && !error && (
        <div className="mb-4 bg-blue-500/10 border border-blue-500/30 text-blue-300 px-4 py-3 rounded-lg text-sm">
          {status}
        </div>
      )}
      
      {error && (
        <div className="mb-4 bg-red-500/10 border border-red-500/30 text-red-300 px-4 py-3 rounded-lg text-sm">
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* Features Grid */}
      <div className="grid md:grid-cols-2 gap-4 mb-6">
        {/* OAuth Capture */}
        <div className="bg-black/40 border border-gray-700 rounded-lg p-4">
          <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
            <span className="w-2 h-2 bg-green-400 rounded-full"></span>
            OAuth Session Capture
          </h4>
          <p className="text-xs text-gray-400 mb-3">
            Automate OAuth flow in sandbox to capture authenticated session cookies
          </p>
          <button
            onClick={triggerOAuthCapture}
            disabled={loading}
            className="w-full px-4 py-2 bg-purple-500/20 border border-purple-500/30 text-purple-300 hover:bg-purple-500/30 disabled:opacity-50 rounded text-sm transition-colors"
          >
            {loading ? 'Running...' : 'Capture OAuth Session'}
          </button>
        </div>

        {/* Hybrid Capture */}
        <div className="bg-black/40 border border-gray-700 rounded-lg p-4">
          <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
            <span className="w-2 h-2 bg-blue-400 rounded-full"></span>
            Hybrid Data Extraction
          </h4>
          <p className="text-xs text-gray-400 mb-3">
            Combine API data with browser-extracted insights for complete picture
          </p>
          <button
            onClick={triggerHybridCapture}
            disabled={loading}
            className="w-full px-4 py-2 bg-blue-500/20 border border-blue-500/30 text-blue-300 hover:bg-blue-500/30 disabled:opacity-50 rounded text-sm transition-colors"
          >
            {loading ? 'Running...' : 'Run Hybrid Capture'}
          </button>
        </div>
      </div>

      {/* Info Box */}
      <div className="bg-black/40 border border-gray-700 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <svg className="w-5 h-5 text-purple-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="text-xs text-gray-400 space-y-1">
            <p><strong className="text-gray-300">How it works:</strong> Daytona creates isolated browser sandboxes that automate the X login and data extraction process.</p>
            <p><strong className="text-gray-300">Why it's powerful:</strong> Bypasses API rate limits and access restrictions by using your authenticated browser session.</p>
            <p><strong className="text-gray-300">Processing time:</strong> 2-5 minutes per capture depending on data volume.</p>
          </div>
        </div>
      </div>

      {/* Technical Details (Collapsible) */}
      <details className="mt-4">
        <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-400">
          Technical Details
        </summary>
        <div className="mt-2 text-xs text-gray-500 space-y-1 pl-4">
          <p>• Sandboxes run on Daytona cloud infrastructure</p>
          <p>• Uses Playwright for browser automation</p>
          <p>• Session cookies stored encrypted in Firebase</p>
          <p>• 24-hour session validity</p>
          <p>• Automatic cleanup after extraction</p>
        </div>
      </details>
    </div>
  )
}
