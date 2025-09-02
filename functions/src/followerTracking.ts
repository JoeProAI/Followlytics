import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import axios from 'axios';

const db = admin.firestore();

interface User {
  uid: string;
  xHandle: string;
  xUserId: string;
  xAccessToken: string;
  subscription: 'free' | 'starter' | 'professional' | 'agency';
  lastSync: admin.firestore.Timestamp;
  rateLimitReset?: admin.firestore.Timestamp;
  requestsUsed?: number;
}

interface Follower {
  id: string;
  username: string;
  name: string;
  profile_image_url: string;
}

class RateLimiter {
  private static readonly RATE_LIMITS = {
    followerLookups: 500, // per 24 hours per app
    userLookups: 100, // per 24 hours per user
  };

  static async canMakeRequest(userId: string, requestType: 'follower' | 'user'): Promise<boolean> {
    const userDoc = await db.collection('users').doc(userId).get();
    const userData = userDoc.data() as User;
    
    if (!userData) return false;

    const now = admin.firestore.Timestamp.now();
    const resetTime = userData.rateLimitReset;
    
    // Reset counters if 24 hours have passed
    if (!resetTime || now.toMillis() - resetTime.toMillis() > 24 * 60 * 60 * 1000) {
      await userDoc.ref.update({
        requestsUsed: 0,
        rateLimitReset: now
      });
      return true;
    }

    const requestsUsed = userData.requestsUsed || 0;
    const limit = requestType === 'follower' ? 
      this.RATE_LIMITS.followerLookups : 
      this.RATE_LIMITS.userLookups;

    return requestsUsed < limit;
  }

  static async incrementUsage(userId: string): Promise<void> {
    await db.collection('users').doc(userId).update({
      requestsUsed: admin.firestore.FieldValue.increment(1)
    });
  }

  static getPriorityOrder(users: User[]): User[] {
    // Sort by subscription tier (premium users first)
    const tierPriority = { 'agency': 4, 'professional': 3, 'starter': 2, 'free': 1 };
    return users.sort((a, b) => tierPriority[b.subscription] - tierPriority[a.subscription]);
  }
}

async function fetchFollowers(accessToken: string, userId: string): Promise<Follower[]> {
  try {
    const response = await axios.get(`https://api.twitter.com/2/users/${userId}/followers`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'User-Agent': 'UnfollowTracker/1.0'
      },
      params: {
        'user.fields': 'id,username,name,profile_image_url',
        'max_results': 1000
      }
    });

    return response.data.data || [];
  } catch (error) {
    console.error('Error fetching followers:', error);
    throw error;
  }
}

async function detectUnfollows(userId: string, currentFollowers: Follower[]): Promise<Follower[]> {
  // Get the last snapshot
  const lastSnapshotQuery = await db
    .collection('users')
    .doc(userId)
    .collection('followers')
    .orderBy('timestamp', 'desc')
    .limit(1)
    .get();

  if (lastSnapshotQuery.empty) {
    return []; // No previous data to compare
  }

  const lastSnapshot = lastSnapshotQuery.docs[0].data();
  const previousFollowers = lastSnapshot.followers || [];
  
  // Create sets for efficient comparison
  const currentFollowerIds = new Set(currentFollowers.map(f => f.id));
  const previousFollowerIds = new Set(previousFollowers.map((f: Follower) => f.id));

  // Find unfollowers (in previous but not in current)
  const unfollowers = previousFollowers.filter((f: Follower) => 
    !currentFollowerIds.has(f.id)
  );

  return unfollowers;
}

async function storeSnapshot(userId: string, followers: Follower[]): Promise<void> {
  const timestamp = admin.firestore.Timestamp.now();
  
  await db
    .collection('users')
    .doc(userId)
    .collection('followers')
    .add({
      timestamp,
      followers,
      totalCount: followers.length,
      changes: {
        gained: 0, // Will be calculated in comparison
        lost: 0
      }
    });
}

async function recordUnfollows(userId: string, unfollowers: Follower[]): Promise<void> {
  const batch = db.batch();
  const timestamp = admin.firestore.Timestamp.now();

  for (const unfollower of unfollowers) {
    const unfollowRef = db
      .collection('users')
      .doc(userId)
      .collection('unfollows')
      .doc();

    batch.set(unfollowRef, {
      unfollowerHandle: unfollower.username,
      unfollowerId: unfollower.id,
      unfollowerName: unfollower.name,
      unfollowerProfileImage: unfollower.profile_image_url,
      timestamp,
      grokAnalysis: null, // Will be filled by processUnfollows function
      recentTweets: []
    });
  }

  await batch.commit();
}

export const pollFollowers = functions.pubsub
  .schedule('*/15 * * * *') // Every 15 minutes
  .timeZone('America/New_York')
  .onRun(async (context) => {
    console.log('Starting follower polling...');

    try {
      // Get all active users
      const usersSnapshot = await db.collection('users').get();
      const users = usersSnapshot.docs.map(doc => ({
        uid: doc.id,
        ...doc.data()
      })) as User[];

      // Sort by priority (premium users first)
      const prioritizedUsers = RateLimiter.getPriorityOrder(users);

      let processedCount = 0;
      const maxProcessPerRun = 50; // Limit to avoid timeout

      for (const user of prioritizedUsers) {
        if (processedCount >= maxProcessPerRun) break;

        // Check rate limits
        if (!await RateLimiter.canMakeRequest(user.uid, 'follower')) {
          console.log(`Rate limit reached for user ${user.xHandle}`);
          continue;
        }

        try {
          // Fetch current followers
          const currentFollowers = await fetchFollowers(user.xAccessToken, user.xUserId);
          
          // Detect unfollows
          const unfollowers = await detectUnfollows(user.uid, currentFollowers);
          
          // Store new snapshot
          await storeSnapshot(user.uid, currentFollowers);
          
          // Record unfollows if any
          if (unfollowers.length > 0) {
            await recordUnfollows(user.uid, unfollowers);
            console.log(`Detected ${unfollowers.length} unfollows for ${user.xHandle}`);
          }

          // Update rate limit usage
          await RateLimiter.incrementUsage(user.uid);
          
          // Update last sync time
          await db.collection('users').doc(user.uid).update({
            lastSync: admin.firestore.Timestamp.now()
          });

          processedCount++;
          
        } catch (error) {
          console.error(`Error processing user ${user.xHandle}:`, error);
          continue;
        }
      }

      console.log(`Processed ${processedCount} users`);
      return null;

    } catch (error) {
      console.error('Error in pollFollowers:', error);
      throw error;
    }
  });
