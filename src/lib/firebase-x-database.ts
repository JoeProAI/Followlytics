// Firebase X Database - Track all X account data for analytics and bot detection
// Separate from follower_database for clean separation of concerns

import { adminDb } from './firebase-admin'
import { Timestamp } from 'firebase-admin/firestore'

export interface XProfileData {
  username: string
  displayName: string
  followerCount: number
  followingCount: number
  tweetCount: number
  verified: boolean
  bio: string
  location?: string
  website?: string
  createdAt?: string
  profileImageUrl?: string
  
  // Analytics
  lastScanned: Timestamp
  scanHistory: ProfileScanRecord[]
  
  // Bot Detection
  botScore?: number
  botFlags: string[]
  isLikelyBot: boolean
  
  // Engagement Metrics
  averageLikes?: number
  averageRetweets?: number
  engagementRate?: number
}

export interface ProfileScanRecord {
  timestamp: Timestamp
  followerCount: number
  followingCount: number
  tweetCount: number
  source: 'daytona' | 'apify' | 'x_api'
}

export interface XFollowerRecord {
  // Follower identity
  username: string
  displayName: string
  userId?: string
  
  // Profile data
  followerCount: number
  followingCount: number
  tweetCount: number
  verified: boolean
  bio: string
  
  // Bot detection
  botScore: number
  botFlags: string[]
  isLikelyBot: boolean
  
  // Relationship
  targetUsername: string  // Who they follow
  followingSince?: Timestamp
  
  // Analytics
  lastUpdated: Timestamp
  engagementScore?: number
}

export class XDatabase {
  private db = adminDb

  /**
   * Store or update X profile data
   */
  async upsertProfile(username: string, data: Partial<XProfileData>): Promise<void> {
    const cleanUsername = username.replace('@', '').toLowerCase()
    
    const profileRef = this.db.collection('x_profiles').doc(cleanUsername)
    const existing = await profileRef.get()

    if (existing.exists) {
      // Update existing profile
      const existingData = existing.data() as XProfileData
      
      // Add to scan history
      const scanRecord: ProfileScanRecord = {
        timestamp: Timestamp.now(),
        followerCount: data.followerCount || existingData.followerCount,
        followingCount: data.followingCount || existingData.followingCount || 0,
        tweetCount: data.tweetCount || existingData.tweetCount || 0,
        source: data.botScore !== undefined ? 'daytona' : 'apify'
      }

      await profileRef.update({
        ...data,
        lastScanned: Timestamp.now(),
        scanHistory: [...(existingData.scanHistory || []), scanRecord]
      })
    } else {
      // Create new profile
      await profileRef.set({
        username: cleanUsername,
        displayName: data.displayName || cleanUsername,
        followerCount: data.followerCount || 0,
        followingCount: data.followingCount || 0,
        tweetCount: data.tweetCount || 0,
        verified: data.verified || false,
        bio: data.bio || '',
        location: data.location,
        website: data.website,
        profileImageUrl: data.profileImageUrl,
        lastScanned: Timestamp.now(),
        scanHistory: [{
          timestamp: Timestamp.now(),
          followerCount: data.followerCount || 0,
          followingCount: data.followingCount || 0,
          tweetCount: data.tweetCount || 0,
          source: 'daytona'
        }],
        botScore: data.botScore || 0,
        botFlags: data.botFlags || [],
        isLikelyBot: data.isLikelyBot || false
      })
    }

    console.log(`[X Database] Upserted profile: @${cleanUsername}`)
  }

  /**
   * Store follower data for analytics and bot detection
   */
  async storeFollowers(
    targetUsername: string,
    followers: XFollowerRecord[]
  ): Promise<void> {
    const cleanTarget = targetUsername.replace('@', '').toLowerCase()
    
    const batch = this.db.batch()
    const collectionRef = this.db.collection('x_followers')

    for (const follower of followers) {
      const docId = `${cleanTarget}_${follower.username}`
      const docRef = collectionRef.doc(docId)

      batch.set(docRef, {
        ...follower,
        targetUsername: cleanTarget,
        lastUpdated: Timestamp.now()
      }, { merge: true })
    }

    await batch.commit()
    console.log(`[X Database] Stored ${followers.length} followers for @${cleanTarget}`)
  }

  /**
   * Get profile data
   */
  async getProfile(username: string): Promise<XProfileData | null> {
    const cleanUsername = username.replace('@', '').toLowerCase()
    const doc = await this.db.collection('x_profiles').doc(cleanUsername).get()

    if (!doc.exists) {
      return null
    }

    return doc.data() as XProfileData
  }

  /**
   * Get followers for analytics
   */
  async getFollowers(targetUsername: string): Promise<XFollowerRecord[]> {
    const cleanTarget = targetUsername.replace('@', '').toLowerCase()
    
    const snapshot = await this.db.collection('x_followers')
      .where('targetUsername', '==', cleanTarget)
      .get()

    return snapshot.docs.map(doc => doc.data() as XFollowerRecord)
  }

  /**
   * Get bot followers
   */
  async getBotFollowers(targetUsername: string, minBotScore: number = 0.7): Promise<XFollowerRecord[]> {
    const cleanTarget = targetUsername.replace('@', '').toLowerCase()
    
    const snapshot = await this.db.collection('x_followers')
      .where('targetUsername', '==', cleanTarget)
      .where('botScore', '>=', minBotScore)
      .get()

    return snapshot.docs.map(doc => doc.data() as XFollowerRecord)
  }

  /**
   * Get analytics for a profile
   */
  async getAnalytics(username: string) {
    const profile = await this.getProfile(username)
    if (!profile) return null

    const followers = await this.getFollowers(username)
    const botFollowers = await this.getBotFollowers(username)

    return {
      username,
      followerCount: profile.followerCount,
      followingCount: profile.followingCount,
      verified: profile.verified,
      
      // Bot stats
      totalBots: botFollowers.length,
      botPercentage: (botFollowers.length / followers.length) * 100,
      realFollowers: followers.length - botFollowers.length,
      
      // Growth
      scanHistory: profile.scanHistory,
      followerGrowth: this.calculateGrowth(profile.scanHistory),
      
      // Engagement
      engagementRate: profile.engagementRate || 0
    }
  }

  private calculateGrowth(history: ProfileScanRecord[]) {
    if (history.length < 2) return 0

    const latest = history[history.length - 1]
    const previous = history[history.length - 2]

    return latest.followerCount - previous.followerCount
  }
}

// Export singleton
export const xDatabase = new XDatabase()
