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
      setUser(user as AuthUser)
      setLoading(false)
    })

    // Check for custom token in cookie on mount
    const checkCustomToken = async () => {
      const token = document.cookie
        .split('; ')
        .find(row => row.startsWith('firebase_token='))
        ?.split('=')[1]

      if (token && !auth.currentUser) {
        try {
          setLoading(true)
          await signInWithCustomToken(auth, token)
          // Clear the cookie after successful sign in
          document.cookie = 'firebase_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;'
        } catch (error) {
          console.error('Error signing in with custom token:', error)
          setLoading(false)
        }
      }
    }

    checkCustomToken()

    return () => unsubscribe()
  }, [])

  const logout = async () => {
    try {
      await signOut(auth)
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
