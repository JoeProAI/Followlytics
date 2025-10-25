'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import ProfessionalAnalytics from '@/components/dashboard/ProfessionalAnalytics'
import XAuthConnect from '@/components/dashboard/XAuthConnect'
import DaytonaFeatures from '@/components/dashboard/DaytonaFeatures'
import ApifyFollowerExtractor from '@/components/dashboard/ApifyFollowerExtractor'
import FollowerAnalytics from '@/components/dashboard/FollowerAnalytics'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
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
    return <LoadingSpinner fullScreen text="LOADING..." />
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
              <h1 className="text-xl font-light tracking-tight">FOLLOWLYTICS</h1>
              
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
        {/* Welcome Message */}
        <div className="mb-8">
          <h2 className="text-3xl font-light mb-2">Twitter Follower Intelligence</h2>
          <p className="text-gray-400">Extract and analyze follower data from any public Twitter account.</p>
        </div>

        {/* ✅ WORKING: Apify Follower Extraction */}
        <div className="mb-8">
          <div className="bg-green-500/10 border border-green-500/30 rounded px-3 py-1 text-green-400 text-xs font-medium mb-3 inline-block">
            ✅ ACTIVE
          </div>
          <ApifyFollowerExtractor />
        </div>

        {/* ✅ WORKING: Follower Analytics */}
        <div className="mb-8">
          <FollowerAnalytics />
        </div>

        {/* 🔜 COMING SOON: X API Features (Requires API Key) */}
        <div className="mb-8 bg-yellow-500/5 border border-yellow-500/20 rounded-lg p-6">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-2xl">⏳</span>
            <h3 className="text-xl font-medium">X API Features (Coming Soon)</h3>
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded px-3 py-1 text-yellow-400 text-xs font-medium">
              REQUIRES X API KEY
            </div>
          </div>
          <p className="text-sm text-gray-400 mb-4">
            Advanced features using official X/Twitter API. Will be activated when API access is configured.
          </p>
          
          {/* X Auth Connection */}
          <div className="mb-4 opacity-60 pointer-events-none">
            <XAuthConnect />
          </div>

          {/* Daytona Browser Automation */}
          <div className="opacity-60 pointer-events-none">
            <DaytonaFeatures />
          </div>
        </div>

        {/* 🚀 Future Roadmap */}
        <div className="mb-8 bg-gray-900/50 border border-gray-800 rounded-lg p-6">
          <h3 className="text-xl font-medium mb-4">🚀 Product Roadmap</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-black/40 rounded border border-gray-800">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">🤖</span>
                <h4 className="font-medium">AI Tweet Generation</h4>
              </div>
              <p className="text-sm text-gray-400">Grok-powered, authentic engagement content (no cliché replies)</p>
            </div>
            <div className="p-4 bg-black/40 rounded border border-gray-800">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">🔌</span>
                <h4 className="font-medium">Public Follower API</h4>
              </div>
              <p className="text-sm text-gray-400">Monetize the scraper - let others use it via paid API</p>
            </div>
            <div className="p-4 bg-black/40 rounded border border-gray-800">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">📊</span>
                <h4 className="font-medium">Growth Tracking</h4>
              </div>
              <p className="text-sm text-gray-400">Monitor follower growth, detect unfollowers, track engagement</p>
            </div>
            <div className="p-4 bg-black/40 rounded border border-gray-800">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">📧</span>
                <h4 className="font-medium">Email Extraction</h4>
              </div>
              <p className="text-sm text-gray-400">Parse and export emails from follower bios for outreach</p>
            </div>
          </div>
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
                <span className="font-medium">ACTIVE:</span> Advanced analytics enabled
                {subscription?.tier === 'enterprise' && ' | API access available'}
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
    <Suspense fallback={<LoadingSpinner fullScreen text="LOADING..." />}>
      <DashboardContent />
    </Suspense>
  )
}
