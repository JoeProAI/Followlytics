'use client'

import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { signInWithCustomToken } from 'firebase/auth'
import { auth } from '@/lib/firebase'

export default function AuthSuccess() {
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const handleAuth = async () => {
      const token = searchParams.get('token')
      
      if (!token) {
        router.push('/login?error=missing_token')
        return
      }

      try {
        await signInWithCustomToken(auth, token)
        router.push('/dashboard')
      } catch (error) {
        console.error('Auth error:', error)
        router.push('/login?error=auth_failed')
      }
    }

    handleAuth()
  }, [router, searchParams])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Completing authentication...</p>
      </div>
    </div>
  )
}
