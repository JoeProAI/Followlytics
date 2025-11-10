// Bot Detection Engine
// Analyzes followers to identify bots, fake accounts, and spam
// NO raw follower data exposed to users - only bot analysis

export interface BotAnalysisResult {
  totalFollowers: number
  botsDetected: number
  botPercentage: number
  riskScore: number // 0-100
  categories: {
    definiteBot: number
    likelyBot: number
    suspicious: number
    inactive: number
    clean: number
  }
  insights: string[]
  recommendations: string[]
}

export interface FollowerProfile {
  username: string
  name: string
  bio?: string
  verified: boolean
  followersCount: number
  followingCount: number
  tweetCount?: number
  createdAt?: Date
  profileImageUrl?: string
  defaultProfileImage?: boolean
}

export class BotDetector {
  
  /**
   * Analyze followers for bot indicators
   * Returns ONLY bot analysis - no raw follower data
   */
  static async analyzeForBots(followers: FollowerProfile[]): Promise<BotAnalysisResult> {
    console.log(`[BotDetector] Analyzing ${followers.length} followers for bot indicators...`)
    
    const categories = {
      definiteBot: 0,
      likelyBot: 0,
      suspicious: 0,
      inactive: 0,
      clean: 0
    }
    
    const insights: string[] = []
    const recommendations: string[] = []
    
    for (const follower of followers) {
      const botScore = this.calculateBotScore(follower)
      
      if (botScore >= 90) {
        categories.definiteBot++
      } else if (botScore >= 70) {
        categories.likelyBot++
      } else if (botScore >= 50) {
        categories.suspicious++
      } else if (botScore >= 30) {
        categories.inactive++
      } else {
        categories.clean++
      }
    }
    
    const botsDetected = categories.definiteBot + categories.likelyBot
    const botPercentage = Math.round((botsDetected / followers.length) * 100)
    
    // Calculate overall risk score
    const riskScore = Math.round(
      (categories.definiteBot * 100 + 
       categories.likelyBot * 70 + 
       categories.suspicious * 40 + 
       categories.inactive * 20) / followers.length
    )
    
    // Generate insights
    if (botPercentage > 30) {
      insights.push(`⚠️ High bot percentage detected (${botPercentage}%)`)
      recommendations.push('Consider cleaning your follower base')
    } else if (botPercentage > 15) {
      insights.push(`⚡ Moderate bot activity detected (${botPercentage}%)`)
      recommendations.push('Monitor for suspicious engagement patterns')
    } else {
      insights.push(`✅ Low bot percentage (${botPercentage}%)`)
      recommendations.push('Your audience quality is good')
    }
    
    if (categories.inactive > followers.length * 0.3) {
      insights.push(`📉 ${Math.round((categories.inactive / followers.length) * 100)}% inactive accounts detected`)
      recommendations.push('Focus engagement on active followers')
    }
    
    if (categories.suspicious > followers.length * 0.2) {
      insights.push(`🔍 ${Math.round((categories.suspicious / followers.length) * 100)}% suspicious accounts need monitoring`)
    }
    
    console.log(`[BotDetector] Analysis complete:`, {
      total: followers.length,
      bots: botsDetected,
      percentage: botPercentage,
      riskScore
    })
    
    return {
      totalFollowers: followers.length,
      botsDetected,
      botPercentage,
      riskScore,
      categories,
      insights,
      recommendations
    }
  }
  
  /**
   * Calculate bot score for individual follower (0-100)
   * Higher = more likely to be a bot
   */
  private static calculateBotScore(follower: FollowerProfile): number {
    let score = 0
    
    // 1. Default profile image (strong bot indicator)
    if (follower.defaultProfileImage || !follower.profileImageUrl) {
      score += 30
    }
    
    // 2. Username patterns (bot-like usernames)
    const username = follower.username.toLowerCase()
    if (/^[a-z]+\d{6,}$/.test(username)) {
      score += 25 // e.g., "john123456"
    }
    if (/\d{3,}/.test(username)) {
      score += 15 // Multiple consecutive numbers
    }
    
    // 3. Follower/following ratio
    const ratio = follower.followersCount > 0 
      ? follower.followingCount / follower.followersCount 
      : follower.followingCount
      
    if (ratio > 10) {
      score += 20 // Following way more than followers
    } else if (ratio > 5) {
      score += 10
    }
    
    // 4. No bio (suspicious)
    if (!follower.bio || follower.bio.length < 10) {
      score += 15
    }
    
    // 5. Name patterns
    const name = follower.name.toLowerCase()
    if (name === username) {
      score += 10 // Name same as username
    }
    if (/\d{3,}/.test(name)) {
      score += 15 // Numbers in display name
    }
    
    // 6. Low follower count
    if (follower.followersCount < 10) {
      score += 15
    } else if (follower.followersCount < 50) {
      score += 10
    }
    
    // 7. Tweet count analysis
    if (follower.tweetCount !== undefined) {
      if (follower.tweetCount === 0) {
        score += 20
      } else if (follower.tweetCount < 10) {
        score += 10
      }
    }
    
    // 8. Verified accounts are NOT bots
    if (follower.verified) {
      score = Math.max(0, score - 50)
    }
    
    // 9. Account age (if available)
    if (follower.createdAt) {
      const accountAge = Date.now() - follower.createdAt.getTime()
      const daysOld = accountAge / (1000 * 60 * 60 * 24)
      
      if (daysOld < 30) {
        score += 15 // Very new account
      } else if (daysOld < 90) {
        score += 5
      }
    }
    
    return Math.min(100, Math.max(0, score))
  }
  
  /**
   * Generate detailed bot report for dashboard
   * Still no raw usernames - just categories and stats
   */
  static generateBotReport(analysis: BotAnalysisResult): string {
    return `
# 🤖 Bot Detection Report

## Overall Health
- **Total Followers Analyzed:** ${analysis.totalFollowers.toLocaleString()}
- **Bots Detected:** ${analysis.botsDetected.toLocaleString()} (${analysis.botPercentage}%)
- **Risk Score:** ${analysis.riskScore}/100

## Category Breakdown
- ✅ Clean Accounts: ${analysis.categories.clean.toLocaleString()} (${Math.round((analysis.categories.clean / analysis.totalFollowers) * 100)}%)
- 📉 Inactive Accounts: ${analysis.categories.inactive.toLocaleString()} (${Math.round((analysis.categories.inactive / analysis.totalFollowers) * 100)}%)
- 🔍 Suspicious Accounts: ${analysis.categories.suspicious.toLocaleString()} (${Math.round((analysis.categories.suspicious / analysis.totalFollowers) * 100)}%)
- ⚠️ Likely Bots: ${analysis.categories.likelyBot.toLocaleString()} (${Math.round((analysis.categories.likelyBot / analysis.totalFollowers) * 100)}%)
- 🚫 Definite Bots: ${analysis.categories.definiteBot.toLocaleString()} (${Math.round((analysis.categories.definiteBot / analysis.totalFollowers) * 100)}%)

## Key Insights
${analysis.insights.map(i => `- ${i}`).join('\n')}

## Recommendations
${analysis.recommendations.map(r => `- ${r}`).join('\n')}

---
*Analysis completed at ${new Date().toLocaleString()}*
    `.trim()
  }
}
