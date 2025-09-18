'use client'

import { useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { signInWithCustomToken } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import FollowerScanner from '@/components/dashboard/FollowerScanner'

function DashboardContent() {
  const { user, logout } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const handleXAuthSuccess = async () => {
      const xAuth = searchParams.get('x_auth')
      const token = searchParams.get('token')
      const error = searchParams.get('error')
      const message = searchParams.get('message')
      
      // Handle OAuth errors
      if (error) {
        console.error('OAuth error:', error, message)
        // Show error message to user but don't redirect away from dashboard
        // The error will be displayed in the UI
        return
      }
      
      if (xAuth === 'success' && token) {
        try {
          console.log('🔑 Signing in with custom token...')
          await signInWithCustomToken(auth, token)
          console.log('✅ Successfully signed in with custom token')
          // Clear URL parameters after successful auth
          router.replace('/dashboard')
        } catch (error) {
          console.error('X Auth token error:', error)
          // Don't redirect to login, stay on dashboard and show error
        }
        return
      }
      
      // Only redirect to login if no user and no X auth in progress and no error
      if (!user && !token && !error) {
        router.push('/login')
      }
    }

    handleXAuthSuccess()
  }, [user, router, searchParams])

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
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

          {/* Follower Scanner Component */}
          <FollowerScanner />

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
