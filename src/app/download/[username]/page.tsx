'use client'

import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

export default function DownloadPage() {
  const params = useParams()
  const router = useRouter()
  const [error, setError] = useState('')
  
  useEffect(() => {
    const token = params?.username as string // Actually a token, not username
    
    if (token) {
      // Verify token and get username
      fetch('/api/export/verify-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token })
      })
        .then(res => res.json())
        .then(data => {
          if (data.success && data.username) {
            // Redirect to success page with verified username
            router.replace(`/export/success?username=${data.username}&session_id=${token}`)
          } else {
            setError('Invalid or expired download link')
          }
        })
        .catch(() => {
          setError('Failed to verify download link')
        })
    }
  }, [params, router])

  if (error) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-4">🔒</div>
          <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
          <p className="text-gray-400">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-white mb-4"></div>
        <p className="text-gray-400">Verifying your access...</p>
      </div>
    </div>
  )
}
