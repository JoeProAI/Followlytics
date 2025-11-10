'use client'

interface TierCapabilitiesProps {
  tier: string
  credits?: {
    followers?: { used: number; total: number }
    ai_analysis?: { used: number; total: number }
    tweet_generation?: { used: number; total: number }
  }
}

export default function TierCapabilities({ tier, credits }: TierCapabilitiesProps) {
  const tierInfo: Record<string, {
    name: string
    followers: string
    aiAnalysis: string
    tweetGen: string
    features: string[]
    color: string
    upgradeMessage?: string
  }> = {
    beta: {
      name: 'Free (Beta)',
      followers: '2,000/month',
      aiAnalysis: '10/month',
      tweetGen: '5/month',
      features: [
        '✅ Track your followers',
        '✅ Detect unfollowers',
        '✅ Basic analytics',
        '❌ No competitor tracking',
        '❌ No email extraction',
        '❌ No API access'
      ],
      color: 'border-gray-700 bg-gray-800/50',
      upgradeMessage: 'Upgrade to Starter for 50K followers/month + competitor tracking!'
    },
    free: {
      name: 'Free',
      followers: '2,000/month',
      aiAnalysis: '10/month',
      tweetGen: '5/month',
      features: [
        '✅ Track your followers',
        '✅ Detect unfollowers',
        '✅ Basic analytics',
        '❌ No competitor tracking',
        '❌ No email extraction',
        '❌ No API access'
      ],
      color: 'border-gray-700 bg-gray-800/50',
      upgradeMessage: 'Upgrade to Starter for 50K followers/month + competitor tracking!'
    },
    starter: {
      name: 'Starter',
      followers: '50,000/month',
      aiAnalysis: '100/month',
      tweetGen: '25/month',
      features: [
        '✅ Track unlimited followers',
        '✅ Growth tracking & trends',
        '✅ Competitor analysis (3 accounts)',
        '✅ Advanced analytics',
        '✅ Email extraction',
        '❌ No API access'
      ],
      color: 'border-green-700 bg-green-800/20'
    },
    pro: {
      name: 'Pro',
      followers: '200,000/month',
      aiAnalysis: '500/month',
      tweetGen: '100/month',
      features: [
        '✅ Everything in Starter',
        '✅ Track 10 competitors',
        '✅ Priority support',
        '✅ API access',
        '✅ Advanced filtering',
        '✅ Custom exports'
      ],
      color: 'border-blue-700 bg-blue-800/20'
    },
    scale: {
      name: 'Scale',
      followers: '1,000,000/month',
      aiAnalysis: '2,000/month',
      tweetGen: '500/month',
      features: [
        '✅ Everything in Pro',
        '✅ Track 50 competitors',
        '✅ Team seats (5)',
        '✅ White-label options',
        '✅ Custom integrations',
        '✅ Dedicated support'
      ],
      color: 'border-purple-700 bg-purple-800/20'
    },
    enterprise: {
      name: 'Enterprise',
      followers: 'Unlimited',
      aiAnalysis: 'Unlimited',
      tweetGen: 'Unlimited',
      features: [
        '✅ Everything in Scale',
        '✅ Unlimited competitors',
        '✅ Unlimited team seats',
        '✅ SLA guarantee',
        '✅ Custom development',
        '✅ Priority phone support'
      ],
      color: 'border-purple-700 bg-gradient-to-br from-purple-800/20 to-pink-800/20'
    }
  }

  const info = tierInfo[tier.toLowerCase()] || tierInfo.free

  const getUsageColor = (used: number, total: number) => {
    const percentage = (used / total) * 100
    if (percentage >= 90) return 'text-red-400'
    if (percentage >= 70) return 'text-yellow-400'
    return 'text-green-400'
  }

  return (
    <div className={`border rounded-lg p-6 ${info.color}`}>
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-bold text-white mb-1">
            📊 Your {info.name} Plan
          </h3>
          <p className="text-sm text-gray-400">
            What you can do with your current subscription
          </p>
        </div>
        {info.upgradeMessage && (
          <a
            href="/pricing"
            className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 rounded-lg text-xs font-bold text-white uppercase tracking-wide transition-all transform hover:scale-105"
          >
            Upgrade
          </a>
        )}
      </div>

      {/* Usage Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-[#0f1419] border border-gray-700 rounded-lg p-4">
          <div className="text-xs text-gray-500 uppercase tracking-wide mb-2">Follower Credits</div>
          <div className="text-lg font-bold font-mono">
            {credits?.followers ? (
              <span className={getUsageColor(credits.followers.used, credits.followers.total)}>
                {credits.followers.used.toLocaleString()}<span className="text-gray-600">/</span>
                <span className="text-gray-400">{credits.followers.total.toLocaleString()}</span>
              </span>
            ) : (
              <span className="text-gray-400">{info.followers}</span>
            )}
          </div>
          {credits?.followers && (
            <div className="mt-2 bg-gray-800 rounded-full h-2 overflow-hidden">
              <div
                className={`h-full transition-all ${
                  (credits.followers.used / credits.followers.total) >= 0.9 ? 'bg-red-500' :
                  (credits.followers.used / credits.followers.total) >= 0.7 ? 'bg-yellow-500' :
                  'bg-green-500'
                }`}
                style={{ width: `${Math.min((credits.followers.used / credits.followers.total) * 100, 100)}%` }}
              />
            </div>
          )}
        </div>

        <div className="bg-[#0f1419] border border-gray-700 rounded-lg p-4">
          <div className="text-xs text-gray-500 uppercase tracking-wide mb-2">AI Analysis</div>
          <div className="text-lg font-bold font-mono">
            {credits?.ai_analysis ? (
              <span className={getUsageColor(credits.ai_analysis.used, credits.ai_analysis.total)}>
                {credits.ai_analysis.used}<span className="text-gray-600">/</span>
                <span className="text-gray-400">{credits.ai_analysis.total}</span>
              </span>
            ) : (
              <span className="text-gray-400">{info.aiAnalysis}</span>
            )}
          </div>
          {credits?.ai_analysis && (
            <div className="mt-2 bg-gray-800 rounded-full h-2 overflow-hidden">
              <div
                className={`h-full transition-all ${
                  (credits.ai_analysis.used / credits.ai_analysis.total) >= 0.9 ? 'bg-red-500' :
                  (credits.ai_analysis.used / credits.ai_analysis.total) >= 0.7 ? 'bg-yellow-500' :
                  'bg-green-500'
                }`}
                style={{ width: `${Math.min((credits.ai_analysis.used / credits.ai_analysis.total) * 100, 100)}%` }}
              />
            </div>
          )}
        </div>

        <div className="bg-[#0f1419] border border-gray-700 rounded-lg p-4">
          <div className="text-xs text-gray-500 uppercase tracking-wide mb-2">Post Generation</div>
          <div className="text-lg font-bold font-mono">
            {credits?.tweet_generation ? (
              <span className={getUsageColor(credits.tweet_generation.used, credits.tweet_generation.total)}>
                {credits.tweet_generation.used}<span className="text-gray-600">/</span>
                <span className="text-gray-400">{credits.tweet_generation.total}</span>
              </span>
            ) : (
              <span className="text-gray-400">{info.tweetGen}</span>
            )}
          </div>
          {credits?.tweet_generation && (
            <div className="mt-2 bg-gray-800 rounded-full h-2 overflow-hidden">
              <div
                className={`h-full transition-all ${
                  (credits.tweet_generation.used / credits.tweet_generation.total) >= 0.9 ? 'bg-red-500' :
                  (credits.tweet_generation.used / credits.tweet_generation.total) >= 0.7 ? 'bg-yellow-500' :
                  'bg-green-500'
                }`}
                style={{ width: `${Math.min((credits.tweet_generation.used / credits.tweet_generation.total) * 100, 100)}%` }}
              />
            </div>
          )}
        </div>
      </div>

      {/* Features List */}
      <div className="border-t border-gray-700 pt-4">
        <h4 className="text-sm font-semibold text-gray-300 mb-3">Your Capabilities:</h4>
        <div className="grid grid-cols-2 gap-2">
          {info.features.map((feature, idx) => (
            <div
              key={idx}
              className={`text-sm ${
                feature.startsWith('✅') ? 'text-gray-300' : 'text-gray-600'
              }`}
            >
              {feature}
            </div>
          ))}
        </div>
      </div>

      {info.upgradeMessage && (
        <div className="mt-6 p-4 bg-gradient-to-r from-blue-600/10 to-purple-600/10 border border-blue-500/30 rounded-lg">
          <p className="text-sm text-blue-300 font-medium">
            💡 {info.upgradeMessage}
          </p>
          <a
            href="/pricing"
            className="mt-2 inline-block text-xs text-blue-400 hover:text-blue-300 underline"
          >
            View all plans →
          </a>
        </div>
      )}
    </div>
  )
}
