'use client'

interface SubscriptionBadgeProps {
  tier: string
  className?: string
  showUpgrade?: boolean
}

export default function SubscriptionBadge({ tier, className = '', showUpgrade = false }: SubscriptionBadgeProps) {
  const tierConfig = {
    beta: {
      label: 'BETA PRO',
      color: 'bg-gradient-to-r from-purple-500/20 to-blue-500/20 text-purple-300 border-purple-500/40',
      icon: '🚀'
    },
    free: {
      label: 'FREE',
      color: 'bg-gray-500/20 text-gray-300 border-gray-500/40',
      icon: '🆓'
    },
    starter: {
      label: 'STARTER',
      color: 'bg-green-500/20 text-green-400 border-green-500/40',
      icon: '🚀'
    },
    pro: {
      label: 'PRO',
      color: 'bg-blue-500/20 text-blue-400 border-blue-500/40',
      icon: '⭐'
    },
    scale: {
      label: 'SCALE',
      color: 'bg-purple-500/20 text-purple-400 border-purple-500/40',
      icon: '💎'
    },
    enterprise: {
      label: 'ENTERPRISE',
      color: 'bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-purple-300 border-purple-500/40',
      icon: '👑'
    }
  }

  const config = tierConfig[tier.toLowerCase() as keyof typeof tierConfig] || tierConfig.free

  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      <span className={`px-3 py-1.5 rounded-lg border text-xs font-bold uppercase tracking-wide ${config.color}`}>
        <span className="mr-1.5">{config.icon}</span>
        {config.label}
      </span>
      {showUpgrade && tier === 'free' && (
        <a
          href="/pricing"
          className="px-3 py-1.5 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 rounded-lg text-xs font-bold text-white uppercase tracking-wide transition-all transform hover:scale-105"
        >
          UPGRADE
        </a>
      )}
    </div>
  )
}
