import { ImageResponse } from 'next/og'
import { NextRequest } from 'next/server'

export const runtime = 'edge'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    
    // Extract parameters from URL
    const username = searchParams.get('username') || 'Unknown'
    const progress = parseInt(searchParams.get('progress') || '0')
    const currentCount = searchParams.get('current') || '0'
    const phase = searchParams.get('phase') || 'scanning'
    
    // Format current count with commas
    const formattedCurrent = parseInt(currentCount).toLocaleString()
    
    // Get phase display info
    const getPhaseInfo = (phase: string) => {
      switch (phase) {
        case 'creating_sandbox': return { emoji: '🚀', text: 'Creating Sandbox', color: '#3B82F6' }
        case 'installing_dependencies': return { emoji: '📦', text: 'Installing Dependencies', color: '#8B5CF6' }
        case 'installing_browser': return { emoji: '🌐', text: 'Setting up Browser', color: '#06B6D4' }
        case 'scanning_followers': return { emoji: '🔍', text: 'Scanning Followers', color: '#10B981' }
        case 'awaiting_signin': return { emoji: '🔑', text: 'Awaiting Sign-in', color: '#F59E0B' }
        default: return { emoji: '⏳', text: 'Processing', color: '#6B7280' }
      }
    }
    
    const phaseInfo = getPhaseInfo(phase)

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
            backgroundImage: 'linear-gradient(135deg, #0F172A 0%, #1E293B 50%, #0F172A 100%)',
          }}
        >
          {/* Header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              marginBottom: '50px',
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

          {/* Live Scan Indicator */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              backgroundColor: '#DC2626', // red-600
              color: '#FFFFFF',
              padding: '8px 16px',
              borderRadius: '20px',
              fontSize: '18px',
              fontWeight: 'bold',
              marginBottom: '30px',
              fontFamily: 'system-ui',
            }}
          >
            🔴 LIVE SCAN
          </div>

          {/* Main Content */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              backgroundColor: '#1E293B', // slate-800
              padding: '50px 80px',
              borderRadius: '24px',
              border: '2px solid #334155', // slate-700
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
            }}
          >
            {/* Username */}
            <div
              style={{
                fontSize: '32px',
                color: '#94A3B8', // slate-400
                marginBottom: '30px',
                fontFamily: 'system-ui',
              }}
            >
              Scanning @{username}
            </div>

            {/* Phase Status */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                backgroundColor: phaseInfo.color,
                color: '#FFFFFF',
                padding: '16px 32px',
                borderRadius: '16px',
                fontSize: '28px',
                fontWeight: 'bold',
                marginBottom: '40px',
                fontFamily: 'system-ui',
              }}
            >
              <span style={{ marginRight: '12px' }}>{phaseInfo.emoji}</span>
              {phaseInfo.text}
            </div>

            {/* Progress Bar */}
            <div
              style={{
                width: '400px',
                height: '12px',
                backgroundColor: '#374151', // gray-700
                borderRadius: '6px',
                marginBottom: '20px',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  width: `${progress}%`,
                  height: '100%',
                  backgroundColor: '#10B981', // emerald-500
                  borderRadius: '6px',
                  transition: 'width 0.3s ease',
                }}
              />
            </div>

            {/* Progress Text */}
            <div
              style={{
                fontSize: '24px',
                color: '#FFFFFF',
                marginBottom: '20px',
                fontFamily: 'system-ui',
              }}
            >
              {progress}% Complete
            </div>

            {/* Current Count */}
            {currentCount !== '0' && (
              <div
                style={{
                  fontSize: '48px',
                  fontWeight: 'bold',
                  color: '#10B981', // emerald-500
                  marginBottom: '10px',
                  fontFamily: 'system-ui',
                }}
              >
                {formattedCurrent}
              </div>
            )}

            {currentCount !== '0' && (
              <div
                style={{
                  fontSize: '20px',
                  color: '#64748B', // slate-500
                  fontFamily: 'system-ui',
                }}
              >
                Followers Found So Far
              </div>
            )}
          </div>

          {/* Footer */}
          <div
            style={{
              marginTop: '40px',
              fontSize: '18px',
              color: '#64748B', // slate-500
              fontFamily: 'system-ui',
            }}
          >
            Real-time follower extraction in progress...
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      }
    )
  } catch (error) {
    console.error('OG Progress Image generation failed:', error)
    
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
          🔍 Followlytics
          <div style={{ fontSize: '24px', marginTop: '20px', color: '#64748B' }}>
            Live Follower Scanning
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
