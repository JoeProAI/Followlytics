'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { auth } from '@/lib/firebase'
import { onAuthStateChanged } from 'firebase/auth'
import GammaGenerator from '@/components/gamma/GammaGenerator'

export default function GammaPage() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUser(user)
        setLoading(false)
      } else {
        router.push('/login')
      }
    })

    return () => unsubscribe()
  }, [router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50">
      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent mb-4">
            Gamma AI Presentation Generator
          </h1>
          <p className="text-xl text-gray-600">
            Create stunning presentations from your follower data with AI
          </p>
        </div>

        {/* Generator */}
        <GammaGenerator username="joeproai" />

        {/* Examples Section */}
        <div className="mt-12 bg-white rounded-lg shadow-md p-6">
          <h3 className="text-2xl font-bold text-gray-900 mb-4">💡 Example Prompts:</h3>
          
          <div className="space-y-4">
            <div className="p-4 bg-purple-50 border-l-4 border-purple-600 rounded">
              <p className="text-gray-700">
                <strong>"Create a founder's pitch deck"</strong> highlighting my 800 followers, focusing on the 50+ followers with 10K+ audiences and why this shows strong market validation for investors
              </p>
            </div>

            <div className="p-4 bg-blue-50 border-l-4 border-blue-600 rounded">
              <p className="text-gray-700">
                <strong>"Build an influencer media kit"</strong> analyzing my audience demographics, top followers, engagement metrics, and brand partnership opportunities with pricing tiers
              </p>
            </div>

            <div className="p-4 bg-green-50 border-l-4 border-green-600 rounded">
              <p className="text-gray-700">
                <strong>"Generate a quarterly growth report"</strong> showing follower trends, new high-value followers, geographic expansion, and recommendations for audience growth strategies
              </p>
            </div>

            <div className="p-4 bg-pink-50 border-l-4 border-pink-600 rounded">
              <p className="text-gray-700">
                <strong>"Create a competitive analysis presentation"</strong> comparing my follower base to industry benchmarks, highlighting my unique positioning and growth potential
              </p>
            </div>
          </div>
        </div>

        {/* Features */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-lg shadow-md text-center">
            <div className="text-4xl mb-3">🎨</div>
            <h4 className="font-bold text-gray-900 mb-2">Beautiful Design</h4>
            <p className="text-gray-600 text-sm">DALL-E 3 generated images and professional themes</p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md text-center">
            <div className="text-4xl mb-3">📊</div>
            <h4 className="font-bold text-gray-900 mb-2">Data-Driven</h4>
            <p className="text-gray-600 text-sm">Real insights from your follower data and top influencers</p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md text-center">
            <div className="text-4xl mb-3">⚡</div>
            <h4 className="font-bold text-gray-900 mb-2">Multiple Formats</h4>
            <p className="text-gray-600 text-sm">Download as PDF, PowerPoint, or view online</p>
          </div>
        </div>
      </div>
    </div>
  )
}
