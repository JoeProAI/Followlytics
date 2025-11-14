'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { auth } from '@/lib/firebase'

interface AnalysisProgress {
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
  progress?: AnalysisProgress
  gamma?: {
    gammaId: string
    url: string
    status: string
  }
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
  const [gammaStatus, setGammaStatus] = useState<{
    gammaId?: string
    status?: string
    url?: string
    generating?: boolean
    requiresPayment?: boolean
    amount?: number
  }>({})
  
  const [hasLoadedFromAPI, setHasLoadedFromAPI] = useState(false)

  // Save to localStorage whenever gammaStatus changes
  useEffect(() => {
    if (typeof window !== 'undefined' && gammaStatus && Object.keys(gammaStatus).length > 0) {
      localStorage.setItem('gammaStatus', JSON.stringify(gammaStatus))
    }
  }, [gammaStatus])

  // Load from localStorage ONLY on initial mount, then wait for API
  useEffect(() => {
    if (!hasLoadedFromAPI && typeof window !== 'undefined') {
      const saved = localStorage.getItem('gammaStatus')
      if (saved) {
        try {
          const parsed = JSON.parse(saved)
          // Only load if actively generating (has gammaId but no url)
          if (parsed.gammaId && parsed.generating && !parsed.url) {
            console.log('[Success Page] Resuming Gamma polling from localStorage:', parsed.gammaId)
            setGammaStatus(parsed)
            pollGammaStatus(parsed.gammaId)
          }
        } catch (e) {
          console.error('[Success Page] Failed to parse saved gamma status:', e)
        }
      }
    }
  }, [hasLoadedFromAPI])
  
  // Resume polling if we have a gammaId and it's still processing
  useEffect(() => {
    const resumePolling = async () => {
      if (hasLoadedFromAPI && gammaStatus.gammaId && gammaStatus.generating && !gammaStatus.url) {
        console.log('[Success Page] Resuming Gamma polling for:', gammaStatus.gammaId)
        pollGammaStatus(gammaStatus.gammaId)
      }
    }
    resumePolling()
  }, []) // Run once on mount

  // Poll for Gamma completion
  const pollGammaStatus = async (gammaId: string) => {
    try {
      console.log('[Gamma Poll] Checking status for:', gammaId)
      const res = await fetch(`/api/gamma/status/${gammaId}`)
      const data = await res.json()
      
      console.log('[Gamma Poll] Response:', data)
      
      // Check for completed with URL
      if (data.urls && data.urls.view) {
        console.log('[Gamma Poll] ✅ PRESENTATION READY! URL:', data.urls.view)
        setGammaStatus({
          gammaId,
          status: 'completed',
          url: data.urls.view,
          generating: false
        })
      } else if (data.status === 'failed') {
        console.error('[Gamma Poll] Generation failed')
        setGammaStatus({
          gammaId,
          status: 'failed',
          generating: false
        })
      } else {
        // Still processing, check again in 5 seconds
        console.log('[Gamma Poll] Still processing, checking again in 5s...')
        setTimeout(() => pollGammaStatus(gammaId), 5000)
      }
    } catch (err) {
      console.error('[Gamma Poll] Error:', err)
      // Retry in 10 seconds
      setTimeout(() => pollGammaStatus(gammaId), 10000)
    }
  }

  useEffect(() => {
    let analysisTriggered = false
    let gammaTriggered = false
    
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
          // Data not ready yet - check if we need to trigger analysis
          if (data.progress?.status === 'pending' && !analysisTriggered) {
            console.log('[Success Page] Triggering analysis for', username)
            analysisTriggered = true
            
            // Trigger analysis in background with userId
            const user = auth.currentUser
            fetch('/api/export/trigger-extraction', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ 
                username,
                userId: user?.uid // Send userId so it can check dashboard data
              })
            }).catch(err => {
              console.error('[Success Page] Failed to trigger analysis:', err)
            })
            
            // ALSO trigger auto-Gamma generation in parallel (only once) - works with OR without login
            if ((user || sessionId) && !gammaTriggered) {
              gammaTriggered = true
              console.log('[Success Page] Starting Gamma generation...')
              setGammaStatus({ generating: true })
              
              const triggerGamma = async () => {
                try {
                  let token = ''
                  if (user) {
                    token = await user.getIdToken()
                  }
                  
                  const gammaPayload = {
                    username,
                    customInstructions: data.customInstructions || 'AI and Tech',
                    gammaStyle: data.gammaStyle || 'professional',
                    sessionId: sessionId
                  }
                  console.log('[Success Page] Gamma payload:', gammaPayload)
                  
                  const headers: any = {
                    'Content-Type': 'application/json'
                  }
                  if (token) {
                    headers['Authorization'] = `Bearer ${token}`
                  }
                  
                  const res = await fetch('/api/gamma/auto-generate', {
                    method: 'POST',
                    headers,
                    body: JSON.stringify(gammaPayload)
                  })
                  
                  console.log('[Success Page] Gamma response status:', res.status)
                  const gammaData = await res.json()
                  console.log('[Success Page] Gamma response:', gammaData)
                  
                  if (gammaData.success) {
                    console.log('[Success Page] Gamma generation started:', gammaData.gammaId)
                    setGammaStatus({
                      gammaId: gammaData.gammaId,
                      status: 'processing',
                      generating: true
                    })
                    pollGammaStatus(gammaData.gammaId)
                  } else if (gammaData.requiresPayment) {
                    console.log(`[Success Page] Gamma requires $${gammaData.amount} payment`)
                    setGammaStatus({ 
                      generating: false, 
                      status: 'payment_required',
                      requiresPayment: true,
                      amount: gammaData.amount || 2.99
                    })
                  } else {
                    console.error('[Success Page] Gamma failed:', gammaData.error)
                    setGammaStatus({ generating: false, status: 'failed' })
                  }
                } catch (err) {
                  console.error('[Success Page] Gamma generation error:', err)
                  setGammaStatus({ generating: false, status: 'failed' })
                }
              }
              
              triggerGamma()
            } else {
              console.log('[Success Page] No user/sessionId or already triggered - skipping Gamma')
            }
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
        setHasLoadedFromAPI(true) // Mark that we've loaded from API
        
        // Check if there's already a completed Gamma presentation
        if (data.gamma && data.gamma.url) {
          console.log('[Success Page] Found existing Gamma presentation:', data.gamma.url)
          setGammaStatus({
            gammaId: data.gamma.gammaId,
            url: data.gamma.url,
            status: 'complete',
            generating: false
          })
          gammaTriggered = true // Mark as handled
          // Clear localStorage since we have fresh data
          if (typeof window !== 'undefined') {
            localStorage.removeItem('gammaStatus')
          }
        }
        
        // Trigger Gamma for ALL users (even not logged in, using sessionId) - only if not already exists
        const user = auth.currentUser
        console.log('[Success Page] Gamma check:', { 
          hasUser: !!user, 
          hasSessionId: !!sessionId,
          gammaTriggered, 
          hasData: !!data, 
          existingGamma: !!data.gamma,
          free,
          shouldTrigger: !!(!gammaTriggered && data && !data.gamma && (user || sessionId))
        })
        
        // Trigger Gamma if: (1) user is logged in OR has valid sessionId, AND (2) Gamma hasn't been triggered, AND (3) no existing Gamma
        if (!gammaTriggered && data && !data.gamma && (user || sessionId)) {
          gammaTriggered = true
          console.log('[Success Page] ✅ TRIGGERING GAMMA GENERATION')
          setGammaStatus({ generating: true })
          
          const triggerGamma = async () => {
            try {
              let token = ''
              if (user) {
                token = await user.getIdToken()
              }
              
              const gammaPayload = {
                username,
                customInstructions: data.customInstructions || 'AI and Tech',
                gammaStyle: data.gammaStyle || 'professional',
                sessionId: sessionId
              }
              console.log('[Success Page] Gamma payload:', gammaPayload)
              
              const headers: any = {
                'Content-Type': 'application/json'
              }
              if (token) {
                headers['Authorization'] = `Bearer ${token}`
              }
              
              const res = await fetch('/api/gamma/auto-generate', {
                method: 'POST',
                headers,
                body: JSON.stringify(gammaPayload)
              })
              
              console.log('[Success Page] Gamma response status:', res.status)
              const gammaData = await res.json()
              console.log('[Success Page] Gamma response:', gammaData)
              
              if (gammaData.success) {
                console.log('[Success Page] Gamma generation started:', gammaData.gammaId)
                setGammaStatus({
                  gammaId: gammaData.gammaId,
                  status: 'processing',
                  generating: true
                })
                pollGammaStatus(gammaData.gammaId)
              } else if (gammaData.requiresPayment) {
                console.log(`[Success Page] Gamma requires $${gammaData.amount} payment`)
                setGammaStatus({ 
                  generating: false, 
                  status: 'payment_required',
                  requiresPayment: true,
                  amount: gammaData.amount || 2.99
                })
              } else {
                console.error('[Success Page] Gamma failed:', gammaData.error)
                setGammaStatus({ generating: false, status: 'failed' })
              }
            } catch (err) {
              console.error('[Success Page] Gamma generation error:', err)
              setGammaStatus({ generating: false, status: 'failed' })
            }
          }
          
          triggerGamma()
        }
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

      <main className="max-w-3xl 2xl:max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {/* Success Message */}
        <div className="text-center mb-8 sm:mb-12">
          <div className="inline-flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-white/10 mb-4 sm:mb-6">
            <svg className="w-6 h-6 sm:w-8 sm:h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          
          <h1 className="text-2xl sm:text-4xl font-light mb-3 sm:mb-4 px-4">
            {free ? 'Export Ready!' : 'Payment Successful!'}
          </h1>
          
          <p className="text-lg sm:text-xl text-gray-400 mb-2 px-4">
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
                ⏳ Starting analysis... Please wait
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
          <div className="border border-gray-900 rounded-lg p-4 sm:p-6 lg:p-8 mb-6 sm:mb-8">
            <h2 className="text-xl sm:text-2xl font-light mb-4 sm:mb-6 text-center">Download Your Data</h2>
            
            {/* Disclaimer */}
            <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-blue-900/30 border border-blue-700/50 rounded-lg">
              <p className="text-xs sm:text-sm text-blue-300 text-center">
                <span className="font-semibold">ℹ️ Note:</span> The analyzed follower count may differ from your Twitter follower count due to private, protected, suspended, or deleted accounts that cannot be accessed via API.
              </p>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
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
                    CSV
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
                    JSON
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
                    Excel
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

        {/* Presentation Generation Status */}
        {(gammaStatus.generating || gammaStatus.url || gammaStatus.requiresPayment) && (
          <div className="border border-gray-900 rounded-lg p-4 sm:p-6 lg:p-8 mb-6 sm:mb-8">
            <h2 className="text-xl sm:text-2xl font-light mb-4 sm:mb-6">AI Presentation</h2>
            
            {gammaStatus.requiresPayment && (
              <div className="space-y-4">
                <div className="bg-gradient-to-r from-purple-900/30 to-blue-900/30 border border-purple-700/50 rounded-lg p-4 sm:p-6">
                  <div className="flex items-start gap-3 mb-4">
                    <div className="text-2xl sm:text-3xl">🔥</div>
                    <div>
                      <h3 className="text-sm sm:text-base font-semibold mb-1">Launch Special: AI Presentation</h3>
                      <p className="text-xs sm:text-sm text-gray-400">Professional audience intelligence report (normally $4.99)</p>
                    </div>
                  </div>
                  
                  <div className="bg-black/50 rounded-lg p-4 mb-4">
                    <div className="text-sm text-gray-400 mb-2">Includes:</div>
                    <ul className="text-sm space-y-1">
                      <li className="flex items-center gap-2">
                        <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        AI-powered audience insights
                      </li>
                      <li className="flex items-center gap-2">
                        <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Top influencer analysis
                      </li>
                      <li className="flex items-center gap-2">
                        <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Professional slides & charts
                      </li>
                      <li className="flex items-center gap-2">
                        <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Shareable presentation link
                      </li>
                    </ul>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-2xl font-bold">${gammaStatus.amount}</div>
                      <div className="text-xs text-gray-500">one-time upgrade</div>
                    </div>
                    <button
                      className="bg-gradient-to-r from-purple-500 to-blue-500 text-white px-6 py-3 rounded-lg font-medium hover:from-purple-600 hover:to-blue-600 transition-all"
                      onClick={() => {
                        // TODO: Trigger Stripe payment for Gamma
                        window.location.href = `/gamma/upgrade?username=${username}&session_id=${sessionId}`
                      }}
                    >
                      Upgrade Now
                    </button>
                  </div>
                </div>
                
                <p className="text-xs text-center text-gray-500">
                  💡 Accounts with 500+ followers get presentations included free!
                </p>
              </div>
            )}
            
            {gammaStatus.generating && !gammaStatus.url && (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <svg className="w-6 h-6 text-gray-400 animate-pulse" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                    </svg>
                    <div className="absolute inset-0 animate-ping">
                      <svg className="w-6 h-6 text-gray-400 opacity-50" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                      </svg>
                    </div>
                  </div>
                  <div>
                    <p className="text-gray-300 text-sm font-medium">Generating your presentation</p>
                    <p className="text-gray-500 text-xs">Analyzing audience insights • Up to 2 minutes</p>
                  </div>
                </div>
                <div className="relative w-full bg-gray-900 rounded-full h-2 overflow-hidden border border-gray-800">
                  <div className="absolute inset-0 bg-gradient-to-r from-gray-800 via-gray-700 to-gray-800 animate-pulse" />
                  <div 
                    className="relative h-full bg-gradient-to-r from-white via-gray-300 to-white transition-all duration-1000 ease-in-out" 
                    style={{ 
                      width: '60%',
                      animation: 'shimmer 2s infinite linear',
                      backgroundSize: '200% 100%'
                    }} 
                  />
                </div>
              </div>
            )}
            
            {gammaStatus.url && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-green-400 mb-3">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="font-medium">Ready</span>
                </div>
                <a
                  href={gammaStatus.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block w-full bg-white text-black py-3 px-6 rounded font-medium text-center hover:bg-gray-200 transition-colors"
                >
                  View Presentation
                </a>
              </div>
            )}
            
            {gammaStatus.status === 'failed' && (
              <p className="text-red-400 text-sm">Generation failed</p>
            )}
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
                <h3 className="font-medium mb-1">Data Analysis</h3>
                <p className="text-sm text-gray-400">
                  We're analyzing all follower data in the background. This usually takes 5-30 minutes depending on follower count.
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
        <div className="text-center space-y-4 px-4">
          <Link 
            href="/export"
            className="inline-block bg-white text-black px-6 sm:px-8 py-2.5 sm:py-3 rounded font-medium hover:bg-gray-200 transition-colors text-sm sm:text-base"
          >
            Export Another Account
          </Link>
          
          <div>
            <Link 
              href="/"
              className="text-gray-400 hover:text-white transition-colors text-xs sm:text-sm"
            >
              Back to Home
            </Link>
          </div>
        </div>

        {/* Support */}
        <div className="mt-8 sm:mt-12 pt-6 sm:pt-8 border-t border-gray-900 text-center px-4">
          <p className="text-xs sm:text-sm text-gray-500">
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
