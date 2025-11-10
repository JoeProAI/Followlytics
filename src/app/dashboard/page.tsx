'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function DashboardPage() {
  const router = useRouter()

  useEffect(() => {
    // Redirect to new bot detection dashboard
    router.replace('/dashboard/bot-detection')
  }, [router])

  return (
    <div className="min-h-screen bg-[#0f1419] flex items-center justify-center">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-gray-700 border-t-purple-600 mb-4"></div>
        <p className="text-gray-400">Redirecting...</p>
      </div>
    </div>
  )
}

