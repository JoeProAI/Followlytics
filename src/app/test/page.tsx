'use client'

import { useState } from 'react'
import Link from 'next/link'

export default function TestPage() {
  const [username, setUsername] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState('')

  const handleExtract = async () => {
    if (!username.trim()) return

    setLoading(true)
    setError('')
    setResult(null)

    try {
      const res = await fetch('/api/admin/manual-extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.replace('@', '') })
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Extraction failed')
        return
      }

      setResult(data)
    } catch (err: any) {
      setError('Network error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <header className="border-b border-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Link href="/" className="text-xl font-light hover:text-gray-400 transition-colors">
            Followlytics
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <h1 className="text-4xl font-light mb-4">🧪 Test Extraction</h1>
          <p className="text-gray-400">
            Extract any account's followers WITHOUT paying - for testing only
          </p>
        </div>

        <div className="border border-gray-900 rounded-lg p-8 mb-8">
          <div className="mb-6">
            <label className="block text-sm text-gray-400 mb-2">
              Twitter Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="joeproai"
              className="w-full px-4 py-3 bg-black border border-gray-800 rounded text-white placeholder-gray-600 focus:outline-none focus:border-white"
            />
          </div>

          <button
            onClick={handleExtract}
            disabled={loading || !username.trim()}
            className="w-full bg-white text-black py-3 rounded font-medium hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Extracting...' : 'Extract Followers (FREE)'}
          </button>

          {error && (
            <div className="mt-4 p-4 bg-red-900/20 border border-red-900/50 rounded text-red-400">
              {error}
            </div>
          )}

          {result && (
            <div className="mt-6 p-6 bg-green-900/20 border border-green-900/50 rounded">
              <h3 className="text-xl font-medium text-green-400 mb-4">
                ✓ Extraction Complete!
              </h3>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-gray-400">Username:</span>{' '}
                  <span className="text-white">@{result.username}</span>
                </div>
                <div>
                  <span className="text-gray-400">Followers:</span>{' '}
                  <span className="text-white">{result.followerCount.toLocaleString()}</span>
                </div>
                <div className="pt-4">
                  <Link
                    href={result.testUrl}
                    className="inline-block bg-white text-black px-6 py-2 rounded font-medium hover:bg-gray-200 transition-colors"
                  >
                    View & Download →
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="text-center text-sm text-gray-500">
          <p>⚠️ Test page - for development only</p>
          <p className="mt-2">Uses same extraction as paid version</p>
        </div>
      </main>
    </div>
  )
}
