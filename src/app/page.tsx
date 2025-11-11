'use client'

import { useState } from 'react'
import Link from 'next/link'

export default function Home() {
  const [username, setUsername] = useState('')

  const handleGetStarted = () => {
    if (username.trim()) {
      window.location.href = `/export?u=${username.replace('@', '')}`
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0f1419] via-[#16181c] to-black text-white">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-32">
          <div className="text-center">
            <div className="inline-block mb-4">
              <span className="px-4 py-2 bg-purple-600/20 border border-purple-500/50 rounded-full text-sm font-medium text-purple-400">
                No Signup • No Subscription • Just Results
              </span>
            </div>
            
            <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6 bg-gradient-to-r from-white via-purple-200 to-blue-200 bg-clip-text text-transparent">
              Get Your Complete
              <br />
              Follower Database
            </h1>
            
            <p className="text-xl md:text-2xl text-gray-300 mb-12 max-w-3xl mx-auto">
              Export all your followers in any format. Track changes. Generate custom AI reports.
              <br />
              <span className="text-purple-400 font-semibold">Under 500 followers? Completely FREE.</span>
            </p>

            {/* Instant Check */}
            <div className="max-w-xl mx-auto mb-8">
              <div className="flex gap-3">
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleGetStarted()}
                  placeholder="Enter your Twitter username..."
                  className="flex-1 px-6 py-4 bg-[#16181c] border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 text-lg"
                />
                <button
                  onClick={handleGetStarted}
                  className="px-8 py-4 bg-purple-600 hover:bg-purple-700 rounded-lg font-semibold text-lg transition-colors"
                >
                  Check Price
                </button>
              </div>
              <p className="text-sm text-gray-500 mt-2">No payment required to check pricing</p>
            </div>

            {/* Social Proof */}
            <div className="flex items-center justify-center gap-8 text-sm text-gray-400">
              <div className="flex items-center gap-2">
                <span className="text-green-400 text-xl">✓</span>
                <span>Instant Export</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-green-400 text-xl">✓</span>
                <span>All Formats</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-green-400 text-xl">✓</span>
                <span>AI Reports</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* What You Get */}
      <section className="py-20 bg-[#0f1419]/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl font-bold text-center mb-16">What You Get</h2>
          <div className="grid md:grid-cols-3 gap-8">
            
            {/* Complete Database */}
            <div className="bg-[#16181c] border border-gray-800 rounded-lg p-8">
              <div className="text-4xl mb-4">📊</div>
              <h3 className="text-2xl font-bold mb-4">Complete Follower Database</h3>
              <p className="text-gray-400 mb-4">
                Every single follower exported with full details: username, bio, follower count, location, and more.
              </p>
              <div className="space-y-2 text-sm text-gray-500">
                <div>• Export in CSV, JSON, Excel</div>
                <div>• Stored for 30 days</div>
                <div>• Unlimited re-exports</div>
              </div>
            </div>

            {/* Change Tracking */}
            <div className="bg-[#16181c] border border-gray-800 rounded-lg p-8">
              <div className="text-4xl mb-4">📈</div>
              <h3 className="text-2xl font-bold mb-4">Track Changes</h3>
              <p className="text-gray-400 mb-4">
                See exactly who followed and unfollowed you. Perfect for growth analysis.
              </p>
              <div className="space-y-2 text-sm text-gray-500">
                <div>• New followers highlighted</div>
                <div>• Unfollowers tracked</div>
                <div>• Growth trends</div>
              </div>
            </div>

            {/* Custom AI Reports */}
            <div className="bg-[#16181c] border border-purple-900/50 rounded-lg p-8 relative">
              <div className="absolute top-4 right-4">
                <span className="px-2 py-1 bg-purple-600/20 text-purple-400 text-xs rounded">Premium</span>
              </div>
              <div className="text-4xl mb-4">🎨</div>
              <h3 className="text-2xl font-bold mb-4">Custom Gamma Reports</h3>
              <p className="text-gray-400 mb-4">
                "Make it like Elon Musk being a cool guy in galaxy format" - We'll do exactly that.
              </p>
              <div className="space-y-2 text-sm text-gray-500">
                <div>• Any style you want</div>
                <div>• AI-generated visuals</div>
                <div>• Presentation-ready</div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl font-bold text-center mb-4">Simple, Fair Pricing</h2>
          <p className="text-xl text-gray-400 text-center mb-16">Pay once. Use for 30 days. No subscription.</p>
          
          <div className="grid md:grid-cols-4 gap-4">
            <div className="bg-green-600/10 border border-green-500/50 rounded-lg p-6 text-center">
              <div className="text-3xl font-bold text-green-400 mb-2">FREE</div>
              <div className="text-sm text-gray-400 mb-4">Under 500 followers</div>
              <div className="text-xs text-gray-500">Completely free forever</div>
            </div>
            
            <div className="bg-[#16181c] border border-gray-800 rounded-lg p-6 text-center">
              <div className="text-3xl font-bold mb-2">$5</div>
              <div className="text-sm text-gray-400 mb-4">500 - 1,000</div>
              <div className="text-xs text-gray-500">One-time payment</div>
            </div>
            
            <div className="bg-[#16181c] border border-gray-800 rounded-lg p-6 text-center">
              <div className="text-3xl font-bold mb-2">$15</div>
              <div className="text-sm text-gray-400 mb-4">1K - 5K</div>
              <div className="text-xs text-gray-500">One-time payment</div>
            </div>
            
            <div className="bg-[#16181c] border border-gray-800 rounded-lg p-6 text-center">
              <div className="text-3xl font-bold mb-2">$30+</div>
              <div className="text-sm text-gray-400 mb-4">5K+</div>
              <div className="text-xs text-gray-500">Based on count</div>
            </div>
          </div>
          
          <p className="text-center text-gray-500 mt-8 text-sm">
            ✨ All tiers include: Full export, Change tracking, 30-day storage, Unlimited re-exports
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-gray-900 py-20 bg-gradient-to-b from-[#0f1419] to-black">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-5xl font-bold mb-6">
            Ready to See Your Followers?
          </h2>
          <p className="text-xl text-gray-400 mb-12">
            No signup. No subscription. Just enter your username and get started.
          </p>
          
          <div className="max-w-xl mx-auto">
            <div className="flex gap-3">
              <input
                type="text"
                placeholder="Your Twitter username..."
                className="flex-1 px-6 py-4 bg-[#16181c] border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 text-lg"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    const input = e.target as HTMLInputElement
                    if (input.value.trim()) {
                      window.location.href = `/export?u=${input.value.replace('@', '')}`
                    }
                  }
                }}
              />
              <button
                onClick={(e) => {
                  const input = e.currentTarget.previousElementSibling as HTMLInputElement
                  if (input.value.trim()) {
                    window.location.href = `/export?u=${input.value.replace('@', '')}`
                  }
                }}
                className="px-8 py-4 bg-purple-600 hover:bg-purple-700 rounded-lg font-semibold text-lg transition-colors whitespace-nowrap"
              >
                Get Started
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-900 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="text-sm text-gray-600">
              © 2025 Followlytics · Your Complete Follower Database
            </div>
            <div className="flex gap-8 text-sm text-gray-600">
              <Link href="/privacy" className="hover:text-gray-400">Privacy</Link>
              <Link href="/terms" className="hover:text-gray-400">Terms</Link>
              <a href="mailto:support@followlytics.com" className="hover:text-gray-400">Support</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

