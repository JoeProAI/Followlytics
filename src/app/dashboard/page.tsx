'use client'

import { useEffect, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import AnalyticsDashboard from '@/components/dashboard/AnalyticsDashboard'
import XFireworksLoader from '@/components/ui/XFireworksLoader'

function DashboardContent() {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!user && !loading) {
      router.push('/login')
    }
  }, [user, loading, router])

  // Handle X OAuth callback with custom token
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const customToken = urlParams.get('token')
    const xAuthSuccess = urlParams.get('x_auth')
    
    if (xAuthSuccess === 'success') {
      console.log('[Dashboard] X OAuth callback detected')
      
      // Check if this was a linking session (user was already logged in)
      const wasLinking = localStorage.getItem('x_oauth_linking') === 'true'
      const linkingEmail = localStorage.getItem('x_oauth_user_email')
      const linkingUserId = localStorage.getItem('x_oauth_user_id')
      
      if (wasLinking && linkingUserId) {
        console.log('[Dashboard] This was a linking session for:', linkingEmail, 'UID:', linkingUserId)
        console.log('[Dashboard] Staying logged in, NOT using custom token')
        
        // Send linking user ID to backend to fix the tokens
        if (user && user.uid === linkingUserId) {
          console.log('[Dashboard] User matches, triggering token fix...')
          fetch('/api/auth/twitter/fix-tokens', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${user.getIdToken()}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ userId: linkingUserId })
          }).catch(err => console.error('Failed to fix tokens:', err))
        }
        
        // Clear the linking flags
        localStorage.removeItem('x_oauth_linking')
        localStorage.removeItem('x_oauth_user_email')
        localStorage.removeItem('x_oauth_user_id')
        
        // Just clean up URL - DO NOT sign in with token
        window.history.replaceState({}, '', '/dashboard?twitter_success=true')
        return
      }
      
      // Not a linking session - proceed with normal sign-in if token exists
      if (customToken && !user && !loading) {
        console.log('[Dashboard] New user sign-in with custom token')
        // User not logged in - sign them in with custom token
        import('firebase/auth').then(({ signInWithCustomToken }) => {
          import('@/lib/firebase').then(({ auth }) => {
            signInWithCustomToken(auth, customToken)
              .then(() => {
                // Clean up URL
                window.history.replaceState({}, '', '/dashboard?twitter_success=true')
              })
              .catch((error) => {
                console.error('Failed to sign in with custom token:', error)
                window.history.replaceState({}, '', '/dashboard')
              })
          })
        })
      } else if (user) {
        // User already logged in - just clean up URL and show success
        console.log('[Dashboard] User already logged in, cleaning up URL')
        window.history.replaceState({}, '', '/dashboard?twitter_success=true')
      }
    }
  }, [user, loading, router])

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f1419] flex items-center justify-center">
        <XFireworksLoader message="Loading analytics..." size="lg" />
      </div>
    )
  }

  if (!user) {
    return null
  }

  return <AnalyticsDashboard />
}

export default function Dashboard() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#0f1419] flex items-center justify-center">
        <XFireworksLoader message="Loading analytics..." size="lg" />
      </div>
    }>
      <DashboardContent />
    </Suspense>
  )
}

