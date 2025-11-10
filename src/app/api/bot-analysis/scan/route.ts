// Bot Analysis API - Safe Implementation
// Uses Apify for data extraction, but ONLY returns bot analysis
// User never receives raw follower data - only insights

import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase-admin'
import { getApifyClient } from '@/lib/apify-client'
import { BotDetector } from '@/lib/bot-detector'
import { checkCredits, deductCredits } from '@/lib/credits'
import { v4 as uuidv4 } from 'uuid'

export const maxDuration = 300 // 5 minutes

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const idToken = authHeader.split('Bearer ')[1]
    const decodedToken = await adminAuth.verifyIdToken(idToken)
    const userId = decodedToken.uid

    const { username } = await request.json()

    if (!username) {
      return NextResponse.json({ error: 'Username is required' }, { status: 400 })
    }

    console.log(`[Bot Analysis] Starting scan for @${username}`)

    // Check credit balance (uses follower credits - 1000 followers analyzed)
    const hasCredits = await checkCredits(userId, 'followers', 1000)
    if (!hasCredits) {
      return NextResponse.json({
        error: 'Insufficient credits',
        details: 'You have used all your follower analysis credits for this month. Upgrade your plan for more.'
      }, { status: 402 })
    }

    // Create scan record
    const scanId = uuidv4()
    const scanRef = adminDb.collection('users').doc(userId).collection('bot_scans').doc(scanId)
    
    await scanRef.set({
      scanId,
      userId,
      username: username.toLowerCase(),
      status: 'analyzing',
      createdAt: new Date(),
      progress: {
        phase: 'extracting',
        percentage: 10,
        message: 'Extracting follower data for analysis...'
      }
    })

    // Start analysis in background
    analyzeBots(userId, username, scanId).catch(err => {
      console.error('[Bot Analysis] Background analysis failed:', err)
    })

    return NextResponse.json({
      success: true,
      scanId,
      message: 'Bot analysis started',
      estimatedTime: '2-5 minutes'
    })

  } catch (error: any) {
    console.error('[Bot Analysis] Error:', error)
    return NextResponse.json({
      error: 'Failed to start bot analysis',
      details: error.message
    }, { status: 500 })
  }
}

// Background analysis function
async function analyzeBots(userId: string, username: string, scanId: string) {
  const scanRef = adminDb.collection('users').doc(userId).collection('bot_scans').doc(scanId)
  
  try {
    // Step 1: Extract follower data via Apify
    console.log(`[Bot Analysis] Extracting followers for @${username}...`)
    
    await scanRef.update({
      progress: {
        phase: 'extracting',
        percentage: 20,
        message: 'Extracting follower profiles...'
      }
    })

    const apify = getApifyClient()
    const result = await apify.extractFollowers(username, {
      maxFollowers: 1000, // Analyze up to 1000 followers
      includeDetails: true
    })

    if (!result.success || result.followers.length === 0) {
      throw new Error(result.error || 'No followers found')
    }

    console.log(`[Bot Analysis] Extracted ${result.followers.length} followers`)

    // Step 2: Analyze for bots (NO raw data stored)
    await scanRef.update({
      progress: {
        phase: 'analyzing',
        percentage: 60,
        message: `Analyzing ${result.followers.length} followers for bot indicators...`
      }
    })

    const analysis = await BotDetector.analyzeForBots(result.followers.map(f => ({
      username: f.username,
      name: f.name,
      bio: f.bio,
      verified: f.verified,
      followersCount: f.followersCount || 0,
      followingCount: f.followingCount || 0,
      profileImageUrl: f.profileImageUrl,
      defaultProfileImage: !f.profileImageUrl || f.profileImageUrl.includes('default_profile')
    })))

    console.log(`[Bot Analysis] Analysis complete:`, {
      total: analysis.totalFollowers,
      bots: analysis.botsDetected,
      percentage: analysis.botPercentage
    })

    // Step 3: Store ONLY bot analysis (no raw follower data)
    await scanRef.update({
      status: 'completed',
      completedAt: new Date(),
      
      // ONLY analysis results - NO usernames or raw data
      analysis: {
        totalFollowers: analysis.totalFollowers,
        botsDetected: analysis.botsDetected,
        botPercentage: analysis.botPercentage,
        riskScore: analysis.riskScore,
        categories: analysis.categories,
        insights: analysis.insights,
        recommendations: analysis.recommendations
      },
      
      progress: {
        phase: 'completed',
        percentage: 100,
        message: `✅ Analysis complete: ${analysis.botPercentage}% bots detected`
      }
    })

    // Deduct credits (1000 followers analyzed)
    await deductCredits(userId, 'followers', result.followers.length, {
      description: `Bot analysis for @${username}`,
      endpoint: '/api/bot-analysis/scan',
      username
    })

    console.log(`[Bot Analysis] Scan ${scanId} completed successfully`)

    // Step 4: Generate Gamma report with bot analysis
    if (process.env.GAMMA_API_KEY) {
      try {
        console.log('[Bot Analysis] Generating Gamma report...')
        
        const reportMarkdown = BotDetector.generateBotReport(analysis)
        
        // This will be handled by a separate endpoint
        // Just log for now
        console.log('[Bot Analysis] Gamma report would be generated here')
      } catch (gammaError) {
        console.error('[Bot Analysis] Gamma generation failed:', gammaError)
      }
    }

  } catch (error: any) {
    console.error('[Bot Analysis] Analysis error:', error)

    await scanRef.update({
      status: 'failed',
      error: error.message,
      failedAt: new Date(),
      progress: {
        phase: 'failed',
        percentage: 0,
        message: `❌ Analysis failed: ${error.message}`
      }
    })
  }
}
