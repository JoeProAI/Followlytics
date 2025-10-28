/**
 * Community Growth System
 * Export limits scale with @JoeProAI follower count
 * Encourages community support while remaining fair
 */

export interface CommunityTier {
  followers: number
  limit: number
  label: string
}

export const COMMUNITY_TIERS: CommunityTier[] = [
  { followers: 0,     limit: 1000,  label: "Starter Community" },
  { followers: 1000,  limit: 2000,  label: "Growing Community" },
  { followers: 2500,  limit: 5000,  label: "Thriving Community" },
  { followers: 5000,  limit: 10000, label: "Established Community" },
  { followers: 10000, limit: 20000, label: "Massive Community" },
]

export const JOEPROAI_TWITTER_USERNAME = "JoeProAI"

/**
 * Get current community tier based on @JoeProAI follower count
 */
export function getCommunityTier(joeproFollowers: number): CommunityTier {
  // Find the highest tier that @JoeProAI qualifies for
  let currentTier = COMMUNITY_TIERS[0]
  
  for (const tier of COMMUNITY_TIERS) {
    if (joeproFollowers >= tier.followers) {
      currentTier = tier
    } else {
      break
    }
  }
  
  return currentTier
}

/**
 * Get next community tier to unlock
 */
export function getNextCommunityTier(joeproFollowers: number): CommunityTier | null {
  const currentTier = getCommunityTier(joeproFollowers)
  const currentIndex = COMMUNITY_TIERS.findIndex(t => t.followers === currentTier.followers)
  
  if (currentIndex < COMMUNITY_TIERS.length - 1) {
    return COMMUNITY_TIERS[currentIndex + 1]
  }
  
  return null // Already at max tier
}

/**
 * Calculate progress to next tier (0-100)
 */
export function getCommunityProgress(joeproFollowers: number): number {
  const currentTier = getCommunityTier(joeproFollowers)
  const nextTier = getNextCommunityTier(joeproFollowers)
  
  if (!nextTier) return 100 // Max tier reached
  
  const followersSinceLastTier = joeproFollowers - currentTier.followers
  const followersToNextTier = nextTier.followers - currentTier.followers
  
  return Math.round((followersSinceLastTier / followersToNextTier) * 100)
}

/**
 * Get export limit for free tier users based on community growth
 * Paid users bypass this entirely
 */
export function getCommunityExportLimit(
  joeproFollowers: number,
  userTier: string
): number {
  // Paid users get their tier limits (not affected by community growth)
  if (userTier !== 'free' && userTier !== 'beta') {
    return null as any // Will be handled by tier-specific limits
  }
  
  const tier = getCommunityTier(joeproFollowers)
  return tier.limit
}

/**
 * Get formatted message about community growth
 */
export function getCommunityMessage(joeproFollowers: number): {
  currentTier: CommunityTier
  nextTier: CommunityTier | null
  progress: number
  message: string
} {
  const currentTier = getCommunityTier(joeproFollowers)
  const nextTier = getNextCommunityTier(joeproFollowers)
  const progress = getCommunityProgress(joeproFollowers)
  
  let message = `You're in the ${currentTier.label}!`
  
  if (nextTier) {
    const remaining = nextTier.followers - joeproFollowers
    message += ` ${remaining.toLocaleString()} more followers to unlock ${nextTier.label}.`
  } else {
    message += ` You've unlocked the maximum community tier!`
  }
  
  return {
    currentTier,
    nextTier,
    progress,
    message
  }
}
