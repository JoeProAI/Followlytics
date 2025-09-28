'use client'

import { useEffect, Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { signInWithCustomToken } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import FollowerScanner from '@/components/dashboard/FollowerScanner'
import ScanStatusBanner from '@/components/dashboard/ScanStatusBanner'
import XSessionCaptureHybrid from '@/components/dashboard/XSessionCaptureHybrid'
import XSessionCapture from '@/components/dashboard/XSessionCapture'
import DiagnosticPanel from '@/components/dashboard/DiagnosticPanel'
import OptimizedScanInterface from '@/components/dashboard/OptimizedScanInterface'
import DirectFollowerScanner from '@/components/dashboard/DirectFollowerScanner'
import AutoFollowerScanner from '@/components/dashboard/AutoFollowerScanner'
import DirectXFollowerScanner from '@/components/dashboard/DirectXFollowerScanner'
import SimpleXFollowerScanner from '@/components/dashboard/SimpleXFollowerScanner'

function DashboardContent() {
  const { user, logout, loading } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [showSessionCookieHelper, setShowSessionCookieHelper] = useState(false)
  const [twitterAuthStatus, setTwitterAuthStatus] = useState<{
    authorized: boolean
    loading: boolean
    xUsername?: string
  }>({ authorized: false, loading: true })

  // Check Twitter authorization status
  const checkTwitterAuthStatus = async () => {
    if (!user) return
    
    try {
      const token = await user.getIdToken()
      const response = await fetch('/api/auth/twitter/status', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })
      
      if (response.ok) {
        const data = await response.json()
        setTwitterAuthStatus({
          authorized: data.authorized,
          loading: false,
          xUsername: data.xUsername
        })
      } else {
        setTwitterAuthStatus({ authorized: false, loading: false })
      }
    } catch (error) {
      console.error('Failed to check Twitter auth status:', error)
      setTwitterAuthStatus({ authorized: false, loading: false })
    }
  }

  // Check Twitter auth status when user is available
  useEffect(() => {
    if (user && !loading) {
      checkTwitterAuthStatus()
    }
  }, [user, loading])

  useEffect(() => {
    const handleXAuthSuccess = async () => {
      const xAuth = searchParams.get('x_auth')
      const token = searchParams.get('token')
      const error = searchParams.get('error')
      const message = searchParams.get('message')
      
      // Debug: Log all URL parameters
      const allParams = Array.from(searchParams.entries())
      if (allParams.length > 0) {
        console.log('🔍 Dashboard URL parameters:', Object.fromEntries(allParams))
      }
      
      // Handle OAuth errors
      if (error) {
        console.error('OAuth error:', error, message)
        alert(`OAuth Error: ${error}\nMessage: ${message || 'Unknown error'}`)
        // Show error message to user but don't redirect away from dashboard
        // The error will be displayed in the UI
        return
      }
      
      if (xAuth === 'success') {
        if (token) {
          try {
            console.log('🔑 Signing in with custom token...')
            await signInWithCustomToken(auth, token)
            console.log('✅ Successfully signed in with custom token')
          } catch (error) {
            console.error('X Auth token error:', error)
            // Continue anyway - the OAuth was successful even if token failed
          }
        }
        
        // Always refresh Twitter auth status after successful OAuth
        await checkTwitterAuthStatus()
        // Clear URL parameters after successful auth
        router.replace('/dashboard')
        return
      }
      
      // Only redirect to login if no user and no X auth in progress and no error
      // Give more time for Firebase auth to restore from localStorage
      if (!user && !loading && !xAuth && !error) {
        // Add a longer delay to allow Firebase auth state to restore
        setTimeout(() => {
          // Double-check auth state before redirecting
          if (!user && !loading && !xAuth) {
            console.log('🔄 No authenticated user found after delay, redirecting to login')
            router.push('/login')
          }
        }, 3000) // Increased to 3 seconds
      }
    }

    handleXAuthSuccess()
  }, [user, router, searchParams, loading])

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">
            {loading ? 'Restoring authentication...' : 'Loading dashboard...'}
          </p>
          <p className="mt-2 text-sm text-gray-500">
            Please wait while we verify your session
          </p>
        </div>
      </div>
    )
  }

  const handleLogout = async () => {
    try {
      await logout()
      router.push('/')
    } catch (error) {
      console.error('Failed to log out:', error)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-gray-900">Followlytics</h1>
              <span className="ml-2 px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                Powered by Daytona
              </span>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-700">Welcome, {user.email}</span>
              <button
                onClick={handleLogout}
                className="bg-gray-100 hover:bg-gray-200 text-gray-800 px-3 py-2 rounded-md text-sm font-medium transition-colors"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Hero Section */}
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg shadow-lg p-8 mb-8 text-white">
            <div className="text-center">
              <h1 className="text-3xl font-bold mb-2">
                Welcome to Followlytics
              </h1>
              <p className="text-white/90 mb-8">
                Track your X followers and discover who unfollowed you
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                <div className="bg-white bg-opacity-20 rounded-lg p-4">
                  <div className="text-2xl font-bold">🔒</div>
                  <div className="text-sm font-medium">Secure Sandboxes</div>
                  <div className="text-xs opacity-75">Isolated environments</div>
                </div>
                <div className="bg-white bg-opacity-20 rounded-lg p-4">
                  <div className="text-2xl font-bold">🤖</div>
                  <div className="text-sm font-medium">Browser Automation</div>
                  <div className="text-xs opacity-75">Playwright powered</div>
                </div>
                <div className="bg-white bg-opacity-20 rounded-lg p-4">
                  <div className="text-2xl font-bold">⚡</div>
                  <div className="text-sm font-medium">Auto-cleanup</div>
                  <div className="text-xs opacity-75">No manual maintenance</div>
                </div>
              </div>
            </div>
          </div>

          {/* Diagnostic Panel */}
          <DiagnosticPanel />

          {/* Scan Status Banner */}
          <ScanStatusBanner 
            onAuthenticationRequired={() => setShowSessionCookieHelper(true)}
          />

          {/* Twitter Authorization & Follower Scanner */}
          {twitterAuthStatus.loading ? (
            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-2 text-gray-600">Checking X authorization...</p>
              </div>
            </div>
          ) : !twitterAuthStatus.authorized ? (
            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-center">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                  Step 1: Authorize X Access
                </h2>
                <p className="text-gray-600 mb-6">
                  To scan followers, you need to authorize Followlytics to access your X account.
                </p>
                <button
                  onClick={() => window.location.href = '/api/auth/twitter'}
                  className="bg-black hover:bg-gray-800 text-white font-medium py-2 px-6 rounded-lg transition-colors"
                >
                  𝕏 Authorize X Access
                </button>
                <p className="text-sm text-gray-500 mt-4">
                  You'll be redirected to X to grant permission, then returned here.
                </p>
              </div>
            </div>
          ) : (
            <div>
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-green-800">
                      ✓ X Access Authorized
                      {twitterAuthStatus.xUsername && (
                        <span className="ml-2 text-green-600">(@{twitterAuthStatus.xUsername})</span>
                      )}
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Simple X Follower Scanner - NO CROSS-ORIGIN ISSUES */}
              <div className="mb-6">
                <SimpleXFollowerScanner />
              </div>
              
              {/* Alternative Scanners */}
              <details className="mb-6">
                <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700 mb-4">
                  🔧 Alternative Scanners (if simple scanner doesn't work)
                </summary>
                
                <div className="space-y-4 mt-4">
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Direct X Scanner (Cross-Origin Issues)</h4>
                    <DirectXFollowerScanner />
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Automated Scanner (Sandbox)</h4>
                    <AutoFollowerScanner detectedUsername={twitterAuthStatus.xUsername} />
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Direct Browser Scanner</h4>
                    <DirectFollowerScanner detectedUsername={twitterAuthStatus.xUsername} />
                  </div>
                </div>
              </details>
              
              {/* X Session Authentication */}
              <div className="mb-6">
                <XSessionCapture />
              </div>
              
              {/* Optimized Scan Interface */}
              <OptimizedScanInterface />
              
              {/* Legacy Components (Hidden by default) */}
              <details className="mt-8">
                <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700">
                  🔧 Advanced Options & Legacy Tools
                </summary>
                <div className="mt-4 space-y-4 p-4 bg-gray-50 rounded-lg">
                  {/* X Session Capture */}
                  <div className="mb-4">
                    <h3 className="text-sm font-medium text-gray-700 mb-2">Legacy Session Capture</h3>
                    <XSessionCaptureHybrid />
                  </div>

                  {/* Force Cleanup */}
                  <div className="mb-4 space-y-3">
                    {/* Force Cleanup Button */}
                    <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-sm font-medium text-yellow-800">
                            🧹 Cleanup Running Scans
                          </h3>
                          <p className="text-xs text-yellow-700 mt-1">
                            If you have stuck scans or sandboxes, click to force cleanup
                          </p>
                        </div>
                        <button
                          onClick={async () => {
                            try {
                              const token = await user?.getIdToken()
                              const response = await fetch('/api/scan/force-cleanup', {
                                method: 'POST',
                                headers: {
                                  'Authorization': `Bearer ${token}`,
                                },
                              })
                              const result = await response.json()
                              alert(`Cleanup completed: ${result.message}`)
                              window.location.reload()
                            } catch (error) {
                              alert(`Cleanup failed: ${error}`)
                            }
                          }}
                          className="bg-yellow-600 hover:bg-yellow-700 text-white text-xs px-3 py-1 rounded"
                        >
                          Force Cleanup
                        </button>
                      </div>
                    </div>
                  </div>
                  
                  {/* Legacy Follower Scanner */}
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-2">Legacy Follower Scanner</h3>
                    <FollowerScanner />
                  </div>
                </div>
              </details>
            </div>
          )}

          {/* How It Works Section */}
          <div className="bg-white rounded-lg shadow p-6 mt-8">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              How It Works
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="text-center">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-blue-600 font-bold">1</span>
                </div>
                <h4 className="font-medium text-gray-900 mb-2">Enter Username</h4>
                <p className="text-sm text-gray-600">Provide the Twitter username you want to scan</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-blue-600 font-bold">2</span>
                </div>
                <h4 className="font-medium text-gray-900 mb-2">Create Sandbox</h4>
                <p className="text-sm text-gray-600">Daytona creates a secure, isolated environment</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-blue-600 font-bold">3</span>
                </div>
                <h4 className="font-medium text-gray-900 mb-2">Scan Followers</h4>
                <p className="text-sm text-gray-600">Browser automation extracts follower data</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-blue-600 font-bold">4</span>
                </div>
                <h4 className="font-medium text-gray-900 mb-2">Get Results</h4>
                <p className="text-sm text-gray-600">View followers and detect changes</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function Dashboard() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    }>
      <DashboardContent />
    </Suspense>
  )
}
