import { NextRequest, NextResponse } from 'next/server'
import { getAuth } from 'firebase-admin/auth'
import getFirebaseAdminApp from '@/lib/firebase-admin'
import { getFirestore } from 'firebase-admin/firestore'
import { ApifyClient } from 'apify-client'

const adminDb = getFirestore(getFirebaseAdminApp())

// Initialize Apify client
const apifyClient = new ApifyClient({
  token: process.env.APIFY_API_TOKEN,
})

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.split('Bearer ')[1]
    const decodedToken = await getAuth(getFirebaseAdminApp()).verifyIdToken(token)
    const userId = decodedToken.uid

    const body = await request.json()
    const { usernames } = body // Array of usernames to enrich

    if (!usernames || !Array.isArray(usernames) || usernames.length === 0) {
      return NextResponse.json({ 
        error: 'Missing usernames array' 
      }, { status: 400 })
    }

    console.log(`[Enrich] Enriching ${usernames.length} users for ${userId}`)

    // Run the Premium X User Scraper Actor
    const run = await apifyClient.actor('kaitoeasyapi/premium-twitter-user-scraper-pay-per-result').call({
      user_names: usernames,
    })

    // Fetch results from the Actor's dataset
    const { items } = await apifyClient.dataset(run.defaultDatasetId).listItems()

    console.log(`[Enrich] Retrieved ${items.length} enriched profiles`)

    // Process and structure the enriched data
    const enrichedData = items.map((item: any) => ({
      username: item.screen_name || item.username,
      name: item.name,
      bio: item.description,
      verified: item.verified || false,
      verified_type: item.verified_type || null, // blue, gold, gray checkmarks
      followers_count: item.followers_count,
      following_count: item.friends_count,
      tweet_count: item.statuses_count,
      location: item.location,
      profile_image_url: item.profile_image_url_https,
      profile_banner_url: item.profile_banner_url,
      created_at: item.created_at,
      url: item.url,
      is_protected: item.protected || false,
      is_blue_verified: item.is_blue_verified || false,
    }))

    // Update Firestore with enriched data
    const batch = adminDb.batch()
    const userDoc = await adminDb.collection('users').doc(userId).get()
    const targetUsername = userDoc.data()?.xUsername || userDoc.data()?.twitterUsername

    if (targetUsername) {
      const followersCollectionRef = adminDb
        .collection('users')
        .doc(userId)
        .collection('followers')

      enrichedData.forEach((profile: any) => {
        const sanitizedUsername = profile.username
          .replace(/^_+|_+$/g, '')
          .replace(/\//g, '_')
          .replace(/\./g, '_') || 'unknown_user'

        const docRef = followersCollectionRef.doc(sanitizedUsername)
        
        batch.update(docRef, {
          verified: profile.verified,
          verified_type: profile.verified_type,
          is_blue_verified: profile.is_blue_verified,
          followers_count: profile.followers_count,
          following_count: profile.following_count,
          tweet_count: profile.tweet_count,
          bio: profile.bio,
          location: profile.location,
          profile_image_url: profile.profile_image_url,
          profile_banner_url: profile.profile_banner_url,
          url: profile.url,
          is_protected: profile.is_protected,
          enriched_at: new Date().toISOString(),
        })
      })

      await batch.commit()
      console.log(`[Enrich] Updated ${enrichedData.length} follower records in Firestore`)
    }

    return NextResponse.json({
      success: true,
      enriched_count: enrichedData.length,
      profiles: enrichedData,
      cost: ((enrichedData.length / 1000) * 0.15).toFixed(4),
      run_id: run.id,
    })

  } catch (error: any) {
    console.error('[Enrich] Error:', error)
    return NextResponse.json({ 
      error: 'Failed to enrich followers',
      details: error.message 
    }, { status: 500 })
  }
}
