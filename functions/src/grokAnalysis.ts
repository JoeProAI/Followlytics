import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import axios from 'axios';

const db = admin.firestore();

interface GrokAnalysis {
  explanation: string;
  confidence: number;
  factors: string[];
}

interface Tweet {
  id: string;
  text: string;
  created_at: string;
  public_metrics: {
    like_count: number;
    retweet_count: number;
    reply_count: number;
  };
}

class GrokAnalyzer {
  private apiKey: string;
  private baseURL: string = 'https://api.x.ai/v1';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async analyzeUnfollow(recentTweets: Tweet[], unfollowerData: any): Promise<GrokAnalysis> {
    const prompt = `
Analyze why @${unfollowerData.username} might have unfollowed based on these recent tweets:

${recentTweets.map(t => `"${t.text}" (${t.public_metrics.like_count} likes, ${t.public_metrics.retweet_count} retweets)`).join('\n')}

Provide a brief explanation (max 150 words) focusing on:
1. Content tone/sentiment
2. Controversial topics
3. Posting frequency
4. Engagement patterns

Format as JSON: {"explanation": "...", "confidence": 0.85, "factors": ["political_content", "high_frequency", "low_engagement"]}

Possible factors: political_content, controversial_topics, high_frequency, low_engagement, negative_sentiment, off_brand_content, spam_like, personal_attacks, misinformation
`;

    try {
      const response = await axios.post(`${this.baseURL}/chat/completions`, {
        model: 'grok-beta',
        messages: [
          {
            role: 'system',
            content: 'You are an expert social media analyst. Analyze Twitter unfollow patterns and provide insights in JSON format.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 300,
        temperature: 0.3
      }, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      const content = response.data.choices[0].message.content;
      
      try {
        return JSON.parse(content);
      } catch (parseError) {
        // Fallback if JSON parsing fails
        return {
          explanation: content.substring(0, 150),
          confidence: 0.5,
          factors: ['analysis_error']
        };
      }
    } catch (error) {
      console.error('Error calling Grok API:', error);
      return {
        explanation: 'Unable to analyze unfollow reason due to API error.',
        confidence: 0.0,
        factors: ['api_error']
      };
    }
  }
}

async function fetchRecentTweets(accessToken: string, userId: string): Promise<Tweet[]> {
  try {
    const response = await axios.get(`https://api.twitter.com/2/users/${userId}/tweets`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'User-Agent': 'UnfollowTracker/1.0'
      },
      params: {
        'tweet.fields': 'created_at,public_metrics',
        'max_results': 10,
        'exclude': 'retweets,replies'
      }
    });

    return response.data.data || [];
  } catch (error) {
    console.error('Error fetching recent tweets:', error);
    return [];
  }
}

export const processUnfollows = functions.firestore
  .document('users/{uid}/unfollows/{eventId}')
  .onCreate(async (snap, context) => {
    const { uid, eventId } = context.params;
    const unfollowData = snap.data();

    console.log(`Processing unfollow analysis for user ${uid}, event ${eventId}`);

    try {
      // Get user data to access tokens
      const userDoc = await db.collection('users').doc(uid).get();
      const userData = userDoc.data();

      if (!userData) {
        console.error('User data not found');
        return;
      }

      // Check if user has AI insights enabled (not free tier)
      if (userData.subscription === 'free') {
        console.log('Skipping AI analysis for free tier user');
        return;
      }

      // Get xAI API key from environment
      const xaiApiKey = functions.config().xai?.api_key;
      if (!xaiApiKey) {
        console.error('xAI API key not configured');
        return;
      }

      // Fetch recent tweets
      const recentTweets = await fetchRecentTweets(userData.xAccessToken, userData.xUserId);

      if (recentTweets.length === 0) {
        console.log('No recent tweets found for analysis');
        await snap.ref.update({
          grokAnalysis: {
            explanation: 'No recent tweets available for analysis.',
            confidence: 0.0,
            factors: ['no_recent_content']
          }
        });
        return;
      }

      // Analyze with Grok
      const grokAnalyzer = new GrokAnalyzer(xaiApiKey);
      const analysis = await grokAnalyzer.analyzeUnfollow(recentTweets, {
        username: unfollowData.unfollowerHandle,
        name: unfollowData.unfollowerName
      });

      // Update the unfollow record with analysis and tweets
      await snap.ref.update({
        grokAnalysis: analysis,
        recentTweets: recentTweets.slice(0, 5), // Store only 5 most recent
        analyzedAt: admin.firestore.Timestamp.now()
      });

      console.log(`Analysis completed for ${unfollowData.unfollowerHandle}`);

    } catch (error) {
      console.error('Error in processUnfollows:', error);
      
      // Update with error state
      await snap.ref.update({
        grokAnalysis: {
          explanation: 'Analysis failed due to technical error.',
          confidence: 0.0,
          factors: ['processing_error']
        },
        analyzedAt: admin.firestore.Timestamp.now()
      });
    }
  });
