'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'

export default function ApifyFollowerExtractor() {
  const { user } = useAuth()
  const [username, setUsername] = useState('')
  const [maxFollowers, setMaxFollowers] = useState(200)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<any>(null)
  const [showAll, setShowAll] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [selectedFollowers, setSelectedFollowers] = useState<Set<string>>(new Set())
  const [loadingStored, setLoadingStored] = useState(true)

  // Load stored followers on mount
  useEffect(() => {
    if (user) {
      loadStoredFollowers()
    }
  }, [user])

  async function loadStoredFollowers() {
    if (!user) return
    
    try {
      const token = await user.getIdToken()
      const response = await fetch('/api/followers/stored', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      
      if (response.ok) {
        const data = await response.json()
        if (data.followers && data.followers.length > 0) {
          // Restore the previous extraction results
          setResult({
            count: data.total || data.followers.length,
            username: data.targetUsername || 'stored',
            cost: '0.00',
            stats: data.stats,
            sample: data.followers
          })
        }
      }
    } catch (err) {
      console.error('Failed to load stored followers:', err)
    } finally {
      setLoadingStored(false)
    }
  }

  async function extractFollowers() {
    if (!user || !username.trim()) return
    
    setLoading(true)
    setError('')
    setResult(null)
    setShowAll(false)
    setSelectedFollowers(new Set())
    
    try {
      const token = await user.getIdToken()
      
      const response = await fetch('/api/apify/extract-followers', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          username: username.replace('@', ''),
          maxFollowers
        })
      })
      
      const data = await response.json()
      
      if (response.ok) {
        setResult(data)
      } else {
        setError(data.error || 'Failed to extract followers')
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  function exportToCSV() {
    if (!result?.sample) return
    
    // Export ALL followers (or selected ones)
    const followersToExport = selectedFollowers.size > 0 
      ? result.sample.filter((f: any) => selectedFollowers.has(f.username))
      : result.sample
    
    // Create CSV content
    const headers = ['Username', 'Name', 'Bio', 'Followers', 'Verified', 'Location']
    const rows = followersToExport.map((f: any) => [
      f.username,
      f.name || '',
      (f.bio || '').replace(/,/g, ';'),
      f.followersCount || 0,
      f.verified ? 'Yes' : 'No',
      f.location || ''
    ])
    
    const csvContent = [
      headers.join(','),
      ...rows.map((r: any[]) => r.map(cell => `"${cell}"`).join(','))
    ].join('\n')
    
    // Download
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    const exportType = selectedFollowers.size > 0 ? `${selectedFollowers.size}_selected` : 'all'
    a.download = `${result.username}_followers_${exportType}_${new Date().toISOString().split('T')[0]}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  async function analyzeFollowers() {
    if (!result?.sample || !user) return
    
    setAnalyzing(true)
    try {
      // Analyze selected followers, or top 50 if none selected
      const followersToAnalyze = selectedFollowers.size > 0
        ? result.sample.filter((f: any) => selectedFollowers.has(f.username))
        : [...result.sample].sort((a: any, b: any) => (b.followersCount || 0) - (a.followersCount || 0)).slice(0, 50)
      
      const analysisMsg = selectedFollowers.size > 0
        ? `Analyzing ${selectedFollowers.size} selected followers...`
        : `Smart Analysis: Analyzing top 50 most influential followers (by follower count) out of ${result.count} total.\n\nTip: Select specific followers using checkboxes for targeted analysis.`
      
      alert(analysisMsg)
      
      // Navigate to analytics view with filtered data
      // TODO: Implement actual analytics view
      console.log('Analyzing followers:', followersToAnalyze)
      
    } catch (err: any) {
      setError(err.message)
    } finally {
      setAnalyzing(false)
    }
  }

  return (
    <div className="bg-black border border-gray-800 rounded-lg p-6">
      <div className="mb-6">
        <h2 className="text-xl font-medium mb-2">Extract X Followers</h2>
        <p className="text-sm text-gray-400">
          Get detailed follower profiles from any public account in seconds. No setup required.
        </p>
      </div>

      {/* Input Section */}
      <div className="space-y-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            X Username
          </label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="elonmusk"
            className="w-full bg-black/40 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-purple-500"
            disabled={loading}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Max Followers to Extract
          </label>
          <select
            value={maxFollowers}
            onChange={(e) => setMaxFollowers(Number(e.target.value))}
            className="w-full bg-black/40 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-purple-500"
            disabled={loading}
          >
            <option value={200}>200 followers (~$0.03)</option>
            <option value={500}>500 followers (~$0.08)</option>
            <option value={1000}>1,000 followers (~$0.15)</option>
            <option value={5000}>5,000 followers (~$0.75)</option>
            <option value={10000}>10,000 followers (~$1.50)</option>
            <option value={50000}>50,000 followers (~$7.50)</option>
            <option value={100000}>100,000 followers (~$15.00)</option>
          </select>
          <p className="text-xs text-gray-500 mt-1">
            Cost: $0.15 per 1,000 followers extracted (200 minimum)
          </p>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-4 bg-red-500/10 border border-red-500/30 text-red-300 px-4 py-3 rounded-lg text-sm">
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* Success Display */}
      {result && (
        <div className="mb-4 space-y-4">
          {/* Summary Card */}
          <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="font-semibold text-green-300 mb-1 flex items-center gap-2">
                  ✅ Extraction Complete
                  <span className="text-xs px-2 py-0.5 bg-green-500/20 border border-green-500/30 rounded text-green-400">REAL DATA</span>
                </div>
                <div className="text-sm text-gray-400">Target: <strong className="text-white">@{result.username}</strong></div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-green-400">{result.count.toLocaleString()}</div>
                <div className="text-xs text-gray-500">followers extracted</div>
              </div>
            </div>
            
            {/* Stats Grid */}
            {result.stats && (
              <div className="grid grid-cols-3 gap-3 mb-3 pb-3 border-b border-green-500/20">
                <div className="text-center">
                  <div className="text-lg font-bold text-white">{result.stats.verified || 0}</div>
                  <div className="text-xs text-gray-400">Verified</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-white">{result.stats.avgFollowers ? result.stats.avgFollowers.toLocaleString() : 'N/A'}</div>
                  <div className="text-xs text-gray-400">Avg Followers</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-white">{result.stats.withBio || 0}%</div>
                  <div className="text-xs text-gray-400">Has Bio</div>
                </div>
              </div>
            )}
            
            <div className="text-xs text-gray-400">
              Cost: <strong className="text-green-300">${result.cost}</strong>
            </div>
          </div>

          {/* REAL Extracted Followers Preview */}
          {result.sample && result.sample.length > 0 && (
            <div className="bg-black/40 border border-gray-700 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-medium text-gray-300">
                  Real Extracted Followers ({result.sample.length} shown)
                </h4>
                <span className="text-xs text-green-400">● LIVE DATA - First {result.sample.length} of {result.count}</span>
              </div>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {(showAll ? result.sample : result.sample.slice(0, 50)).map((follower: any, idx: number) => (
                  <div key={idx} className="flex items-start gap-3 p-2 bg-black/40 rounded border border-gray-800 hover:border-purple-500/30 transition-colors">
                    {/* Selection Checkbox */}
                    <input
                      type="checkbox"
                      checked={selectedFollowers.has(follower.username)}
                      onChange={(e) => {
                        const newSelected = new Set(selectedFollowers)
                        if (e.target.checked) {
                          newSelected.add(follower.username)
                        } else {
                          newSelected.delete(follower.username)
                        }
                        setSelectedFollowers(newSelected)
                      }}
                      className="mt-3 w-4 h-4 text-purple-500 bg-gray-700 border-gray-600 rounded focus:ring-purple-500"
                    />
                    {follower.profileImage && (
                      <img src={follower.profileImage} alt="" className="w-10 h-10 rounded-full" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-white truncate">{follower.name || follower.username}</span>
                        {follower.verified && <span className="text-blue-400">✓</span>}
                      </div>
                      <div className="text-xs text-gray-500">@{follower.username}</div>
                      {follower.bio && (
                        <div className="text-xs text-gray-400 mt-1 line-clamp-2">{follower.bio}</div>
                      )}
                      <div className="flex gap-3 mt-1 text-xs text-gray-500">
                        <span>{follower.followersCount?.toLocaleString() || 0} followers</span>
                        {follower.location && <span>📍 {follower.location}</span>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Selection and Show More Controls */}
              <div className="flex gap-2 mt-3">
                {result.sample.length > 0 && (
                  <button
                    onClick={() => {
                      if (selectedFollowers.size === result.sample.length) {
                        setSelectedFollowers(new Set())
                      } else {
                        setSelectedFollowers(new Set(result.sample.map((f: any) => f.username)))
                      }
                    }}
                    className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-sm font-medium transition-all"
                  >
                    {selectedFollowers.size === result.sample.length ? '☐ Deselect All' : '☑ Select All'}
                  </button>
                )}
                {result.sample.length > 50 && (
                  <button
                    onClick={() => setShowAll(!showAll)}
                    className="flex-1 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-sm font-medium transition-all"
                  >
                    {showAll ? `▲ Show First 50` : `▼ Show All ${result.sample.length} Followers`}
                  </button>
                )}
              </div>
              {selectedFollowers.size > 0 && (
                <div className="mt-2 text-xs text-purple-400">
                  {selectedFollowers.size} followers selected
                </div>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={analyzeFollowers}
              disabled={analyzing}
              className="px-4 py-3 bg-purple-500/20 border border-purple-500/30 text-purple-300 hover:bg-purple-500/30 rounded-lg font-medium transition-all disabled:opacity-50"
            >
              {analyzing ? '⏳ Analyzing...' : selectedFollowers.size > 0 ? `📊 Analyze ${selectedFollowers.size} Selected` : '📊 Analyze Top 50'}
            </button>
            <button
              onClick={exportToCSV}
              className="px-4 py-3 bg-blue-500/20 border border-blue-500/30 text-blue-300 hover:bg-blue-500/30 rounded-lg font-medium transition-all"
            >
              {selectedFollowers.size > 0 ? `📥 Export ${selectedFollowers.size} Selected` : `📥 Export All (${result.sample.length})`}
            </button>
          </div>
        </div>
      )}

      {/* Action Button */}
      <button
        onClick={extractFollowers}
        disabled={loading || !username.trim()}
        className="w-full px-6 py-3 bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 disabled:from-gray-700 disabled:to-gray-700 text-white rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            Extracting followers...
          </span>
        ) : (
          '🚀 Extract Followers'
        )}
      </button>

      {/* Info Box */}
      <div className="mt-6 bg-black/40 border border-gray-700 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <svg className="w-5 h-5 text-purple-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="text-xs text-gray-400 space-y-1">
            <p><strong className="text-gray-300">How it works:</strong> Enter any X username and get complete follower profiles instantly.</p>
            <p><strong className="text-gray-300">What you get:</strong> Username, name, bio, follower count, verification status, profile image, location, and more.</p>
            <p><strong className="text-gray-300">Processing time:</strong> ~30 seconds per 1,000 followers.</p>
            <p><strong className="text-gray-300">Privacy:</strong> Only public data from public accounts. GDPR compliant.</p>
          </div>
        </div>
      </div>
    </div>
  )
}


