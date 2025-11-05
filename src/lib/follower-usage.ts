const DEFAULT_FOLLOWER_LIMIT = 1_000

const TIER_FOLLOWER_LIMITS: Record<string, number | null> = {
  free: 1_000,
  beta: 1_000,
  starter: 10_000,
  pro: 50_000,
  agency: 200_000,
  scale: 200_000,
  enterprise: 200_000
}

export function getFollowerLimitForTier(tier: string | undefined | null): {
  tierKey: string
  limit: number | null
} {
  const normalizedTier = (tier || 'free').toLowerCase()

  if (Object.prototype.hasOwnProperty.call(TIER_FOLLOWER_LIMITS, normalizedTier)) {
    return {
      tierKey: normalizedTier,
      limit: TIER_FOLLOWER_LIMITS[normalizedTier] ?? null
    }
  }

  return {
    tierKey: normalizedTier,
    limit: DEFAULT_FOLLOWER_LIMIT
  }
}

export { DEFAULT_FOLLOWER_LIMIT }
