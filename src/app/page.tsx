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
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-full mb-6">
              <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
              <span className="text-sm text-gray-400">Powered by Grok AI</span>
            </div>
            <h1 className="text-6xl md:text-7xl font-light tracking-tight mb-6">
              Export Anyone's Followers.
              <br />
              <span className="text-gray-500">Yours. Theirs. Anyone's.</span>
            </h1>
            <p className="text-xl text-gray-400 mb-8 font-light leading-relaxed">
              Get the complete follower database of any X account. Grok-powered insights.
              <br />
              Competitive intel made easy. Just costs a little gas ⚡
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
              <div className="text-sm text-gray-600 uppercase tracking-wider mb-3">🤖 Grok-Powered</div>
              <h3 className="text-2xl font-light mb-4">AI Analysis. Instant Insights.</h3>
              <p className="text-gray-400 font-light">
                Grok AI analyzes follower quality, engagement patterns, and audience demographics.
                Professional presentation reports included.
              </p>
            </div>

            <div>
              <div className="text-sm text-gray-600 uppercase tracking-wider mb-3">🎯 Any Account</div>
              <h3 className="text-2xl font-light mb-4">Your Competitors. Your Prospects.</h3>
              <p className="text-gray-400 font-light">
                Export followers from ANY public X account. Your own, your competitors, industry leaders.
                See who follows them. Find your next customers.
              </p>
            </div>

            <div>
              <div className="text-sm text-gray-600 uppercase tracking-wider mb-3">⚡ Pay Per Use</div>
              <h3 className="text-2xl font-light mb-4">Just Costs a Little Gas</h3>
              <p className="text-gray-400 font-light">
                No subscription. Pay once per export. CSV, JSON, Excel formats.
                Free for under 500 followers. $2.99-$49.99 for larger accounts.
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* Use Cases */}
      <section className="border-t border-gray-900 py-20 bg-white/[0.02]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl font-light mb-12 text-center">Who's Using This?</h2>
          <div className="grid md:grid-cols-2 gap-8">
            
            <div className="border border-gray-800 p-6 rounded-lg">
              <div className="text-sm text-gray-600 uppercase tracking-wider mb-2">Sales Teams</div>
              <h3 className="text-xl font-light mb-3">"Find our competitors' followers"</h3>
              <p className="text-gray-400 text-sm">
                Export @competitor followers → Filter by job title → Cold outreach list ready. 
                One export = 1,000+ qualified leads.
              </p>
            </div>

            <div className="border border-gray-800 p-6 rounded-lg">
              <div className="text-sm text-gray-600 uppercase tracking-wider mb-2">Indie Hackers</div>
              <h3 className="text-xl font-light mb-3">"Who follows my ideal customer?"</h3>
              <p className="text-gray-400 text-sm">
                Export followers of successful accounts in your niche. Find your first 100 customers hiding in plain sight.
              </p>
            </div>

            <div className="border border-gray-800 p-6 rounded-lg">
              <div className="text-sm text-gray-600 uppercase tracking-wider mb-2">Recruiters</div>
              <h3 className="text-xl font-light mb-3">"Source candidates at scale"</h3>
              <p className="text-gray-400 text-sm">
                Export @YCombinator or @TechCrunch followers. Filter engineers with 500+ followers. Direct pipeline.
              </p>
            </div>

            <div className="border border-gray-800 p-6 rounded-lg">
              <div className="text-sm text-gray-600 uppercase tracking-wider mb-2">VCs/Investors</div>
              <h3 className="text-xl font-light mb-3">"Track our portfolio founders"</h3>
              <p className="text-gray-400 text-sm">
                Export portfolio company followers monthly. Track growth rates. Grok analysis shows engagement quality.
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
                <div className="text-gray-500">500 – 5,000</div>
                <div className="text-2xl font-light">
                  <span className="line-through text-gray-600 text-lg mr-2">$4.99</span>
                  $2.99
                </div>
              </div>
              <div className="flex justify-between items-center border-b border-gray-900 pb-4">
                <div className="text-gray-500">5,000 – 25,000</div>
                <div className="text-2xl font-light">$4.99</div>
              </div>
              <div className="flex justify-between items-center border-b border-gray-900 pb-4">
                <div className="text-gray-500">25,000 – 100,000</div>
                <div className="text-2xl font-light">$9.99</div>
              </div>
              <div className="flex justify-between items-center border-b border-gray-900 pb-4">
                <div className="text-gray-500">100,000 – 500,000</div>
                <div className="text-2xl font-light">$19.99</div>
              </div>
              <div className="flex justify-between items-center pb-4">
                <div className="text-gray-500">500,000+</div>
                <div className="text-2xl font-light">$49.99</div>
              </div>
              <div className="mt-6 p-4 bg-white/5 rounded border border-white/10">
                <div className="text-sm text-gray-400">
                  + Grok AI presentation report FREE with all paid exports
                </div>
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

          {/* Safety note */}
          <p className="mt-6 text-xs text-gray-500">
            Your X account stays yours. We just read the numbers.
            <Link
              href="/terms"
              className="ml-1 underline decoration-dotted hover:decoration-solid hover:text-gray-300 transition-colors"
            >
              Safety & small print →
            </Link>
          </p>
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

