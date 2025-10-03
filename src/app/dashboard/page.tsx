'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import ProfessionalAnalytics from '@/components/dashboard/ProfessionalAnalytics'
import XAuthConnect from '@/components/dashboard/XAuthConnect'
import DaytonaFeatures from '@/components/dashboard/DaytonaFeatures'
import Link from 'next/link'

function DashboardContent() {
  const { user, logout, loading } = useAuth()
  const router = useRouter()
  const [subscription, setSubscription] = useState<any>(null)
  const [loadingSub, setLoadingSub] = useState(true)

  useEffect(() => {
    if (!user && !loading) {
      router.push('/login')
    }
  }, [user, loading, router])

  useEffect(() => {
    async function fetchSubscription() {
      if (!user) return
      
      try {
        const token = await user.getIdToken()
        const response = await fetch('/api/user/subscription', {
          headers: { 'Authorization': `Bearer ${token}` }
        })
        
        if (response.ok) {
          const data = await response.json()
          setSubscription(data.subscription)
        }
      } catch (error) {
        console.error('Failed to fetch subscription:', error)
      } finally {
        setLoadingSub(false)
      }
    }
    
    fetchSubscription()
  }, [user])

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-12 w-12 border-b-2 border-white mx-auto"></div>
          <p className="mt-4 text-gray-400">LOADING...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
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
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <nav className="border-b border-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center gap-6">
              <h1 className="text-xl font-light tracking-tight">X ANALYTICS</h1>
              
              {/* Subscription Badge */}
              {!loadingSub && subscription && (
                <div className="flex items-center gap-3">
                  <span className={`text-xs px-3 py-1 ${
                    subscription.tier === 'enterprise' ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' :
                    subscription.tier === 'pro' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                    subscription.tier === 'starter' ? 'bg-green-500/10 text-green-400 border border-green-500/20' :
                    'bg-gray-500/10 text-gray-400 border border-gray-500/20'
                  }`}>
                    {subscription.tier.toUpperCase()}
                  </span>
                  
                  {subscription.tier === 'free' && (
                    <Link 
                      href="/pricing"
                      className="text-xs px-3 py-1 bg-white text-black hover:bg-gray-200 transition-colors"
                    >
                      UPGRADE
                    </Link>
                  )}
                </div>
              )}
            </div>
            <div className="flex items-center gap-6">
              <Link
                href="/pricing"
                className="text-sm text-gray-400 hover:text-white transition-colors"
              >
                PRICING
              </Link>
              <span className="text-sm text-gray-400">{user.email}</span>
              <button
                onClick={handleLogout}
                className="text-sm text-gray-400 hover:text-white transition-colors"
              >
                SIGN OUT
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* X Auth Connection */}
        <div className="mb-6">
          <XAuthConnect />
        </div>

        {/* Daytona Browser Automation */}
        <div className="mb-6">
          <DaytonaFeatures />
        </div>

        {/* Free Tier Upgrade Prompt */}
        {!loadingSub && subscription?.tier === 'free' && (
          <div className="mb-6 bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20 p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-medium mb-1">UNLOCK ADVANCED ANALYTICS</h3>
                <p className="text-sm text-gray-400">
                  PRO: Content analysis, competitor tracking, automated reports
                </p>
              </div>
              <Link
                href="/pricing"
                className="px-6 py-3 bg-white text-black hover:bg-gray-200 transition-colors font-medium whitespace-nowrap"
              >
                VIEW PLANS
              </Link>
            </div>
          </div>
        )}

        {/* PRO/Enterprise Features */}
        {!loadingSub && (subscription?.tier === 'pro' || subscription?.tier === 'enterprise') && (
          <div className="mb-6 bg-gradient-to-r from-green-500/10 to-blue-500/10 border border-green-500/20 p-4">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 bg-green-400 animate-pulse"></div>
              <p className="text-sm text-gray-300">
                <span className="font-medium">ACTIVE:</span> GPT-4 content analysis
                {subscription?.tier === 'enterprise' && ' | Grok competitive intelligence'}
              </p>
            </div>
          </div>
        )}
        
        <ProfessionalAnalytics />
      </div>
    </div>
  )
}

export default function Dashboard() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-12 w-12 border-b-2 border-white mx-auto"></div>
          <p className="mt-4 text-gray-400">LOADING...</p>
        </div>
      </div>
    }>
      <DashboardContent />
    </Suspense>
  )
}
