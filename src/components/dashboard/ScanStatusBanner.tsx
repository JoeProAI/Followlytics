'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'

interface ScanStatusBannerProps {
  onAuthenticationRequired: () => void
}

export default function ScanStatusBanner({ onAuthenticationRequired }: ScanStatusBannerProps) {
  const { user } = useAuth()
  const [scanSummary, setScanSummary] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (user) {
      checkScanStatus()
      // Check every 30 seconds
      const interval = setInterval(checkScanStatus, 30000)
      return () => clearInterval(interval)
    }
  }, [user])

  const checkScanStatus = async () => {
    if (!user) return
    
    try {
      setLoading(true)
      const token = await user.getIdToken()
      const response = await fetch('/api/scan/monitor', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setScanSummary(data.summary)
        
        // If there are scans requiring authentication, notify parent
        if (data.summary.authenticationRequiredScans > 0) {
          onAuthenticationRequired()
        }
      }
    } catch (error) {
      console.error('Failed to check scan status:', error)
    } finally {
      setLoading(false)
    }
  }

  if (!scanSummary) return null

  const hasActiveScans = scanSummary.activeScans > 0
  const hasAuthRequired = scanSummary.authenticationRequiredScans > 0

  if (!hasActiveScans && !hasAuthRequired) return null

  return (
    <div className="mb-6">
      {hasActiveScans && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800">
                Scan in Progress
              </h3>
              <p className="text-sm text-blue-700">
                {scanSummary.activeScans} scan{scanSummary.activeScans !== 1 ? 's' : ''} currently running in the background
              </p>
            </div>
          </div>
        </div>
      )}

      {hasAuthRequired && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-5 h-5 bg-orange-100 rounded-full flex items-center justify-center">
                <span className="text-orange-600 text-sm font-semibold">🍪</span>
              </div>
            </div>
            <div className="ml-3 flex-1">
              <h3 className="text-sm font-medium text-orange-800">
                Authentication Required
              </h3>
              <p className="text-sm text-orange-700">
                {scanSummary.authenticationRequiredScans} scan{scanSummary.authenticationRequiredScans !== 1 ? 's' : ''} need session cookies to continue
              </p>
            </div>
            <div className="ml-3">
              <button
                onClick={onAuthenticationRequired}
                className="bg-orange-600 text-white px-3 py-1 rounded-md text-sm hover:bg-orange-700 transition-colors"
              >
                Provide Cookies
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

