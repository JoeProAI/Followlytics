'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { auth } from '@/lib/firebase'

interface ExtractionProgress {
  status: string
  message: string
  percentage: number
  estimatedTimeRemaining?: string
  duration?: string
}

interface DownloadData {
  username: string
  followerCount: number
  csvUrl?: string
  jsonUrl?: string
  excelUrl?: string
  ready: boolean
  progress?: ExtractionProgress
}

function SuccessContent() {
  const searchParams = useSearchParams()
  const sessionId = searchParams?.get('session_id')
  const username = searchParams?.get('username')
  const free = searchParams?.get('free') === 'true'
  
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [downloadData, setDownloadData] = useState<DownloadData | null>(null)
  const [downloading, setDownloading] = useState<string | null>(null)

  useEffect(() => {
    let extractionTriggered = false
    
    // Verify payment and get download links
    const verifyAndGetData = async () => {
      if (!username) {
        setError('Missing username')
        setLoading(false)
        return
      }

      if (!sessionId && !free) {
        setError('Invalid session')
        setLoading(false)
        return
      }

      try {
        // Get download links from backend
        const res = await fetch('/api/export/get-data', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            sessionId: sessionId || 'free',
            username 
          })
        })

        const data = await res.json()

        if (res.status === 202) {
          // Data not ready yet - check if we need to trigger extraction
          if (data.progress?.status === 'pending' && !extractionTriggered) {
            console.log('[Success Page] Triggering extraction for', username)
            extractionTriggered = true
            
            // Trigger extraction in background
            fetch('/api/export/trigger-extraction', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ username })
            }).catch(err => {
              console.error('[Success Page] Failed to trigger extraction:', err)
            })
          }
          
          // Poll again
          setTimeout(verifyAndGetData, 5000) // Check again in 5 seconds
          setLoading(false)
          setDownloadData({ ...data, ready: false })
          return
        }

        if (!res.ok) {
          setError(data.error || 'Failed to get download links')
          setLoading(false)
          return
        }

        setDownloadData(data)
        setLoading(false)
      } catch (err: any) {
        setError('Failed to load data. Please check your email for download link.')
        setLoading(false)
      }
    }

    verifyAndGetData()
  }, [sessionId, username, free])

  const handleDownload = async (format: 'csv' | 'json' | 'excel') => {
    if (!username) return

    setDownloading(format)
    
    try {
      // Get auth token if user is logged in
      const user = auth.currentUser
      const token = user ? await user.getIdToken() : null
      
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      }
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }
      
      const res = await fetch('/api/export/download', {
        method: 'POST',
        headers,
        body: JSON.stringify({ 
          sessionId: sessionId || 'free',
          username,
          format
        })
      })

      if (!res.ok) {
        throw new Error('Download failed')
      }

      // Get the blob and trigger download
      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${username}_followers.${format === 'excel' ? 'xlsx' : format}`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (err) {
      alert('Download failed. Please try again or check your email.')
    } finally {
      setDownloading(null)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-gray-400">Preparing your data...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="max-w-md text-center">
          <h1 className="text-2xl font-light mb-4">Something Went Wrong</h1>
          <p className="text-gray-400 mb-6">{error}</p>
          <Link href="/export" className="text-white underline hover:text-gray-400">
            Try Again
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <header className="border-b border-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Link href="/" className="text-xl font-light hover:text-gray-400 transition-colors">
            Followlytics
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Success Message */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-white/10 mb-6">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          
          <h1 className="text-4xl font-light mb-4">
            {free ? 'Export Ready!' : 'Payment Successful!'}
          </h1>
          
          <p className="text-xl text-gray-400 mb-2">
            Follower data for <span className="text-white">@{username}</span>
          </p>
          
          {downloadData && downloadData.ready && (
            <p className="text-green-400 text-sm font-medium">
              ✓ {downloadData.followerCount.toLocaleString()} followers ready to download
            </p>
          )}
          
          {downloadData && !downloadData.ready && downloadData.progress && (
            <div className="space-y-4 max-w-md mx-auto mt-6">
              <div className="space-y-2">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-yellow-400 font-medium">{downloadData.progress.message}</span>
                  <span className="text-gray-400">{downloadData.progress.percentage}%</span>
                </div>
                <div className="w-full bg-gray-900 rounded-full h-3 overflow-hidden">
                  <div 
                    className="bg-gradient-to-r from-yellow-500 to-yellow-400 h-full transition-all duration-500 ease-out"
                    style={{ width: `${downloadData.progress.percentage}%` }}
                  />
                </div>
                {downloadData.progress.estimatedTimeRemaining && (
                  <p className="text-xs text-gray-500 text-center">
                    Estimated time: {downloadData.progress.estimatedTimeRemaining}
                  </p>
                )}
              </div>
              <p className="text-xs text-gray-500 text-center">
                This page updates automatically. Don't refresh.
              </p>
            </div>
          )}
          
          {!downloadData && !loading && !error && (
            <div className="space-y-4 max-w-md mx-auto mt-6">
              <p className="text-yellow-400 text-sm font-medium animate-pulse text-center">
                ⏳ Starting extraction... Please wait
              </p>
              <div className="w-full bg-gray-900 rounded-full h-3 overflow-hidden">
                <div className="bg-gradient-to-r from-yellow-500 to-yellow-400 h-full w-1/4 animate-pulse" />
              </div>
            </div>
          )}
          
          {!free && (
            <p className="text-sm text-gray-500 mt-2">
              Receipt sent to your email
            </p>
          )}
        </div>

        {/* Download Buttons */}
        {downloadData?.ready && (
          <div className="border border-gray-900 rounded-lg p-8 mb-8">
            <h2 className="text-2xl font-light mb-6 text-center">Download Your Data</h2>
            
            <div className="grid md:grid-cols-3 gap-4">
              <button
                onClick={() => handleDownload('csv')}
                disabled={downloading !== null}
                className="bg-white text-black px-6 py-4 rounded font-medium hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {downloading === 'csv' ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-black"></div>
                    Downloading...
                  </span>
                ) : (
                  <>
                    📊 CSV
                    <div className="text-xs text-gray-600 mt-1">Excel compatible</div>
                  </>
                )}
              </button>

              <button
                onClick={() => handleDownload('json')}
                disabled={downloading !== null}
                className="bg-white text-black px-6 py-4 rounded font-medium hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {downloading === 'json' ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-black"></div>
                    Downloading...
                  </span>
                ) : (
                  <>
                    💻 JSON
                    <div className="text-xs text-gray-600 mt-1">For developers</div>
                  </>
                )}
              </button>

              <button
                onClick={() => handleDownload('excel')}
                disabled={downloading !== null}
                className="bg-white text-black px-6 py-4 rounded font-medium hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {downloading === 'excel' ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-black"></div>
                    Downloading...
                  </span>
                ) : (
                  <>
                    📈 Excel
                    <div className="text-xs text-gray-600 mt-1">.xlsx format</div>
                  </>
                )}
              </button>
            </div>

            <p className="text-center text-sm text-gray-500 mt-6">
              Download link also sent to your email ✉️
            </p>
          </div>
        )}

        {/* What's Next */}
        <div className="border border-gray-900 rounded-lg p-8 mb-8">
          <h2 className="text-2xl font-light mb-6">What Happens Next?</h2>
          
          <div className="space-y-6">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-sm">
                1
              </div>
              <div>
                <h3 className="font-medium mb-1">Data Extraction</h3>
                <p className="text-sm text-gray-400">
                  We're extracting all follower data in the background. This usually takes 5-30 minutes depending on follower count.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-sm">
                2
              </div>
              <div>
                <h3 className="font-medium mb-1">Email Notification</h3>
                <p className="text-sm text-gray-400">
                  You'll receive an email with a download link when your data is ready.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-sm">
                3
              </div>
              <div>
                <h3 className="font-medium mb-1">Download & Export</h3>
                <p className="text-sm text-gray-400">
                  Click the link in your email to download your data in CSV, JSON, or Excel format.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Session Info (for debugging) */}
        {sessionId && (
          <div className="text-center text-xs text-gray-600 mb-8">
            Session ID: {sessionId}
          </div>
        )}

        {/* CTA */}
        <div className="text-center space-y-4">
          <Link 
            href="/export"
            className="inline-block bg-white text-black px-8 py-3 rounded font-medium hover:bg-gray-200 transition-colors"
          >
            Export Another Account
          </Link>
          
          <div>
            <Link 
              href="/"
              className="text-gray-400 hover:text-white transition-colors text-sm"
            >
              Back to Home
            </Link>
          </div>
        </div>

        {/* Support */}
        <div className="mt-12 pt-8 border-t border-gray-900 text-center">
          <p className="text-sm text-gray-500">
            Questions? Email us at{' '}
            <a href="mailto:support@followlytics.com" className="text-white hover:underline">
              support@followlytics.com
            </a>
          </p>
        </div>
      </main>
    </div>
  )
}

export default function ExportSuccess() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    }>
      <SuccessContent />
    </Suspense>
  )
}
