'use client'

import Link from 'next/link'
import AnalyticsPlatformHero from '@/components/landing/AnalyticsPlatformHero'

export default function Home() {

  return (
    <div className="min-h-screen">
      {/* New Analytics Platform Hero */}
      <AnalyticsPlatformHero />
      
      {/* Features Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Powerful Analytics Features
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Transform your X data into actionable insights with our AI-powered analytics platform
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Viral Prediction */}
            <div className="bg-gradient-to-br from-red-50 to-pink-50 rounded-xl p-6 border border-red-100">
              <div className="text-4xl mb-4">🔥</div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Viral Prediction Engine</h3>
              <p className="text-gray-600 mb-4">
                AI analyzes your tweet patterns and predicts viral potential with 87% accuracy before you post.
              </p>
              <div className="text-sm text-red-600 font-medium">
                ✨ Get viral score predictions
              </div>
            </div>

            {/* Real-time Analytics */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-100">
              <div className="text-4xl mb-4">📊</div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Real-time Analytics</h3>
              <p className="text-gray-600 mb-4">
                Live engagement tracking with instant alerts when your content starts trending.
              </p>
              <div className="text-sm text-blue-600 font-medium">
                ⚡ Live dashboard updates
              </div>
            </div>

            {/* AI Insights */}
            <div className="bg-gradient-to-br from-purple-50 to-violet-50 rounded-xl p-6 border border-purple-100">
              <div className="text-4xl mb-4">🧠</div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">AI-Powered Insights</h3>
              <p className="text-gray-600 mb-4">
                Advanced sentiment analysis and personalized growth recommendations powered by Daytona.
              </p>
              <div className="text-sm text-purple-600 font-medium">
                🎯 Personalized recommendations
              </div>
            </div>

            {/* Competitor Analysis */}
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-6 border border-green-100">
              <div className="text-4xl mb-4">🎯</div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Competitor Intelligence</h3>
              <p className="text-gray-600 mb-4">
                Compare your metrics against competitors and discover industry benchmarks.
              </p>
              <div className="text-sm text-green-600 font-medium">
                📈 Industry benchmarking
              </div>
            </div>

            {/* Growth Optimization */}
            <div className="bg-gradient-to-br from-yellow-50 to-orange-50 rounded-xl p-6 border border-yellow-100">
              <div className="text-4xl mb-4">🚀</div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Growth Optimization</h3>
              <p className="text-gray-600 mb-4">
                AI-generated content suggestions and optimal posting time recommendations.
              </p>
              <div className="text-sm text-orange-600 font-medium">
                💡 AI content suggestions
              </div>
            </div>

            {/* Professional Reports */}
            <div className="bg-gradient-to-br from-gray-50 to-slate-50 rounded-xl p-6 border border-gray-100">
              <div className="text-4xl mb-4">📱</div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Professional Reports</h3>
              <p className="text-gray-600 mb-4">
                Beautiful PDF reports and shareable infographics for clients and stakeholders.
              </p>
              <div className="text-sm text-gray-600 font-medium">
                📄 One-click reports
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-blue-600 to-purple-600 text-white">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl font-bold mb-6">
            Ready to Transform Your X Strategy?
          </h2>
          <p className="text-xl mb-8 text-blue-100">
            Join thousands of creators and businesses using TweetScope to optimize their social media presence
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link 
              href="/signup" 
              className="bg-white text-blue-600 hover:bg-gray-100 font-bold py-4 px-8 rounded-lg text-lg transition-all duration-300 transform hover:scale-105"
            >
              🚀 Start Free Trial
            </Link>
            <Link 
              href="/pricing" 
              className="border-2 border-white text-white hover:bg-white hover:text-blue-600 font-bold py-4 px-8 rounded-lg text-lg transition-all duration-300"
            >
              💰 View Pricing
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
