'use client'

import Link from 'next/link'

export default function Home() {
  return (
    <div className="min-h-screen bg-black text-white">
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-32">
          <div className="max-w-3xl">
            <h1 className="text-6xl font-light tracking-tight mb-6">
              Professional X Analytics
            </h1>
            <p className="text-xl text-gray-400 mb-8 font-light">
              Data-driven insights for serious marketers. No fluff. Just intelligence.
            </p>
            <div className="flex gap-4">
              <Link 
                href="/signup" 
                className="bg-white text-black px-8 py-3 rounded font-medium hover:bg-gray-200 transition-colors"
              >
                Start Analyzing
              </Link>
              <Link 
                href="/dashboard" 
                className="border border-gray-800 px-8 py-3 rounded font-medium hover:border-gray-700 transition-colors"
              >
                View Platform
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-12">
            
            {/* Competitor Intelligence */}
            <div>
              <div className="text-sm text-gray-500 uppercase tracking-wider mb-3">Competitive Analysis</div>
              <h3 className="text-2xl font-light mb-4">Benchmark Against Competitors</h3>
              <p className="text-gray-400 font-light">
                Side-by-side metrics comparison. Track competitor growth patterns. Identify market opportunities.
              </p>
            </div>

            {/* Brand Monitoring */}
            <div>
              <div className="text-sm text-gray-500 uppercase tracking-wider mb-3">Brand Monitoring</div>
              <h3 className="text-2xl font-light mb-4">Track Mentions & Sentiment</h3>
              <p className="text-gray-400 font-light">
                Real-time mention tracking. Sentiment analysis. Crisis detection. Brand health monitoring.
              </p>
            </div>

            {/* Content Intelligence */}
            <div>
              <div className="text-sm text-gray-500 uppercase tracking-wider mb-3">Content Analysis</div>
              <h3 className="text-2xl font-light mb-4">Deep Tweet Analysis</h3>
              <p className="text-gray-400 font-light">
                Engagement breakdown. Audience demographics. Performance patterns. Content optimization.
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* Capabilities */}
      <section className="border-t border-gray-900 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-16">
            
            <div>
              <h2 className="text-4xl font-light mb-6">Built for Professionals</h2>
              <div className="space-y-4 text-gray-400">
                <p>Real-time X API integration. Enterprise-grade analytics. Comprehensive reporting.</p>
                <p>No marketing fluff. No AI hype. Just clean data and actionable insights.</p>
              </div>
            </div>

            <div className="space-y-6">
              <div className="flex gap-4">
                <div className="text-sm text-gray-600 w-32">API Coverage</div>
                <div className="flex-1">
                  <div className="h-2 bg-gray-900 rounded-full overflow-hidden">
                    <div className="h-full bg-white w-4/5"></div>
                  </div>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="text-sm text-gray-600 w-32">Data Accuracy</div>
                <div className="flex-1">
                  <div className="h-2 bg-gray-900 rounded-full overflow-hidden">
                    <div className="h-full bg-white w-full"></div>
                  </div>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="text-sm text-gray-600 w-32">Real-time Updates</div>
                <div className="flex-1">
                  <div className="h-2 bg-gray-900 rounded-full overflow-hidden">
                    <div className="h-full bg-white w-11/12"></div>
                  </div>
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
            Start Analyzing Today
          </h2>
          <p className="text-xl text-gray-400 mb-8 font-light">
            Professional analytics for professional marketers
          </p>
          <Link 
            href="/signup" 
            className="inline-block bg-white text-black px-8 py-4 rounded font-medium hover:bg-gray-200 transition-colors"
          >
            Get Started
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-900 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-600">
              © 2025 XScope Analytics
            </div>
            <div className="flex gap-8 text-sm text-gray-600">
              <Link href="/privacy" className="hover:text-gray-400">Privacy</Link>
              <Link href="/terms" className="hover:text-gray-400">Terms</Link>
              <Link href="/contact" className="hover:text-gray-400">Contact</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
