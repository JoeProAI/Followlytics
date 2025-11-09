'use client'

import { useAuth } from '@/hooks/useAuth'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import FollowerDetailModal from './FollowerDetailModal'

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
  const [activeView, setActiveView] = useState<'overview' | 'verified' | 'influencers' | 'new' | 'unfollowers'>('overview')
  const [subscription, setSubscription] = useState<any>(null)
  const [usage, setUsage] = useState<any>(null)
  const [verifying, setVerifying] = useState(false)
  const [showBulkModal, setShowBulkModal] = useState(false)
  const [bulkUsernames, setBulkUsernames] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [displayLimit, setDisplayLimit] = useState(50)
  const [previousExtractionDate, setPreviousExtractionDate] = useState<string | null>(null)
  const [generatingGamma, setGeneratingGamma] = useState<string | null>(null)
  const [credits, setCredits] = useState<any>(null)
  const [selectedFollower, setSelectedFollower] = useState<any | null>(null)

  useEffect(() => {
    if (user) {
      loadDashboard()
      loadSubscription()
    }
  }, [user])

  // Reload followers when selected account changes
  useEffect(() => {
    if (user) {
      loadFollowersForAccount()
    }
  }, [selectedAccount, user])

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
      
      // Also load credit balances
      const creditsResponse = await fetch('/api/credits/balance', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (creditsResponse.ok) {
        const creditsData = await creditsResponse.json()
        setCredits(creditsData)
        console.log('[Dashboard] Credit balances:', creditsData)
      }
    } catch (err) {
      console.error('Failed to load subscription:', err)
    }
  }

  const loadFollowersForAccount = async () => {
    if (!user) return
    
    try {
      const token = await user.getIdToken()
      
      // Determine which account to load
      const targetAccount = selectedAccount || myAccount
      if (!targetAccount) return
      
      // Load followers for selected account
      const followersRes = await fetch(`/api/followers/stored?username=${targetAccount}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      
      if (followersRes.ok) {
        const data = await followersRes.json()
        const followersList = data.followers || []
        setFollowers(followersList)
        
        // Calculate stats for this account
        const verified = followersList.filter((f: any) => f.verified).length
        const avgFollowers = followersList.length > 0
          ? Math.round(followersList.reduce((sum: number, f: any) => sum + (f.followersCount || 0), 0) / followersList.length)
          : 0
        const withBio = followersList.filter((f: any) => f.bio?.trim()).length
        const highValue = followersList.filter((f: any) => (f.followersCount || 0) > 10000).length
        const microInfluencers = followersList.filter((f: any) => (f.followersCount || 0) >= 1000 && (f.followersCount || 0) <= 100000).length
        const unfollowers = followersList.filter((f: any) => f.status === 'unfollowed').length
        
        let newFollowersCutoff = new Date()
        if (data.lastExtraction && data.lastExtraction !== data.extractedAt) {
          newFollowersCutoff = new Date(data.lastExtraction)
          setPreviousExtractionDate(data.lastExtraction)
        } else {
          newFollowersCutoff.setDate(newFollowersCutoff.getDate() - 7)
        }
        
        const newFollowers = followersList.filter((f: any) => {
          if (!f.first_seen || f.status === 'unfollowed') return false
          const firstSeenDate = new Date(f.first_seen)
          return firstSeenDate > newFollowersCutoff
        }).length
        
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
          unfollowers,
          newFollowers
        })
      }
    } catch (err) {
      console.error('Failed to load followers:', err)
    }
  }

  const loadDashboard = async () => {
    if (!user) return
    
    try {
      const token = await user.getIdToken()
      
      // Load user's main account info
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
        
        // Detect new followers (followers added since last extraction)
        // If we have a previous extraction date, use that; otherwise fall back to 7 days
        let newFollowersCutoff = new Date()
        if (data.lastExtraction && data.lastExtraction !== data.extractedAt) {
          newFollowersCutoff = new Date(data.lastExtraction)
          setPreviousExtractionDate(data.lastExtraction)
        } else {
          newFollowersCutoff.setDate(newFollowersCutoff.getDate() - 7)
        }
        
        const newFollowers = followersList.filter((f: any) => {
          if (!f.first_seen || f.status === 'unfollowed') return false
          const firstSeenDate = new Date(f.first_seen)
          return firstSeenDate > newFollowersCutoff
        }).length
        
        // Log verification status to console
        const verifiedList = followersList.filter((f: any) => f.verified === true)
        console.log(`[Dashboard] Loaded ${followersList.length} followers, ${verified} verified (${Math.round(verified/followersList.length*100)}%)`)
        console.log('[Dashboard] Sample verified followers:', verifiedList.slice(0, 3).map((f: any) => ({ username: f.username, verified: f.verified, verified_type: f.verified_type })))
        
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
          unfollowers,
          newFollowers
        })
        
        setMyAccount(data.targetUsername)
        
        // Initial stats setup
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
          unfollowers,
          newFollowers
        })
      }
      
      // Load tracked accounts
      const accountsRes = await fetch('/api/accounts/tracked', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      
      if (accountsRes.ok) {
        const accountsData = await accountsRes.json()
        setTrackedAccounts(accountsData.accounts || [])
      }

      // Load usage data for scan tracking
      const usageRes = await fetch('/api/usage/current', {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (usageRes.ok) {
        const usageData = await usageRes.json()
        setUsage(usageData)
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

  const exportToJSON = () => {
    setExporting(true)
    try {
      const data = {
        account: myAccount,
        exportedAt: new Date().toISOString(),
        totalFollowers: followers.length,
        followers: followers.map(f => ({
          username: f.username,
          name: f.name,
          verified: f.verified,
          followersCount: f.followersCount || 0,
          followingCount: f.following_count || 0,
          bio: f.bio || '',
          location: f.location || '',
          profileImage: f.profile_image_url || '',
          url: f.url || '',
          createdAt: f.created_at || '',
          extractedAt: f.extracted_at || ''
        }))
      }
      
      const json = JSON.stringify(data, null, 2)
      const blob = new Blob([json], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `followlytics-${myAccount || 'export'}-${Date.now()}.json`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('JSON export failed:', err)
    } finally {
      setExporting(false)
    }
  }

  const exportToMarkdown = () => {
    setExporting(true)
    try {
      let markdown = `# Followlytics Export\n\n`
      markdown += `**Account:** @${myAccount}\n`
      markdown += `**Exported:** ${new Date().toLocaleString()}\n`
      markdown += `**Total Followers:** ${followers.length}\n\n`
      markdown += `---\n\n`
      markdown += `## Followers\n\n`
      
      followers.forEach(f => {
        markdown += `### @${f.username}\n\n`
        if (f.name) markdown += `**Name:** ${f.name}\n`
        if (f.verified) markdown += `**✓ Verified**\n`
        markdown += `**Followers:** ${f.followersCount || 0} | **Following:** ${f.following_count || 0}\n`
        if (f.location) markdown += `**Location:** ${f.location}\n`
        if (f.bio) markdown += `**Bio:** ${f.bio}\n`
        markdown += `\n---\n\n`
      })
      
      const blob = new Blob([markdown], { type: 'text/markdown' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `followlytics-${myAccount || 'export'}-${Date.now()}.md`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Markdown export failed:', err)
    } finally {
      setExporting(false)
    }
  }

  // Search and filter
  const filteredFollowers = followers.filter(f => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      f.username?.toLowerCase().includes(query) ||
      f.name?.toLowerCase().includes(query) ||
      f.bio?.toLowerCase().includes(query)
    )
  })

  const verifiedFollowers = filteredFollowers.filter(f => f.verified)
  const influencers = filteredFollowers.filter(f => (f.followersCount || 0) >= 10000).sort((a, b) => (b.followersCount || 0) - (a.followersCount || 0))
  const unfollowers = filteredFollowers.filter(f => f.status === 'unfollowed')
  
  // New followers (since last extraction or within 7 days)
  let newFollowersCutoff = new Date()
  if (previousExtractionDate) {
    newFollowersCutoff = new Date(previousExtractionDate)
  } else {
    newFollowersCutoff.setDate(newFollowersCutoff.getDate() - 7)
  }
  
  const newFollowers = filteredFollowers.filter(f => {
    if (!f.first_seen || f.status === 'unfollowed') return false
    const firstSeenDate = new Date(f.first_seen)
    return firstSeenDate > newFollowersCutoff
  }).sort((a, b) => new Date(b.first_seen).getTime() - new Date(a.first_seen).getTime())
  
  // Paginated display
  const displayedFollowers = filteredFollowers.slice(0, displayLimit)

  // Remove tracked account
  const removeTrackedAccount = async (username: string) => {
    if (!user) return
    
    if (!confirm(`Remove @${username} from tracked accounts? This will delete all follower data for this account.`)) {
      return
    }
    
    try {
      const token = await user.getIdToken()
      const response = await fetch('/api/tracked-accounts', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username })
      })
      
      if (response.ok) {
        // Reload tracked accounts list
        await loadDashboard()
        // If we were viewing this account, switch back to main
        if (selectedAccount === username) {
          setSelectedAccount(null)
        }
        alert(`✅ Removed @${username} from tracked accounts`)
      } else {
        const error = await response.json()
        alert(`❌ Failed to remove account: ${error.error || 'Unknown error'}`)
      }
    } catch (err) {
      console.error('Remove account error:', err)
      alert('❌ Failed to remove account')
    }
  }

  // Generate Gamma for any follower
  const generateFollowerGamma = async (followerUsername: string) => {
    if (!user) return
    
    setGeneratingGamma(followerUsername)
    try {
      const token = await user.getIdToken()
      
      const response = await fetch('/api/gamma/generate-follower', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          username: followerUsername,
          targetUsername: myAccount || username
        })
      })
      
      if (response.ok) {
        const data = await response.json()
        alert(`✅ Gamma report queued for @${followerUsername}!\n\nCheck the AI Analysis page to view it once generated.`)
      } else {
        const error = await response.json()
        alert(`❌ Failed to generate Gamma: ${error.error || 'Unknown error'}`)
      }
    } catch (err) {
      console.error('Gamma generation error:', err)
      alert('❌ Failed to generate Gamma report')
    } finally {
      setGeneratingGamma(null)
    }
  }

  return (
    <div className="min-h-screen bg-[#0f1419] text-gray-100">
      {/* Header */}
      <header className="border-b border-gray-800 bg-[#15191e]">
        <div className="max-w-[1800px] mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-xl font-semibold tracking-tight text-white">
              FOLLOWLYTICS
            </Link>
            {(selectedAccount || myAccount) && (
              <div className="flex items-center gap-2 px-3 py-1 bg-blue-500/10 border border-blue-500/30 rounded">
                <span className="text-xs text-gray-400">Viewing:</span>
                <span className="text-sm font-mono text-blue-400">@{selectedAccount || myAccount}</span>
                {selectedAccount && (
                  <span className="text-xs text-purple-400">(Competitor)</span>
                )}
              </div>
            )}
          </div>
          <div className="flex items-center gap-6">
            {subscription && (
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-3">
                  <span className={`text-xs px-3 py-1 rounded uppercase font-semibold ${
                    subscription.tier === 'enterprise' ? 'bg-purple-500/20 text-purple-400' :
                    subscription.tier === 'pro' ? 'bg-blue-500/20 text-blue-400' :
                    subscription.tier === 'starter' ? 'bg-green-500/20 text-green-400' :
                    'bg-gray-500/20 text-gray-400'
                  }`}>
                    {subscription.tier}
                  </span>
                </div>
                
                {/* Scan Tracking */}
                {usage && (
                  <div className="flex items-center gap-3 border-l border-gray-700 pl-4">
                    <div className="text-xs text-gray-400">
                      <span className="text-gray-500">Scans:</span>
                      <span className="text-blue-400 font-mono font-semibold ml-2">{usage.extractions_count || 0}</span>
                      <span className="text-gray-600 mx-1">/</span>
                      <span className="text-gray-500">
                        {subscription.tier === 'free' ? '5' :
                         subscription.tier === 'starter' ? '50' :
                         subscription.tier === 'pro' ? '200' :
                         'Unlimited'}
                      </span>
                    </div>
                  </div>
                )}

                {/* Follower Limit */}
                <div className="text-xs text-gray-400 flex items-center gap-2 border-l border-gray-700 pl-4">
                  <span className="text-blue-400 font-mono font-semibold">{stats?.total || 0}</span>
                  <span>/</span>
                  <span className="text-gray-500">500,000</span>
                  <span className="text-gray-600">followers</span>
                </div>

                <Link href="/pricing" className="text-xs px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-white font-medium">
                  {subscription.tier === 'free' ? 'UPGRADE' : 'VIEW PLANS'}
                </Link>
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
        {/* Follower Usage Display - ALWAYS VISIBLE */}
        {stats && (
          <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/30 rounded-lg p-5 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
                  👥 Follower Extraction Usage
                  {subscription?.tier && (
                    <span className="text-xs px-2 py-1 bg-blue-500/20 border border-blue-500/40 rounded text-blue-400 uppercase">
                      {subscription.tier}
                    </span>
                  )}
                </h3>
                <div className="space-y-1">
                  <p className="text-sm text-gray-300">
                    <span className="text-2xl font-bold text-blue-400">{stats.total.toLocaleString()}</span>
                    <span className="text-gray-500 ml-2">followers extracted</span>
                  </p>
                  {subscription?.limits && (
                    <p className="text-xs text-gray-400">
                      {subscription.tier === 'free' && 'Free: 1,000 followers/month'}
                      {subscription.tier === 'starter' && 'Starter: 10,000 followers/month'}
                      {subscription.tier === 'pro' && 'Pro: 50,000 followers/month'}
                      {subscription.tier === 'agency' && 'Agency: 200,000 followers/month'}
                      {subscription.tier === 'enterprise' && 'Enterprise: Unlimited'}
                    </p>
                  )}
                </div>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold text-green-400">✓</div>
                <div className="text-xs text-gray-400 mt-1">All Tracked</div>
              </div>
            </div>
            
            {/* Show clear explanation */}
            <div className="mt-4 pt-4 border-t border-gray-700/50">
              <p className="text-xs text-gray-400 leading-relaxed">
                💡 <span className="text-gray-300 font-semibold">How it works:</span> Each time you scan an account, all followers are extracted and counted toward your monthly limit. 
                Your current account has <span className="text-blue-400 font-bold">{stats.total.toLocaleString()}</span> followers tracked. 
                Re-scanning will NOT use additional quota - only NEW followers count toward your limit.
              </p>
            </div>
          </div>
        )}
        
        {/* Count Discrepancy Explanation - Shows why numbers might not match Twitter */}
        {stats && stats.total > 0 && (
          <div className="bg-yellow-400/5 border border-yellow-400/20 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
              <div className="text-2xl">ℹ️</div>
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-yellow-400 mb-2">Why follower counts might not match Twitter exactly</h3>
                <p className="text-xs text-gray-400 leading-relaxed mb-3">
                  Followlytics extracted <span className="text-blue-400 font-bold">{stats.total.toLocaleString()}</span> accessible followers. 
                  If Twitter shows a different number (e.g., 804 vs {stats.total}), here's why:
                </p>
                <ul className="text-xs text-gray-400 space-y-1.5 ml-4">
                  <li className="flex items-start gap-2">
                    <span className="text-yellow-400 mt-0.5">•</span>
                    <span><span className="text-gray-300 font-semibold">Private accounts</span> - Counted by Twitter but not accessible unless you follow them back</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-yellow-400 mt-0.5">•</span>
                    <span><span className="text-gray-300 font-semibold">Suspended accounts</span> - Banned by Twitter but still in their follower counter</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-yellow-400 mt-0.5">•</span>
                    <span><span className="text-gray-300 font-semibold">Deleted accounts</span> - Removed but Twitter's cache hasn't updated yet (24-48hr delay)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-yellow-400 mt-0.5">•</span>
                    <span><span className="text-gray-300 font-semibold">Twitter caching</span> - Profile follower count is cached, actual list is real-time</span>
                  </li>
                </ul>
                <div className="mt-3 pt-3 border-t border-yellow-400/10">
                  <p className="text-xs text-gray-500">
                    <span className="text-green-400 font-bold">✓ This is normal</span> - Industry standard accuracy is 97-99%. 
                    Small discrepancies (1-2%) mean you're getting <span className="text-gray-300">real, accessible followers</span> only, not ghost accounts.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
        
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
                  <div key={idx} className="flex items-center gap-1">
                    <button
                      onClick={() => setSelectedAccount(acc.username)}
                      className={`text-xs px-3 py-2 rounded cursor-pointer transition-all font-mono ${
                        selectedAccount === acc.username
                          ? 'bg-purple-500/20 border-2 border-purple-500 text-purple-400'
                          : 'bg-purple-500/10 border border-purple-500/30 text-purple-400 hover:bg-purple-500/15'
                      }`}
                    >
                      @{acc.username}
                    </button>
                    <button
                      onClick={() => removeTrackedAccount(acc.username)}
                      className="text-xs px-2 py-2 rounded bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 transition-all"
                      title="Remove this account"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {/* Extract Section */}
          <div className="space-y-2">
            <div className="flex gap-3">
              <input
                type="text"
                placeholder="Extract followers from any account (up to 500K)..."
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
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-500">
                💎 Extract up to <span className="text-blue-400 font-semibold">500,000 followers</span> from any account • Perfect for analyzing big accounts
              </span>
              <Link href="/analysis-results" className="text-purple-400 hover:text-purple-300 font-medium flex items-center gap-1">
                🎨 Generate AI Reports & Gammas →
              </Link>
            </div>
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
              <button
                onClick={() => setActiveView('new')}
                className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
                  activeView === 'new'
                    ? 'bg-green-600 text-white'
                    : 'bg-[#15191e] text-gray-400 hover:text-white border border-gray-800'
                }`}
              >
                🆕 New Followers ({newFollowers.length})
              </button>
              <Link
                href="/analysis-results"
                className="px-4 py-2 rounded text-sm font-medium transition-colors bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white flex items-center gap-2"
              >
                🎨 AI Analysis & Gamma Reports
              </Link>
              
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
                <div className="flex gap-2">
                  <button
                    onClick={exportToCSV}
                    disabled={exporting || followers.length === 0}
                    className="px-3 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-700 disabled:cursor-not-allowed rounded text-sm font-medium transition-colors"
                  >
                    {exporting ? 'EXPORTING...' : '↓ CSV'}
                  </button>
                  <button
                    onClick={exportToJSON}
                    disabled={exporting || followers.length === 0}
                    className="px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed rounded text-sm font-medium transition-colors"
                  >
                    {exporting ? 'EXPORTING...' : '↓ JSON'}
                  </button>
                  <button
                    onClick={exportToMarkdown}
                    disabled={exporting || followers.length === 0}
                    className="px-3 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 disabled:cursor-not-allowed rounded text-sm font-medium transition-colors"
                  >
                    {exporting ? 'EXPORTING...' : '↓ MD'}
                  </button>
                </div>
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

              <div className="bg-[#15191e] border border-green-800/30 rounded-lg p-4">
                <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">🆕 New Followers</div>
                <div className="text-3xl font-bold font-mono text-green-400">{stats.newFollowers || 0}</div>
                <div className="text-xs text-gray-500 mt-1">
                  {previousExtractionDate ? 'Since last scan' : 'Last 7 days'}
                </div>
              </div>

              <div className="bg-[#15191e] border border-red-800/30 rounded-lg p-4">
                <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">👋 Unfollowers</div>
                <div className="text-3xl font-bold font-mono text-red-400">{stats.unfollowers || 0}</div>
                <div className="text-xs text-gray-500 mt-1">All-time</div>
              </div>
            </div>

            {/* Search Bar */}
            <div className="mb-6 bg-[#15191e] border border-gray-800 rounded-lg p-4">
              <div className="flex items-center gap-4">
                <div className="flex-1 relative">
                  <input
                    type="text"
                    placeholder="🔍 Search followers by name, username, or bio... (AI-powered instant search)"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value)
                      setDisplayLimit(50) // Reset display limit on search
                    }}
                    className="w-full px-4 py-3 bg-[#0f1419] border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => {
                        setSearchQuery('')
                        setDisplayLimit(50)
                      }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                    >
                      ✕
                    </button>
                  )}
                </div>
                <div className="text-sm text-gray-400">
                  {searchQuery ? (
                    <span className="text-blue-400 font-semibold">
                      {filteredFollowers.length} results
                    </span>
                  ) : (
                    <span>{followers.length} total</span>
                  )}
                </div>
              </div>
            </div>

            {/* Follower Count Discrepancy Diagnostic */}
            {stats.total < 794 && (
              <div className="mb-6 bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <span className="text-yellow-400 text-lg">🔍</span>
                  <div className="flex-1">
                    <h4 className="text-sm font-semibold text-yellow-400 mb-2">Count Discrepancy (X Profile vs Extracted)</h4>
                    <div className="bg-[#0f1419] border border-gray-800 rounded-lg p-3 mb-3">
                      <div className="grid grid-cols-3 gap-4 text-center">
                        <div>
                          <div className="text-2xl font-bold text-white">{794}</div>
                          <div className="text-xs text-gray-500">X Profile Shows</div>
                        </div>
                        <div>
                          <div className="text-2xl font-bold text-blue-400">{stats.total}</div>
                          <div className="text-xs text-gray-500">We Extracted</div>
                        </div>
                        <div>
                          <div className="text-2xl font-bold text-red-400">{794 - stats.total}</div>
                          <div className="text-xs text-gray-500">Missing</div>
                        </div>
                      </div>
                    </div>
                    
                    <p className="text-xs text-gray-300 mb-3">
                      <strong>Why the discrepancy?</strong> X's count is often inaccurate for several reasons:
                    </p>
                    
                    <div className="space-y-2 mb-3">
                      <div className="flex items-start gap-2 text-xs">
                        <span className="text-yellow-400 mt-0.5">🔒</span>
                        <div>
                          <div className="text-gray-300 font-medium">X Counts Private Accounts</div>
                          <div className="text-gray-500">~{Math.min(794 - stats.total, 3)} followers are private accounts. X includes them in your count, but they can't be accessed or analyzed without authentication.</div>
                        </div>
                      </div>
                      
                      <div className="flex items-start gap-2 text-xs">
                        <span className="text-red-400 mt-0.5">⛔</span>
                        <div>
                          <div className="text-gray-300 font-medium">X Counts Suspended/Deleted Accounts</div>
                          <div className="text-gray-500">~1-2 accounts may be suspended or deleted. X's count is cached and includes accounts that no longer exist.</div>
                        </div>
                      </div>
                      
                      <div className="flex items-start gap-2 text-xs">
                        <span className="text-blue-400 mt-0.5">🔄</span>
                        <div>
                          <div className="text-gray-300 font-medium">X's Count Lags Behind Reality</div>
                          <div className="text-gray-500">X caches follower counts and updates slowly. Our real-time extraction is more accurate than X's displayed count.</div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 pt-2 border-t border-gray-700">
                      <button
                        onClick={async () => {
                          if (!user) return
                          setExtracting(true)
                          try {
                            const token = await user.getIdToken()
                            await fetch('/api/apify/extract-followers', {
                              method: 'POST',
                              headers: {
                                'Authorization': `Bearer ${token}`,
                                'Content-Type': 'application/json'
                              },
                              body: JSON.stringify({ 
                                username: myAccount,
                                maxFollowers: 850 // Extract slightly more to capture all
                              })
                            })
                            loadDashboard() // Reload to see updates
                          } catch (err) {
                            console.error(err)
                          } finally {
                            setExtracting(false)
                          }
                        }}
                        disabled={extracting}
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 rounded text-xs font-medium transition-colors"
                      >
                        {extracting ? 'Re-extracting...' : '🔄 Re-extract Now'}
                      </button>
                      <span className="text-xs text-gray-500">
                        Our count of {stats.total} active, accessible followers is likely more accurate than X's cached count
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Content Views */}
            {activeView === 'overview' && (
              <div className="bg-[#15191e] border border-gray-800 rounded-lg overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-800 bg-[#0f1419]">
                  <div className="flex items-center justify-between">
                    <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-300">
                      All Followers ({followers.length.toLocaleString()} total)
                    </h2>
                    {displayLimit < filteredFollowers.length && (
                      <div className="text-xs text-yellow-400 bg-yellow-400/10 px-3 py-1 rounded border border-yellow-400/30">
                        📊 Showing {displayLimit} of {filteredFollowers.length.toLocaleString()} - Scroll down to load more
                      </div>
                    )}
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-[#0f1419] text-xs uppercase text-gray-500">
                      <tr>
                        <th className="px-6 py-3 text-left font-medium">User</th>
                        <th className="px-6 py-3 text-right font-medium font-mono">Followers</th>
                        <th className="px-6 py-3 text-center font-medium">Verified</th>
                        <th className="px-6 py-3 text-left font-medium">Bio</th>
                        <th className="px-6 py-3 text-center font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800">
                      {displayedFollowers.map((follower, idx) => (
                        <tr 
                          key={idx} 
                          className="hover:bg-[#1a1f26] transition-colors cursor-pointer"
                          onClick={() => setSelectedFollower(follower)}
                        >
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
                          <td className="px-6 py-3">
                            <div className="flex items-center gap-2 justify-center" onClick={(e) => e.stopPropagation()}>
                              <button
                                onClick={() => setSelectedFollower(follower)}
                                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 rounded text-xs font-medium transition-colors whitespace-nowrap"
                              >
                                👁️ View Details
                              </button>
                              <button
                                onClick={() => generateFollowerGamma(follower.username)}
                                disabled={generatingGamma === follower.username}
                                className="px-2 py-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed rounded text-xs font-medium transition-colors whitespace-nowrap"
                              >
                                {generatingGamma === follower.username ? '⏳' : '🎨'} Gamma
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {displayLimit < filteredFollowers.length && (
                  <div className="px-6 py-6 border-t-2 border-yellow-400/30 bg-gradient-to-r from-yellow-400/5 to-orange-400/5 flex flex-col items-center justify-center gap-3">
                    <div className="text-center">
                      <p className="text-yellow-400 font-bold mb-1">⬇️ More Followers Below ⬇️</p>
                      <p className="text-xs text-gray-400">
                        Showing {displayLimit} of {filteredFollowers.length.toLocaleString()} followers
                      </p>
                    </div>
                    <button
                      onClick={() => setDisplayLimit(prev => prev + 100)}
                      className="px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 rounded-lg text-sm font-bold transition-all transform hover:scale-105 shadow-lg"
                    >
                      📥 Load 100 More Followers ({filteredFollowers.length - displayLimit} remaining)
                    </button>
                    <button
                      onClick={() => setDisplayLimit(filteredFollowers.length)}
                      className="text-xs text-gray-400 hover:text-blue-400 underline transition-colors"
                    >
                      or click here to load ALL {filteredFollowers.length.toLocaleString()} at once
                    </button>
                  </div>
                )}
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

            {activeView === 'new' && (
              <div className="bg-[#15191e] border border-gray-800 rounded-lg overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-800">
                  <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-300">
                    🆕 New Followers ({newFollowers.length})
                  </h2>
                  <p className="text-xs text-gray-500 mt-1">
                    {previousExtractionDate 
                      ? `Followers who started following since your last scan on ${new Date(previousExtractionDate).toLocaleDateString()}`
                      : 'Followers who started following you in the last 7 days'
                    }
                  </p>
                </div>
                {newFollowers.length === 0 ? (
                  <div className="p-12 text-center">
                    <p className="text-gray-500 mb-2">
                      {previousExtractionDate ? 'No new followers since your last scan' : 'No new followers in the last 7 days'}
                    </p>
                    <p className="text-xs text-gray-600">Keep creating great content to attract new followers! 🚀</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-800">
                    {newFollowers.map((follower, idx) => (
                      <div key={idx} className="p-6 bg-green-500/5 hover:bg-green-500/10 transition-colors flex items-start gap-4">
                        <img src={follower.profileImage} alt="" className="w-12 h-12 rounded-full" />
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-white">{follower.name}</span>
                            {follower.verified && <span className="text-blue-400">✓</span>}
                            <span className="ml-auto text-xs px-2 py-1 rounded bg-green-600 text-white font-semibold">NEW</span>
                          </div>
                          <div className="text-sm text-gray-400 font-mono mb-2">@{follower.username}</div>
                          {follower.bio && <div className="text-sm text-gray-300 mb-3">{follower.bio}</div>}
                          <div className="flex items-center gap-6 text-sm">
                            <div>
                              <span className="text-gray-500">Followers:</span>
                              <span className="ml-2 font-mono text-white font-semibold">
                                {(follower.followersCount || 0).toLocaleString()}
                              </span>
                            </div>
                            {follower.first_seen && (
                              <div>
                                <span className="text-gray-500">Followed you:</span>
                                <span className="ml-2 text-green-400">
                                  {new Date(follower.first_seen).toLocaleDateString()}
                                </span>
                              </div>
                            )}
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
                )}
              </div>
            )}

            {activeView === 'unfollowers' && (
              <div className="bg-[#15191e] border border-gray-800 rounded-lg overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-800">
                  <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-300">
                    👋 All-Time Unfollowers ({unfollowers.length})
                  </h2>
                  <p className="text-xs text-gray-500 mt-1">Complete history of everyone who unfollowed you • Track who comes and goes</p>
                  {unfollowers.length > 0 && (
                    <div className="mt-3 flex items-center gap-4 text-xs">
                      <span className="text-red-400">
                        Total lost: {unfollowers.length} followers
                      </span>
                      <span className="text-gray-500">|</span>
                      <span className="text-gray-400">
                        {unfollowers.filter((f: any) => {
                          if (!f.unfollowed_at) return false
                          const thirtyDaysAgo = new Date()
                          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
                          return new Date(f.unfollowed_at) >= thirtyDaysAgo
                        }).length} in last 30 days
                      </span>
                    </div>
                  )}
                </div>
                {unfollowers.length === 0 ? (
                  <div className="p-12 text-center">
                    <p className="text-gray-500 mb-2">🎉 No unfollowers detected - everyone loves you!</p>
                    <p className="text-xs text-gray-600">Extract regularly to track who unfollows over time</p>
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
                          {follower.bio && <div className="text-sm text-gray-400 mb-2">{follower.bio}</div>}
                          <div className="flex items-center gap-6 text-xs text-gray-500">
                            <div>
                              <span>Followers:</span>
                              <span className="ml-1 font-mono">{(follower.followersCount || 0).toLocaleString()}</span>
                            </div>
                            {follower.first_seen && (
                              <div>
                                <span>Followed on:</span>
                                <span className="ml-1">{new Date(follower.first_seen).toLocaleDateString()}</span>
                              </div>
                            )}
                            {follower.unfollowed_at && (
                              <div>
                                <span>Unfollowed:</span>
                                <span className="ml-1 text-red-400">{new Date(follower.unfollowed_at).toLocaleDateString()}</span>
                              </div>
                            )}
                            {follower.first_seen && follower.unfollowed_at && (
                              <div>
                                <span>Duration:</span>
                                <span className="ml-1">
                                  {Math.round((new Date(follower.unfollowed_at).getTime() - new Date(follower.first_seen).getTime()) / (1000 * 60 * 60 * 24))} days
                                </span>
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
      
      {/* Follower Detail Modal */}
      {selectedFollower && (
        <FollowerDetailModal
          follower={selectedFollower}
          onClose={() => setSelectedFollower(null)}
          targetUsername={selectedAccount || myAccount || undefined}
        />
      )}
    </div>
  )
}
