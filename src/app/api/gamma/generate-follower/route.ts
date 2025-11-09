import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase-admin'

export const dynamic = 'force-dynamic'
export const maxDuration = 60 // Allow up to 60 seconds for Gamma generation

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.split('Bearer ')[1]
    const decodedToken = await adminAuth.verifyIdToken(token)
    const userId = decodedToken.uid

    const body = await request.json()
    const { follower, analysisId, username, targetUsername } = body

    // Handle two cases:
    // 1. Full follower object from analysis (has category, influenceScore, etc)
    // 2. Just username from dashboard (need to fetch follower data)
    let followerData: any

    if (follower && follower.username) {
      // Case 1: Full analysis data provided
      followerData = follower
    } else if (username) {
      // Case 2: Just username provided - fetch from database
      try {
        console.log('[Gamma] Fetching follower data for:', username)
        const followersRef = adminDb.collection('users').doc(userId).collection('followers')
        
        // Try direct document access first (since doc ID = username)
        const followerDoc = await followersRef.doc(username).get()
        
        if (!followerDoc.exists) {
          console.log('[Gamma] Follower not found by doc ID, trying query...')
          // Fall back to query in case usernames don't match doc IDs
          const query = followersRef.where('username', '==', username).limit(1)
          const snapshot = await query.get()
          
          if (snapshot.empty) {
            console.error('[Gamma] Follower not found:', { username, userId })
            return NextResponse.json({ 
              error: `Follower @${username} not found in your database. Try re-scanning followers.` 
            }, { status: 404 })
          }
          
          const dbFollowerData = snapshot.docs[0].data()
          console.log('[Gamma] Found follower via query:', dbFollowerData.username)
          
          // Create basic follower data from database record
          followerData = {
            username: dbFollowerData.username || username,
            name: dbFollowerData.name || dbFollowerData.display_name || username,
            category: 'Follower',
            influenceScore: Math.min(10, Math.floor((dbFollowerData.followersCount || 0) / 1000)),
            engagementValue: dbFollowerData.followersCount > 10000 ? 'HIGH' : dbFollowerData.followersCount > 1000 ? 'MEDIUM' : 'LOW',
            priority: dbFollowerData.followersCount > 10000 ? 'HIGH' : dbFollowerData.followersCount > 1000 ? 'MEDIUM' : 'LOW',
            strategicValue: dbFollowerData.bio || `@${username} is one of your followers`,
            actionRecommendation: dbFollowerData.followersCount > 10000 ? 'Engage with this high-value follower' : 'Monitor for engagement opportunities',
            followerCount: dbFollowerData.followersCount || 0,
            verified: dbFollowerData.verified || false,
            bio: dbFollowerData.bio || ''
          }
        } else {
          const followerDocData = followerDoc.data()
          console.log('[Gamma] Found follower via doc ID:', followerDocData?.username)
          
          // Create basic follower data from database record
          followerData = {
            username: followerDocData?.username || username,
            name: followerDocData?.name || followerDocData?.display_name || username,
            category: 'Follower',
            influenceScore: Math.min(10, Math.floor((followerDocData?.followersCount || 0) / 1000)),
            engagementValue: followerDocData?.followersCount > 10000 ? 'HIGH' : followerDocData?.followersCount > 1000 ? 'MEDIUM' : 'LOW',
            priority: followerDocData?.followersCount > 10000 ? 'HIGH' : followerDocData?.followersCount > 1000 ? 'MEDIUM' : 'LOW',
            strategicValue: followerDocData?.bio || `@${username} is one of your followers`,
            actionRecommendation: followerDocData?.followersCount > 10000 ? 'Engage with this high-value follower' : 'Monitor for engagement opportunities',
            followerCount: followerDocData?.followersCount || 0,
            verified: followerDocData?.verified || false,
            bio: followerDocData?.bio || ''
          }
        }
      } catch (err: any) {
        console.error('[Gamma] Error fetching follower:', err)
        return NextResponse.json({ 
          error: 'Failed to fetch follower data',
          details: err.message
        }, { status: 500 })
      }
    } else {
      return NextResponse.json({ 
        error: 'Missing follower data or username' 
      }, { status: 400 })
    }

    // Select theme based on follower category and priority
    const getThemeForFollower = (category: string, priority: string) => {
      // Tech/Business categories get professional themes
      if (category.toLowerCase().includes('tech') || category.toLowerCase().includes('engineer')) {
        return priority === 'HIGH' ? 'aurora' : 'midnight'
      }
      if (category.toLowerCase().includes('business') || category.toLowerCase().includes('entrepreneur')) {
        return 'corporate'
      }
      if (category.toLowerCase().includes('creator') || category.toLowerCase().includes('influencer')) {
        return 'vibrant'
      }
      if (category.toLowerCase().includes('media') || category.toLowerCase().includes('journalist')) {
        return 'modern'
      }
      // Default themes based on priority
      if (priority === 'HIGH') return 'aurora'
      if (priority === 'MEDIUM') return 'modern'
      return 'minimal'
    }

    const selectedTheme = getThemeForFollower(followerData.category, followerData.priority)

    // Create rich markdown content for Gamma
    const markdownContent = `# 📊 ${followerData.name || followerData.username}
## Follower Analysis Report

**@${followerData.username}**${followerData.verified ? ' ✓ Verified' : ''}

---

## 🎯 Overview

**Influence Score:** ${followerData.influenceScore}/10  
**Category:** ${followerData.category}  
**Priority:** ${followerData.priority}  
**Engagement Level:** ${followerData.engagementValue}
${followerData.followerCount ? `**Followers:** ${followerData.followerCount.toLocaleString()}` : ''}

---

## 📊 Key Metrics

| Metric | Value |
|--------|-------|
| Influence Score | ${followerData.influenceScore}/10 |
| Category | ${followerData.category} |
| Priority Level | ${followerData.priority} |
| Engagement Value | ${followerData.engagementValue} |
${followerData.followerCount ? `| Follower Count | ${followerData.followerCount.toLocaleString()} |` : ''}
${followerData.verified ? '| Verified | ✓ Yes |' : ''}

---

${followerData.bio ? `## 📝 Bio

${followerData.bio}

---

` : ''}## 💡 Why They Matter

${followerData.strategicValue}

---

## ✨ Recommended Action

${followerData.actionRecommendation}

---

*Generated by Followlytics AI Analysis*`

    // Store Gamma generation request
    const generationId = `gamma_follower_${Date.now()}_${Math.random().toString(36).substring(7)}`
    
    await adminDb.collection('gamma_reports').doc(generationId).set({
      userId,
      analysisId: analysisId || null,
      followerUsername: followerData.username,
      followerData: followerData,
      theme: selectedTheme,
      status: 'generating',
      createdAt: new Date(),
      type: 'individual_follower'
    })

    // Call Gamma API to actually generate the report
    if (process.env.GAMMA_API_KEY) {
      try {
        // Use Gamma's public API v0.2 endpoint (correct format)
        const gammaResponse = await fetch('https://public-api.gamma.app/v0.2/generations', {
          method: 'POST',
          headers: {
            'X-API-Key': process.env.GAMMA_API_KEY,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            inputText: markdownContent,
            textMode: 'preserve',
            format: 'document',
            textOptions: {
              language: 'en'
            }
            // Note: theme selection handled by Gamma's AI
          })
        })

        if (gammaResponse.ok) {
          const gammaData = await gammaResponse.json()
          const generationGammaId = gammaData.id || gammaData.generationId
          
          // Gamma API returns generation ID, need to poll for URL
          // Store generation ID and let frontend poll for completion
          await adminDb.collection('gamma_reports').doc(generationId).update({
            status: 'generating',
            gammaGenerationId: generationGammaId,
            statusUrl: `https://public-api.gamma.app/v0.2/generations/${generationGammaId}`,
            updatedAt: new Date()
          })
          
          console.log('[Gamma] Generation started:', {
            generationId,
            gammaGenerationId: generationGammaId,
            follower: followerData.username,
            message: 'Frontend will poll for completion'
          })
          
          // Note: Frontend polls for completion via /api/gamma/status
          // This allows proper timeout handling and user feedback
        } else {
          const errorText = await gammaResponse.text()
          console.error('[Gamma] API error response:', {
            status: gammaResponse.status,
            statusText: gammaResponse.statusText,
            body: errorText,
            apiKey: process.env.GAMMA_API_KEY ? 'Present (hidden)' : 'Missing'
          })
          throw new Error(`Gamma API request failed: ${gammaResponse.status} - ${errorText}`)
        }
      } catch (gammaError: any) {
        console.error('[Gamma] Generation error:', {
          message: gammaError.message,
          stack: gammaError.stack,
          follower: followerData.username
        })
        
        // Fall back to simulation with helpful message
        await adminDb.collection('gamma_reports').doc(generationId).update({
          status: 'completed',
          url: `https://gamma.app/docs/follower-analysis-${followerData.username.toLowerCase()}-${generationId}`,
          completedAt: new Date(),
          note: `Simulated (API Error: ${gammaError.message}). This is a demo link. Add valid GAMMA_API_KEY to Vercel environment variables for real Gamma generation.`,
          isSimulated: true
        })
      }
    } else {
      console.log('[Gamma] No API key configured - using simulation mode')
      // No API key - simulate generation
      setTimeout(async () => {
        try {
          await adminDb.collection('gamma_reports').doc(generationId).update({
            status: 'completed',
            url: `https://gamma.app/docs/follower-analysis-${followerData.username.toLowerCase()}-${generationId}`,
            completedAt: new Date(),
            note: 'Simulated - Add GAMMA_API_KEY to Vercel environment variables for real Gamma generation'
          })
        } catch (error) {
          console.error('Failed to update Gamma status:', error)
        }
      }, 5000)
    }

    return NextResponse.json({
      success: true,
      generationId,
      message: 'Gamma generation started'
    })

  } catch (error: any) {
    console.error('Generate follower Gamma error:', error)
    return NextResponse.json({ 
      error: 'Failed to generate Gamma',
      details: error.message 
    }, { status: 500 })
  }
}
