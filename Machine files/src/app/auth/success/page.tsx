'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

export default function AuthSuccessPage() {
  const router = useRouter()
  const [debugInfo, setDebugInfo] = useState('')

  useEffect(() => {
    const handleAuth = async () => {
      // Check for Firebase token
      const token = document.cookie
        .split('; ')
        .find(row => row.startsWith('firebase_token='))
        ?.split('=')[1]

      setDebugInfo(`Token found: ${!!token}`)
      
      if (token) {
        // Wait a moment for token to be processed
        setTimeout(() => {
          window.location.href = '/dashboard'
        }, 2000)
      } else {
        setDebugInfo('No token found, redirecting to home')
        setTimeout(() => {
          window.location.href = '/'
        }, 2000)
      }
    }

    handleAuth()
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto"></div>
        <p className="mt-4 text-gray-600">Processing authentication...</p>
        <p className="mt-2 text-sm text-gray-500">{debugInfo}</p>
      </div>
    </div>
  )
}
