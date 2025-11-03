'use client'

import { useAuth } from '@/hooks/useAuth'
import { useState, useEffect } from 'react'
import Link from 'next/link'

export default function CompleteDashboard() {
  const { user, logout } = useAuth()
  const [followers, setFollowers] = useState<any[]>([])
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [extracting, setExtracting] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [username, setUsername] = useState('')
  const [selectedAccount, setSelectedAccount] = useState<string | null>(null)
  const [selectedUsernames, setSelectedUsernames] = useState<Set<string>>(new Set())
  const [myAccount, setMyAccount] = useState<string | null>(null)
  const [trackedAccounts, setTrackedAccounts] = useState<any[]>([])
  const [activeView, setActiveView] = useState<'overview' | 'verified' | 'influencers' | 'unfollowers'>('overview')
  const [subscription, setSubscription] = useState<any>(null)
  const [usage, setUsage] = useState<any>(null)
  const [verifying, setVerifying] = useState(false)
  const [showBulkModal, setShowBulkModal] = useState(false)
  const [bulkUsernames, setBulkUsernames] = useState('')

  useEffect(() => {
    if (user) {
      loadDashboard()
      loadSubscription()
    }
  }, [user])

  const loadSubscription = async () => {
    if (!user) return
    try {
      const token = await user.getIdToken()
      const response = await fetch('/api/subscription', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (response.ok) {
        const data = await response.json()
        setSubscription(data)
      }
    } catch (err) {
      console.error('Failed to load subscription:', err)
    }
  }

  const loadDashboard = async () => {
    if (!user) return
    
    try {
      const token = await user.getIdToken()
      
      // Load followers
      const followersRes = await fetch('/api/followers/stored', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      
      if (followersRes.ok) {
        const data = await followersRes.json()
        const followersList = data.followers || []
        setFollowers(followersList)
        
        // Calculate comprehensive stats
        const verified = followersList.filter((f: any) => f.verified).length
        const avgFollowers = followersList.length > 0
          ? Math.round(followersList.reduce((sum: number, f: any) => sum + (f.followersCount || 0), 0) / followersList.length)
          : 0
        const withBio = followersList.filter((f: any) => f.bio?.trim()).length
        const highValue = followersList.filter((f: any) => (f.followersCount || 0) > 10000).length
        const microInfluencers = followersList.filter((f: any) => (f.followersCount || 0) >= 1000 && (f.followersCount || 0) <= 100000).length
        const unfollowers = followersList.filter((f: any) => f.status === 'unfollowed').length
        
        setStats({
          total: followersList.length,
          verified,
          verifiedPct: followersList.length > 0 ? ((verified / followersList.length) * 100).toFixed(1) : '0',
          avgFollowers,
          withBio,
          withBioPct: followersList.length > 0 ? ((withBio / followersList.length) * 100).toFixed(1) : '0',
          highValue,
          highValuePct: followersList.length > 0 ? ((highValue / followersList.length) * 100).toFixed(1) : '0',
          microInfluencers,
          microInfluencersPct: followersList.length > 0 ? ((microInfluencers / followersList.length) * 100).toFixed(1) : '0',
          unfollowers
        })
        
        setMyAccount(data.targetUsername)
      }
      
      // Load tracked accounts
      const accountsRes = await fetch('/api/accounts/tracked', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      
      if (accountsRes.ok) {
        const accountsData = await accountsRes.json()
        setTrackedAccounts(accountsData.accounts || [])
      }
    } catch (err) {
      console.error('Failed to load dashboard:', err)
    } finally {
      setLoading(false)
    }
  }

  const extractFollowers = async () => {
    if (!username.trim() || !user) return
    
    setExtracting(true)
    try {
      const token = await user.getIdToken()
      const response = await fetch('/api/apify/extract-followers', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username: username.trim(), maxFollowers: 1000 })
      })
      
      if (response.ok) {
        await loadDashboard()
        setUsername('')
      }
    } catch (err) {
      console.error('Extraction failed:', err)
    } finally {
      setExtracting(false)
    }
  }

  const exportToCSV = () => {
    setExporting(true)
    try {
      const csv = [
        ['Username', 'Name', 'Verified', 'Followers', 'Following', 'Bio', 'Location'],
        ...followers.map(f => [
          f.username,
          f.name,
          f.verified ? 'Yes' : 'No',
          f.followersCount || 0,
          f.following_count || 0,
          (f.bio || '').replace(/,/g, ';'),
          f.location || ''
        ])
      ].map(row => row.join(',')).join('\n')
      
      const blob = new Blob([csv], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `followlytics-${myAccount || 'export'}-${Date.now()}.csv`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Export failed:', err)
    } finally {
      setExporting(false)
    }
  }

  const verifiedFollowers = followers.filter(f => f.verified)
  const influencers = followers.filter(f => (f.followersCount || 0) >= 10000).sort((a, b) => (b.followersCount || 0) - (a.followersCount || 0))
  const unfollowers = followers.filter(f => f.status === 'unfollowed')

  return (
    <div className="min-h-screen bg-[#0f1419] text-gray-100">
      {/* Header */}
      <header className="border-b border-gray-800 bg-[#15191e]">
        <div className="max-w-[1800px] mx-auto px-6 py-3 flex items-center justify-between">
          <Link href="/" className="text-xl font-semibold tracking-tight text-white">
            FOLLOWLYTICS
          </Link>
          <div className="flex items-center gap-6">
            {subscription && (
              <div className="flex items-center gap-3">
                <span className={`text-xs px-3 py-1 rounded uppercase font-semibold ${
                  subscription.tier === 'enterprise' ? 'bg-purple-500/20 text-purple-400' :
                  subscription.tier === 'pro' ? 'bg-blue-500/20 text-blue-400' :
                  subscription.tier === 'starter' ? 'bg-green-500/20 text-green-400' :
                  'bg-gray-500/20 text-gray-400'
                }`}>
                  {subscription.tier}
                </span>
                {subscription.tier === 'free' && (
                  <Link href="/pricing" className="text-xs px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-white font-medium">
                    UPGRADE
                  </Link>
                )}
              </div>
            )}
            <span className="text-sm text-gray-400 font-mono">{user?.email}</span>
            <button
              onClick={logout}
              className="text-sm text-gray-400 hover:text-white transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-[1800px] mx-auto px-6 py-6">
        {/* Account Tracker */}
        <div className="bg-[#15191e] border border-gray-800 rounded-lg p-4 mb-6">
          <h3 className="text-xs uppercase tracking-wide text-gray-400 mb-3">Account Manager</h3>
          <div className="flex items-center gap-4 mb-4">
            {myAccount && (
              <button
                onClick={() => setSelectedAccount(null)}
                className={`flex items-center gap-2 px-3 py-2 rounded cursor-pointer transition-all ${
                  !selectedAccount 
                    ? 'bg-blue-500/20 border-2 border-blue-500 text-blue-400' 
                    : 'bg-blue-500/10 border border-blue-500/30 text-blue-400 hover:bg-blue-500/15'
                }`}
              >
                <span className="text-xs text-gray-400">MY:</span>
                <span className="text-sm font-mono font-semibold">@{myAccount}</span>
                <span className="text-xs text-gray-500">({stats?.total || 0} followers) [Tracks unfollows]</span>
              </button>
            )}
            {trackedAccounts.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400">COMPETITORS:</span>
                {trackedAccounts.map((acc, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedAccount(acc.username)}
                    className={`text-xs px-3 py-2 rounded cursor-pointer transition-all font-mono ${
                      selectedAccount === acc.username
                        ? 'bg-purple-500/20 border-2 border-purple-500 text-purple-400'
                        : 'bg-purple-500/10 border border-purple-500/30 text-purple-400 hover:bg-purple-500/15'
                    }`}
                  >
                    @{acc.username}
                  </button>
                ))}
              </div>
            )}
          </div>
          
          {/* Extract Section */}
          <div className="flex gap-3">
            <input
              type="text"
              placeholder="Extract followers from any account..."
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && extractFollowers()}
              className="flex-1 bg-[#0f1419] border border-gray-700 rounded px-4 py-2 text-sm focus:outline-none focus:border-blue-500 transition-colors font-mono"
              disabled={extracting}
            />
            <button
              onClick={extractFollowers}
              disabled={extracting || !username.trim()}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed rounded text-sm font-medium transition-colors"
            >
              {extracting ? 'EXTRACTING...' : 'EXTRACT'}
            </button>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-20 text-gray-500">Loading analytics...</div>
        ) : !stats ? (
          <div className="text-center py-20 text-gray-500">No data yet. Extract followers to begin analysis.</div>
        ) : (
          <>
            {/* View Tabs */}
            <div className="flex items-center gap-4 mb-6">
              <button
                onClick={() => setActiveView('overview')}
                className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
                  activeView === 'overview'
                    ? 'bg-blue-600 text-white'
                    : 'bg-[#15191e] text-gray-400 hover:text-white border border-gray-800'
                }`}
              >
                Overview ({stats.total})
              </button>
              <button
                onClick={() => setActiveView('verified')}
                className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
                  activeView === 'verified'
                    ? 'bg-blue-600 text-white'
                    : 'bg-[#15191e] text-gray-400 hover:text-white border border-gray-800'
                }`}
              >
                Verified ({stats.verified})
              </button>
              <button
                onClick={() => setActiveView('influencers')}
                className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
                  activeView === 'influencers'
                    ? 'bg-blue-600 text-white'
                    : 'bg-[#15191e] text-gray-400 hover:text-white border border-gray-800'
                }`}
              >
                Influencers ({influencers.length})
              </button>
              
              {!selectedAccount && (
                <button
                  onClick={() => setActiveView('unfollowers')}
                  className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
                    activeView === 'unfollowers'
                      ? 'bg-red-600 text-white'
                      : 'bg-[#15191e] text-gray-400 hover:text-white border border-gray-800'
                  }`}
                >
                  Unfollowers ({stats.unfollowers || 0})
                </button>
              )}
              
              <div className="ml-auto flex gap-2">
                <button
                  onClick={() => setShowBulkModal(true)}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded text-sm font-medium"
                >
                  BULK EXTRACT
                </button>
                <button
                  onClick={async () => {
                    if (!user || followers.length === 0) return
                    setVerifying(true)
                    try {
                      const token = await user.getIdToken()
                      
                      // Check selected users OR all unverified
                      let usernamesToCheck: string[]
                      if (selectedUsernames.size > 0) {
                        usernamesToCheck = Array.from(selectedUsernames)
                        console.log(`Verifying ${usernamesToCheck.length} SELECTED users`)
                      } else {
                        usernamesToCheck = followers
                          .filter(f => f.verified === undefined || f.verified === false)
                          .map(f => f.username)
                        console.log(`Verifying ALL ${usernamesToCheck.length} unverified users`)
                      }
                      
                      if (usernamesToCheck.length === 0) {
                        alert('All followers already verified!')
                        setVerifying(false)
                        return
                      }
                      
                      // Process in batches of 50
                      const batchSize = 50
                      let totalChecked = 0
                      let totalVerified = 0
                      
                      for (let i = 0; i < usernamesToCheck.length; i += batchSize) {
                        const batch = usernamesToCheck.slice(i, i + batchSize)
                        console.log(`Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(usernamesToCheck.length/batchSize)}`)
                        
                        const response = await fetch('/api/verify-enrich-apify', {
                          method: 'POST',
                          headers: {
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'application/json'
                          },
                          body: JSON.stringify({ usernames: batch })
                        })
                        
                        if (response.ok) {
                          const data = await response.json()
                          totalChecked += data.checked
                          totalVerified += data.verified
                        }
                        
                        // Small delay between batches
                        if (i + batchSize < usernamesToCheck.length) {
                          await new Promise(resolve => setTimeout(resolve, 2000))
                        }
                      }
                      
                      alert(`✅ Verified & enriched ${totalChecked} followers. ${totalVerified} verified!`)
                      setSelectedUsernames(new Set())
                      await loadDashboard()
                    } catch (err) {
                      console.error('Verification failed:', err)
                      alert('Verification failed. Check console for details.')
                    } finally {
                      setVerifying(false)
                    }
                  }}
                  disabled={verifying || followers.length === 0}
                  className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-700 rounded text-sm font-medium"
                >
                  {verifying ? 'CHECKING...' : selectedUsernames.size > 0 ? `✓ VERIFY ${selectedUsernames.size}` : '✓ VERIFY ALL'}
                </button>
                <button
                  onClick={exportToCSV}
                  disabled={exporting || followers.length === 0}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-700 disabled:cursor-not-allowed rounded text-sm font-medium transition-colors"
                >
                  {exporting ? 'EXPORTING...' : '↓ EXPORT CSV'}
                </button>
              </div>
            </div>

            {/* Bulk Modal */}
            {showBulkModal && (
              <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
                <div className="bg-[#15191e] border border-gray-800 rounded-lg max-w-2xl w-full p-6">
                  <h3 className="text-lg font-semibold mb-4">Bulk Extract Followers</h3>
                  <p className="text-sm text-gray-400 mb-4">Enter one username per line (up to 10 accounts)</p>
                  <textarea
                    value={bulkUsernames}
                    onChange={(e) => setBulkUsernames(e.target.value)}
                    placeholder="elonmusk&#10;BillGates&#10;BarackObama"
                    className="w-full bg-[#0f1419] border border-gray-700 rounded px-4 py-3 text-sm font-mono mb-4 h-48"
                  />
                  <div className="flex gap-3 justify-end">
                    <button
                      onClick={() => setShowBulkModal(false)}
                      className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded text-sm"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => {
                        const usernames = bulkUsernames.split('\n').map(u => u.trim()).filter(Boolean)
                        usernames.forEach(async (u) => {
                          setUsername(u)
                          await extractFollowers()
                        })
                        setShowBulkModal(false)
                      }}
                      disabled={!bulkUsernames.trim()}
                      className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 rounded text-sm font-medium"
                    >
                      Extract All
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Metrics Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-[#15191e] border border-gray-800 rounded-lg p-4">
                <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Total Followers</div>
                <div className="text-3xl font-bold font-mono text-white">{stats.total.toLocaleString()}</div>
              </div>

              <div className="bg-[#15191e] border border-gray-800 rounded-lg p-4">
                <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Verified</div>
                <div className="text-3xl font-bold font-mono text-blue-400">{stats.verified.toLocaleString()}</div>
                <div className="text-xs text-gray-500 mt-1">{stats.verifiedPct}% of total</div>
              </div>

              <div className="bg-[#15191e] border border-gray-800 rounded-lg p-4">
                <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Avg Followers</div>
                <div className="text-3xl font-bold font-mono text-white">{stats.avgFollowers.toLocaleString()}</div>
              </div>

              <div className="bg-[#15191e] border border-gray-800 rounded-lg p-4">
                <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">High Value (&gt;10K)</div>
                <div className="text-3xl font-bold font-mono text-green-400">{stats.highValue.toLocaleString()}</div>
                <div className="text-xs text-gray-500 mt-1">{stats.highValuePct}% of total</div>
              </div>

              <div className="bg-[#15191e] border border-gray-800 rounded-lg p-4">
                <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Micro-Influencers</div>
                <div className="text-3xl font-bold font-mono text-purple-400">{stats.microInfluencers.toLocaleString()}</div>
                <div className="text-xs text-gray-500 mt-1">{stats.microInfluencersPct}% of total</div>
              </div>

              <div className="bg-[#15191e] border border-gray-800 rounded-lg p-4">
                <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Bio Completion</div>
                <div className="text-3xl font-bold font-mono text-white">{stats.withBioPct}%</div>
                <div className="text-xs text-gray-500 mt-1">{stats.withBio} have bios</div>
              </div>

              <div className="bg-[#15191e] border border-gray-800 rounded-lg p-4">
                <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Verification Rate</div>
                <div className="text-3xl font-bold font-mono text-blue-400">{stats.verifiedPct}%</div>
                <div className="text-xs text-gray-500 mt-1">
                  {parseFloat(stats.verifiedPct) > 5 ? 'Above avg' : 'Below avg'}
                </div>
              </div>

              <div className="bg-[#15191e] border border-gray-800 rounded-lg p-4">
                <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Quality Score</div>
                <div className="text-3xl font-bold font-mono text-white">
                  {Math.round(
                    (parseFloat(stats.verifiedPct) * 0.3) +
                    (parseFloat(stats.withBioPct) * 0.3) +
                    (parseFloat(stats.highValuePct) * 0.4)
                  )}
                </div>
                <div className="text-xs text-gray-500 mt-1">Out of 100</div>
              </div>
            </div>

            {/* Content Views */}
            {activeView === 'overview' && (
              <div className="bg-[#15191e] border border-gray-800 rounded-lg overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-800">
                  <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-300">
                    All Followers ({followers.length.toLocaleString()})
                  </h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-[#0f1419] text-xs uppercase text-gray-500">
                      <tr>
                        <th className="px-6 py-3 text-left font-medium">User</th>
                        <th className="px-6 py-3 text-right font-medium font-mono">Followers</th>
                        <th className="px-6 py-3 text-center font-medium">Verified</th>
                        <th className="px-6 py-3 text-left font-medium">Bio</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800">
                      {followers.slice(0, 50).map((follower, idx) => (
                        <tr key={idx} className="hover:bg-[#1a1f26] transition-colors">
                          <td className="px-6 py-3">
                            <div className="flex items-center gap-3">
                              <img src={follower.profileImage} alt="" className="w-8 h-8 rounded-full" />
                              <div>
                                <div className="font-medium text-white">{follower.name}</div>
                                <div className="text-xs text-gray-500 font-mono">@{follower.username}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-3 text-right font-mono text-white">
                            {(follower.followersCount || 0).toLocaleString()}
                          </td>
                          <td className="px-6 py-3 text-center">
                            {follower.verified && <span className="text-blue-400">✓</span>}
                          </td>
                          <td className="px-6 py-3 text-gray-400 text-xs truncate max-w-[400px]">
                            {follower.bio || <span className="text-gray-700">No bio</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeView === 'verified' && (
              <div className="bg-[#15191e] border border-gray-800 rounded-lg overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-800">
                  <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-300">
                    Verified Followers ({verifiedFollowers.length.toLocaleString()})
                  </h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-6">
                  {verifiedFollowers.map((follower, idx) => (
                    <div key={idx} className="bg-[#0f1419] border border-gray-800 rounded-lg p-4 flex items-start gap-4">
                      <img src={follower.profileImage} alt="" className="w-12 h-12 rounded-full" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-white">{follower.name}</span>
                          <span className="text-blue-400">✓</span>
                        </div>
                        <div className="text-xs text-gray-500 font-mono mb-2">@{follower.username}</div>
                        <div className="text-xs text-gray-400 mb-2">{follower.bio}</div>
                        <div className="text-xs text-gray-500 font-mono">
                          {(follower.followersCount || 0).toLocaleString()} followers
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeView === 'influencers' && (
              <div className="bg-[#15191e] border border-gray-800 rounded-lg overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-800">
                  <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-300">
                    High-Value Influencers (&gt;10K followers)
                  </h2>
                </div>
                <div className="divide-y divide-gray-800">
                  {influencers.map((follower, idx) => (
                    <div key={idx} className="p-6 hover:bg-[#1a1f26] transition-colors flex items-start gap-4">
                      <img src={follower.profileImage} alt="" className="w-16 h-16 rounded-full" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-white text-lg">{follower.name}</span>
                          {follower.verified && <span className="text-blue-400 text-lg">✓</span>}
                        </div>
                        <div className="text-sm text-gray-400 font-mono mb-2">@{follower.username}</div>
                        <div className="text-sm text-gray-300 mb-3">{follower.bio}</div>
                        <div className="flex items-center gap-6 text-sm">
                          <div>
                            <span className="text-gray-500">Followers:</span>
                            <span className="ml-2 font-mono text-white font-semibold">
                              {(follower.followersCount || 0).toLocaleString()}
                            </span>
                          </div>
                          {follower.location && (
                            <div>
                              <span className="text-gray-500">Location:</span>
                              <span className="ml-2 text-gray-300">{follower.location}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeView === 'unfollowers' && (
              <div className="bg-[#15191e] border border-gray-800 rounded-lg overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-800">
                  <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-300">
                    Recent Unfollowers ({unfollowers.length})
                  </h2>
                  <p className="text-xs text-gray-500 mt-1">These users unfollowed you since your last extraction</p>
                </div>
                {unfollowers.length === 0 ? (
                  <div className="p-12 text-center">
                    <p className="text-gray-500 mb-2">No unfollowers detected</p>
                    <p className="text-xs text-gray-600">Re-extract your account to detect new unfollows</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-800">
                    {unfollowers.map((follower, idx) => (
                      <div key={idx} className="p-6 bg-red-500/5 hover:bg-red-500/10 transition-colors flex items-start gap-4">
                        <img src={follower.profileImage} alt="" className="w-12 h-12 rounded-full opacity-60" />
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-white">{follower.name}</span>
                            {follower.verified && <span className="text-blue-400">✓</span>}
                            <span className="ml-auto text-xs text-red-400">UNFOLLOWED</span>
                          </div>
                          <div className="text-sm text-gray-400 font-mono mb-2">@{follower.username}</div>
                          <div className="text-sm text-gray-400 mb-2">{follower.bio}</div>
                          <div className="flex items-center gap-6 text-xs text-gray-500">
                            <div>
                              <span>Followers:</span>
                              <span className="ml-1 font-mono">{(follower.followersCount || 0).toLocaleString()}</span>
                            </div>
                            {follower.last_seen && (
                              <div>
                                <span>Last seen:</span>
                                <span className="ml-1">{new Date(follower.last_seen).toLocaleDateString()}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}
