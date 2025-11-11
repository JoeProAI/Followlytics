'use client'

import { useState } from 'react'
import Link from 'next/link'
import LaunchTimer from '@/components/LaunchTimer'

export default function Home() {
  const [username, setUsername] = useState('')

  const handleGetStarted = () => {
    if (username.trim()) {
      window.location.href = `/export?u=${username.replace('@', '')}`
    }
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <LaunchTimer />
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-32">
          <div className="max-w-4xl">
            <h1 className="text-6xl md:text-7xl font-light tracking-tight mb-6">
              Export Your Followers.
              <br />
              All of Them.
            </h1>
            <p className="text-xl text-gray-400 mb-8 font-light leading-relaxed">
              Complete follower database. Every format. Change tracking included.
              <br />
              Free for accounts under 500. No signup required.
            </p>
            <div className="flex gap-4 items-center">
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleGetStarted()}
                placeholder="@username"
                className="px-6 py-3 bg-black border border-gray-800 rounded text-white placeholder-gray-600 focus:outline-none focus:border-white transition-colors w-64"
              />
              <button
                onClick={handleGetStarted}
                className="bg-white text-black px-8 py-3 rounded font-medium hover:bg-gray-200 transition-colors"
              >
                Check Price
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-12">
            
            <div>
              <div className="text-sm text-gray-600 uppercase tracking-wider mb-3">Complete Export</div>
              <h3 className="text-2xl font-light mb-4">Every Follower. Every Detail.</h3>
              <p className="text-gray-400 font-light">
                Full database export. Username, bio, follower count, location, verification status. 
                CSV, JSON, Excel. Your choice.
              </p>
            </div>

            <div>
              <div className="text-sm text-gray-600 uppercase tracking-wider mb-3">Change Tracking</div>
              <h3 className="text-2xl font-light mb-4">See Who's In. Who's Out.</h3>
              <p className="text-gray-400 font-light">
                Automatic tracking of new followers and unfollowers. 
                Growth metrics. Historical comparisons. 30-day retention.
              </p>
            </div>

            <div>
              <div className="text-sm text-gray-600 uppercase tracking-wider mb-3">Custom Reports</div>
              <h3 className="text-2xl font-light mb-4">Presentation-Ready Analytics</h3>
              <p className="text-gray-400 font-light">
                Professional follower analysis reports. Custom styling. 
                Shareable presentations. Investor-ready metrics.
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="border-t border-gray-900 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-16">
            
            <div>
              <h2 className="text-4xl font-light mb-6">Simple Pricing</h2>
              <div className="space-y-4 text-gray-400">
                <p>Pay once. Use for 30 days. No subscription. No hidden fees.</p>
                <p>Free for accounts under 500 followers. Everyone else pays based on size.</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center border-b border-gray-900 pb-4">
                <div className="text-gray-500">Under 500</div>
                <div className="text-2xl font-light">Free</div>
              </div>
              <div className="flex justify-between items-center border-b border-gray-900 pb-4">
                <div className="text-gray-500">500 – 2,000</div>
                <div className="text-2xl font-light">$5</div>
              </div>
              <div className="flex justify-between items-center border-b border-gray-900 pb-4">
                <div className="text-gray-500">2,000 – 10,000</div>
                <div className="text-2xl font-light">$10 – $20</div>
              </div>
              <div className="flex justify-between items-center border-b border-gray-900 pb-4">
                <div className="text-gray-500">10,000 – 50,000</div>
                <div className="text-2xl font-light">$35 – $50</div>
              </div>
              <div className="flex justify-between items-center border-b border-gray-900 pb-4">
                <div className="text-gray-500">50,000 – 250,000</div>
                <div className="text-2xl font-light">$100 – $150</div>
              </div>
              <div className="flex justify-between items-center pb-4">
                <div className="text-gray-500">250,000+</div>
                <div className="text-2xl font-light">$200</div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-gray-900 py-20">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl font-light mb-6">
            Export Your Followers
          </h2>
          <p className="text-xl text-gray-400 mb-8 font-light">
            No signup. No subscription. Just results.
          </p>
          
          <div className="flex gap-4 justify-center items-center">
            <input
              type="text"
              placeholder="@username"
              className="px-6 py-3 bg-black border border-gray-800 rounded text-white placeholder-gray-600 focus:outline-none focus:border-white transition-colors w-64"
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
              className="bg-white text-black px-8 py-3 rounded font-medium hover:bg-gray-200 transition-colors"
            >
              Get Started
            </button>
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

