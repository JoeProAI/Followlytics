import { ImageResponse } from 'next/og'
import { NextRequest } from 'next/server'

export const runtime = 'edge'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    
    // Extract parameters from URL
    const username = searchParams.get('username') || 'Unknown'
    const followerCount = searchParams.get('followers') || '0'
    const scanDate = searchParams.get('date') || new Date().toLocaleDateString()
    const status = searchParams.get('status') || 'completed'
    
    // Format follower count with commas
    const formattedCount = parseInt(followerCount).toLocaleString()
    
    // Determine colors based on status
    const getStatusColor = (status: string) => {
      switch (status) {
        case 'completed': return '#10B981' // green
        case 'failed': return '#EF4444' // red
        case 'scanning': return '#F59E0B' // yellow
        default: return '#6B7280' // gray
      }
    }
    
    const statusColor = getStatusColor(status)
    const statusText = status.charAt(0).toUpperCase() + status.slice(1)

    return new ImageResponse(
      (
        <div
          style={{
            height: '100%',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#0F172A', // slate-900
            backgroundImage: 'linear-gradient(45deg, #0F172A 0%, #1E293B 100%)',
          }}
        >
          {/* Header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              marginBottom: '40px',
            }}
          >
            <div
              style={{
                fontSize: '48px',
                marginRight: '20px',
              }}
            >
              📊
            </div>
            <div
              style={{
                fontSize: '42px',
                fontWeight: 'bold',
                color: '#FFFFFF',
                fontFamily: 'system-ui',
              }}
            >
              Followlytics
            </div>
          </div>

          {/* Main Content */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              backgroundColor: '#1E293B', // slate-800
              padding: '60px',
              borderRadius: '24px',
              border: '2px solid #334155', // slate-700
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
            }}
          >
            {/* Username */}
            <div
              style={{
                fontSize: '36px',
                color: '#94A3B8', // slate-400
                marginBottom: '20px',
                fontFamily: 'system-ui',
              }}
            >
              @{username}
            </div>

            {/* Follower Count */}
            <div
              style={{
                fontSize: '72px',
                fontWeight: 'bold',
                color: '#FFFFFF',
                marginBottom: '20px',
                fontFamily: 'system-ui',
              }}
            >
              {formattedCount}
            </div>

            <div
              style={{
                fontSize: '28px',
                color: '#64748B', // slate-500
                marginBottom: '30px',
                fontFamily: 'system-ui',
              }}
            >
              Followers Analyzed
            </div>

            {/* Status Badge */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                backgroundColor: statusColor,
                color: '#FFFFFF',
                padding: '12px 24px',
                borderRadius: '12px',
                fontSize: '24px',
                fontWeight: 'bold',
                fontFamily: 'system-ui',
              }}
            >
              {statusText === 'Completed' && '✅ '}
              {statusText === 'Failed' && '❌ '}
              {statusText === 'Scanning' && '⏳ '}
              {statusText}
            </div>
          </div>

          {/* Footer */}
          <div
            style={{
              marginTop: '40px',
              fontSize: '20px',
              color: '#64748B', // slate-500
              fontFamily: 'system-ui',
            }}
          >
            Scanned on {scanDate}
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      }
    )
  } catch (error) {
    console.error('OG Image generation failed:', error)
    
    // Fallback image
    return new ImageResponse(
      (
        <div
          style={{
            height: '100%',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#0F172A',
            color: '#FFFFFF',
            fontSize: '48px',
            fontFamily: 'system-ui',
          }}
        >
          📊 Followlytics
          <div style={{ fontSize: '24px', marginTop: '20px', color: '#64748B' }}>
            Follower Analytics Platform
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      }
    )
  }
}
