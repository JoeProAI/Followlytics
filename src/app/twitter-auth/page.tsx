'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'

function TwitterAuthContent() {
  const { user } = useAuth()
  const searchParams = useSearchParams()
  const scanId = searchParams.get('scanId')
  const [status, setStatus] = useState<'loading' | 'ready' | 'capturing' | 'complete' | 'error'>('loading')
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!scanId) {
      setStatus('error')
      setMessage('No scan ID provided')
      return
    }

    setStatus('ready')
    setMessage('Please sign into Twitter in a new tab, then return here to continue.')
  }, [scanId])

  const captureSession = async () => {
    if (!user || !scanId) return

    setStatus('capturing')
    setMessage('Capturing your Twitter session...')

    try {
      // This is a simplified approach - in reality, we'd need to implement
      // a more sophisticated session capture mechanism
      const token = await user.getIdToken()
      
      // For now, we'll simulate session capture
      const response = await fetch('/api/auth/session-capture', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          scanId,
          sessionData: {
            // This would contain the actual session cookies
            captured: true,
            timestamp: new Date().toISOString()
          }
        }),
      })

      if (response.ok) {
        setStatus('complete')
        setMessage('✅ Session captured! You can close this tab and return to the dashboard.')
        
        // Close this tab after a delay
        setTimeout(() => {
          window.close()
        }, 3000)
      } else {
        throw new Error('Failed to capture session')
      }
    } catch (error) {
      setStatus('error')
      setMessage(`Failed to capture session: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading...</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              Twitter Authentication
            </h2>
            
            {status === 'ready' && (
              <div className="space-y-4">
                <p className="text-gray-600">
                  To continue your follower scan, please:
                </p>
                <ol className="text-left text-sm text-gray-700 space-y-2">
                  <li>1. <a href="https://x.com/login" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800">Sign into Twitter</a> in a new tab</li>
                  <li>2. Return to this tab</li>
                  <li>3. Click the button below to continue</li>
                </ol>
                <button
                  onClick={captureSession}
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Continue Scan
                </button>
              </div>
            )}

            {status === 'capturing' && (
              <div className="space-y-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="text-gray-600">{message}</p>
              </div>
            )}

            {status === 'complete' && (
              <div className="space-y-4">
                <div className="text-green-600 text-4xl">✅</div>
                <p className="text-green-600 font-semibold">{message}</p>
                <p className="text-sm text-gray-500">This tab will close automatically...</p>
              </div>
            )}

            {status === 'error' && (
              <div className="space-y-4">
                <div className="text-red-600 text-4xl">❌</div>
                <p className="text-red-600">{message}</p>
                <button
                  onClick={() => window.close()}
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  Close this tab
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function TwitterAuthPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading...</p>
            </div>
          </div>
        </div>
      </div>
    }>
      <TwitterAuthContent />
    </Suspense>
  )
}
