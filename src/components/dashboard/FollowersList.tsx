'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Users, ChevronLeft, ChevronRight, Search, Filter, Download } from 'lucide-react'

interface Follower {
  id: string
  username: string
  name?: string
  profile_image_url?: string
  followers_count?: number
  source: string
  scanned_at?: string
}

interface FollowersListProps {
  onRefresh?: () => void
  scanResults?: {
    followers?: any[]
    total_followers?: number
  }
}

export default function FollowersList({ onRefresh, scanResults }: FollowersListProps) {
  const [followers, setFollowers] = useState<Follower[]>([])
  const [loading, setLoading] = useState(false)
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    totalCount: 0,
    totalPages: 0,
    hasNext: false,
    hasPrev: false
  })
  const [source, setSource] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [error, setError] = useState<string | null>(null)

  const fetchFollowers = async (page = 1, sourceFilter = source) => {
    try {
      setLoading(true)
      setError(null)
      
      const params = new URLSearchParams({
        page: page.toString(),
        limit: pagination.limit.toString(),
        source: sourceFilter
      })
      
      const response = await fetch(`/api/followers/list?${params}`, {
        credentials: 'include'
      })
      
      if (!response.ok) {
        throw new Error('Failed to fetch followers')
      }
      
      const data = await response.json()
      setFollowers(data.followers || [])
      setPagination(data.pagination)
    } catch (error) {
      console.error('Error fetching followers:', error)
      setError(error instanceof Error ? error.message : 'Failed to fetch followers')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (scanResults?.followers && scanResults.followers.length > 0) {
      // Use scan results directly instead of fetching from API
      const scanFollowers = scanResults.followers.map((follower, index) => ({
        id: follower.id || `scan_${index}`,
        username: follower.username || follower.screen_name || `user_${index}`,
        name: follower.name || follower.display_name,
        profile_image_url: follower.profile_image_url || follower.avatar,
        followers_count: follower.followers_count || follower.public_metrics?.followers_count,
        source: 'daytona_scan',
        scanned_at: new Date().toISOString()
      }))
      
      setFollowers(scanFollowers)
      setPagination({
        page: 1,
        limit: 50,
        totalCount: scanFollowers.length,
        totalPages: Math.ceil(scanFollowers.length / 50),
        hasNext: scanFollowers.length > 50,
        hasPrev: false
      })
      setLoading(false)
    } else {
      fetchFollowers()
    }
  }, [scanResults])

  const handlePageChange = (newPage: number) => {
    fetchFollowers(newPage)
  }

  const handleSourceChange = (newSource: string) => {
    setSource(newSource)
    fetchFollowers(1, newSource)
  }

  const filteredFollowers = followers.filter(follower =>
    searchTerm === '' || 
    follower.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    follower.name?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const exportFollowers = () => {
    const csvContent = [
      ['Username', 'Name', 'Followers Count', 'Source', 'Scanned At'],
      ...filteredFollowers.map(f => [
        f.username,
        f.name || '',
        f.followers_count?.toString() || '0',
        f.source,
        f.scanned_at || ''
      ])
    ].map(row => row.join(',')).join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `followers_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              All Followers ({pagination.totalCount.toLocaleString()})
            </CardTitle>
            <CardDescription>
              Complete list of your followers from all sources
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={() => fetchFollowers(pagination.page)}
              disabled={loading}
              variant="outline"
              size="sm"
            >
              Refresh
            </Button>
            <Button
              onClick={exportFollowers}
              disabled={filteredFollowers.length === 0}
              variant="outline"
              size="sm"
            >
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search followers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <Select value={source} onValueChange={handleSourceChange}>
            <SelectTrigger className="w-full sm:w-48">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Filter by source" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sources</SelectItem>
              <SelectItem value="scrapfly">Scrapfly</SelectItem>
              <SelectItem value="twitter">Twitter API</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2 text-gray-600">Loading followers...</span>
          </div>
        ) : filteredFollowers.length === 0 ? (
          <div className="text-center py-12">
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 mb-2">No followers found</p>
            <p className="text-sm text-gray-500">
              {searchTerm ? 'Try adjusting your search terms' : 'Click "Scan Followers" to get started'}
            </p>
          </div>
        ) : (
          <>
            {/* Followers Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
              {filteredFollowers.map((follower) => (
                <div
                  key={follower.id}
                  className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={follower.profile_image_url} />
                    <AvatarFallback>
                      {follower.name?.charAt(0) || follower.username.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">
                      {follower.name || follower.username}
                    </p>
                    <p className="text-xs text-gray-500 truncate">@{follower.username}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="secondary" className="text-xs">
                        {follower.source}
                      </Badge>
                      {follower.followers_count !== undefined && (
                        <span className="text-xs text-gray-500">
                          {follower.followers_count.toLocaleString()} followers
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
                  {Math.min(pagination.page * pagination.limit, pagination.totalCount)} of{' '}
                  {pagination.totalCount.toLocaleString()} followers
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    onClick={() => handlePageChange(pagination.page - 1)}
                    disabled={!pagination.hasPrev || loading}
                    variant="outline"
                    size="sm"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </Button>
                  <span className="text-sm text-gray-600">
                    Page {pagination.page} of {pagination.totalPages}
                  </span>
                  <Button
                    onClick={() => handlePageChange(pagination.page + 1)}
                    disabled={!pagination.hasNext || loading}
                    variant="outline"
                    size="sm"
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
