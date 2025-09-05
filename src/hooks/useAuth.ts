import { useState, useEffect } from 'react'
import { User } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { onAuthStateChanged, signInWithCustomToken, signOut } from 'firebase/auth'

interface AuthUser extends User {
  xHandle?: string
  xUserId?: string
  xName?: string
}

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      console.log('Firebase auth state changed:', user)
      setUser(user as AuthUser)
      setLoading(false)
    })

    // Check for custom token in cookie on mount
    const checkCustomToken = async () => {
      console.log('All cookies:', document.cookie)
      const token = document.cookie
        .split('; ')
        .find(row => row.startsWith('firebase_token='))
        ?.split('=')[1]

      console.log('Checking for firebase token:', !!token)
      
      if (token && !auth.currentUser) {
        try {
          console.log('Signing in with custom token')
          setLoading(true)
          const result = await signInWithCustomToken(auth, decodeURIComponent(token))
          console.log('Successfully signed in with custom token:', result.user)
          // Don't clear the cookie immediately - keep it for API calls
          setLoading(false)
        } catch (error) {
          console.error('Error signing in with custom token:', error)
          // Clear invalid token
          document.cookie = 'firebase_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;'
          setLoading(false)
        }
      } else if (!token) {
        console.log('No firebase token found in cookies')
        setLoading(false)
      } else if (auth.currentUser) {
        console.log('User already signed in:', auth.currentUser)
        setLoading(false)
      }
    }

    checkCustomToken()

    return () => unsubscribe()
  }, [])

  const logout = async () => {
    try {
      await signOut(auth)
      // Clear firebase token cookie
      document.cookie = 'firebase_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;'
      // Redirect to home page
      window.location.href = '/'
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  return {
    user,
    loading,
    logout,
    isAuthenticated: !!user
  }
}
