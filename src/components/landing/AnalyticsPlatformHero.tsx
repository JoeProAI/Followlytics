'use client'

import React from 'react'
import Link from 'next/link'

export default function AnalyticsPlatformHero() {
  return (
    <div className="bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center">
          {/* Badge */}
          <div className="inline-flex items-center px-4 py-2 bg-blue-600/20 border border-blue-400/30 rounded-full text-sm font-medium mb-8">
            <span className="mr-2">🚀</span>
            Powered by X API v2 + AI Analytics Engine
          </div>

          {/* Main Headline */}
          <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
            XScope
          </h1>
          
          <h2 className="text-2xl md:text-3xl font-semibold mb-8 text-gray-200">
            See Your X Impact Like Never Before
          </h2>

          <p className="text-xl md:text-2xl text-gray-300 mb-12 max-w-4xl mx-auto leading-relaxed">
            Turn your X data into <span className="text-blue-400 font-semibold">actionable insights</span> with 
            AI-powered analytics that reveal hidden patterns, predict viral potential, and optimize your social strategy.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
            <Link 
              href="/signup" 
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold py-4 px-8 rounded-lg text-lg transition-all duration-300 transform hover:scale-105 shadow-lg"
            >
              🚀 Start Free Analysis
            </Link>
            <Link 
              href="/demo" 
              className="border-2 border-blue-400 text-blue-400 hover:bg-blue-400 hover:text-white font-bold py-4 px-8 rounded-lg text-lg transition-all duration-300"
            >
              📊 View Demo
            </Link>
          </div>

          {/* Feature Grid */}
          <div className="grid md:grid-cols-3 gap-8 mb-16">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
              <div className="text-4xl mb-4">🔥</div>
              <h3 className="text-xl font-bold mb-3">Viral Prediction Engine</h3>
              <p className="text-gray-300">
                AI analyzes your X posts and predicts viral potential with 87% accuracy
              </p>
            </div>

            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
              <div className="text-4xl mb-4">📈</div>
              <h3 className="text-xl font-bold mb-3">Real-time Analytics</h3>
              <p className="text-gray-300">
                Live engagement tracking with instant alerts for trending content
              </p>
            </div>

            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
              <div className="text-4xl mb-4">🧠</div>
              <h3 className="text-xl font-bold mb-3">AI-Powered Insights</h3>
              <p className="text-gray-300">
                Advanced sentiment analysis and personalized growth recommendations
              </p>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-16">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-400 mb-2">87%</div>
              <div className="text-gray-300">Viral Prediction Accuracy</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-400 mb-2">2.3x</div>
              <div className="text-gray-300">Average Engagement Boost</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-pink-400 mb-2">15min</div>
              <div className="text-gray-300">Setup Time</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-400 mb-2">24/7</div>
              <div className="text-gray-300">Real-time Monitoring</div>
            </div>
          </div>

          {/* Testimonial */}
          <div className="bg-white/5 backdrop-blur-sm rounded-xl p-8 border border-white/10 max-w-4xl mx-auto">
            <div className="text-2xl mb-4">💬</div>
            <blockquote className="text-xl italic text-gray-200 mb-4">
              "XScope predicted my viral X post 6 hours before it exploded. The AI insights helped me optimize my content strategy and grow my audience by 340% in just 3 months!"
            </blockquote>
            <div className="text-blue-400 font-semibold">
              — Sarah Chen, Content Creator (@sarahbuilds)
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Wave */}
      <div className="relative">
        <svg className="w-full h-20" viewBox="0 0 1200 120" preserveAspectRatio="none">
          <path 
            d="M0,0V46.29c47.79,22.2,103.59,32.17,158,28,70.36-5.37,136.33-33.31,206.8-37.5C438.64,32.43,512.34,53.67,583,72.05c69.27,18,138.3,24.88,209.4,13.08,36.15-6,69.85-17.84,104.45-29.34C989.49,25,1113-14.29,1200,52.47V0Z" 
            opacity=".25" 
            className="fill-white"
          ></path>
          <path 
            d="M0,0V15.81C13,36.92,27.64,56.86,47.69,72.05,99.41,111.27,165,111,224.58,91.58c31.15-10.15,60.09-26.07,89.67-39.8,40.92-19,84.73-46,130.83-49.67,36.26-2.85,70.9,9.42,98.6,31.56,31.77,25.39,62.32,62,103.63,73,40.44,10.79,81.35-6.69,119.13-24.28s75.16-39,116.92-43.05c59.73-5.85,113.28,22.88,168.9,38.84,30.2,8.66,59,6.17,87.09-7.5,22.43-10.89,48-26.93,60.65-49.24V0Z" 
            opacity=".5" 
            className="fill-white"
          ></path>
          <path 
            d="M0,0V5.63C149.93,59,314.09,71.32,475.83,42.57c43-7.64,84.23-20.12,127.61-26.46,59-8.63,112.48,12.24,165.56,35.4C827.93,77.22,886,95.24,951.2,90c86.53-7,172.46-45.71,248.8-84.81V0Z" 
            className="fill-white"
          ></path>
        </svg>
      </div>
    </div>
  )
}

