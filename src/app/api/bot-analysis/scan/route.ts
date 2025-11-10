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

    const { username, generateGamma } = await request.json()

    if (!username) {
      return NextResponse.json({ error: 'Username is required' }, { status: 400 })
    }

    console.log(`[Bot Analysis] Starting scan for @${username}`)
    console.log(`[Bot Analysis] Generate Gamma report: ${generateGamma ? 'YES' : 'NO'}`)

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
      generateGamma: generateGamma || false,
      createdAt: new Date(),
      progress: {
        phase: 'initializing',
        percentage: 0,
        message: 'Starting bot analysis...'
      }
    })

    // Start analysis in background
    analyzeBots(userId, username, scanId, generateGamma).catch(err => {
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
async function analyzeBots(userId: string, username: string, scanId: string, generateGamma: boolean = false) {
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
    if (generateGamma && process.env.GAMMA_API_KEY) {
      try {
        console.log('[Bot Analysis] Generating Gamma report...')
        
        const { getGammaClient } = await import('@/lib/gamma-enhanced')
        const gamma = getGammaClient()
        
        const reportMarkdown = BotDetector.generateBotReport(analysis)
        
        // Generate Gamma presentation with bot analysis
        const gammaResult = await gamma.generate({
          inputText: reportMarkdown,
          textMode: 'preserve',
          format: 'presentation',
          numCards: 8,
          
          imageOptions: {
            source: 'aiGenerated',
            model: 'flux-1-pro',
            style: 'professional, cybersecurity, data visualization, modern, high-tech'
          },
          
          textOptions: {
            amount: 'medium',
            tone: 'professional, analytical',
            audience: 'business professionals, security analysts',
            language: 'en'
          },
          
          additionalInstructions: `Create a professional bot detection report for @${username}. 
            Focus on security insights and data visualization. 
            Use charts and graphs to illustrate the bot percentages and risk scores.`,
          
          sharingOptions: {
            workspaceAccess: 'view',
            externalAccess: 'view'
          }
        })
        
        console.log('[Bot Analysis] Gamma generation started:', gammaResult.id)
        
        // Store Gamma generation ID
        await scanRef.update({
          gammaGenerationId: gammaResult.id,
          gammaStatus: 'generating'
        })
        
        // Poll for Gamma completion (background)
        pollGammaCompletion(scanId, gammaResult.id, gamma, userId).catch((err: any) => {
          console.error('[Bot Analysis] Gamma polling failed:', err)
        })
        
      } catch (gammaError: any) {
        console.error('[Bot Analysis] Gamma generation failed:', gammaError)
        await scanRef.update({
          gammaStatus: 'failed',
          gammaError: gammaError.message
        })
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

// Poll for Gamma completion
async function pollGammaCompletion(
  scanId: string,
  gammaGenerationId: string,
  gammaClient: any,
  userId: string
) {
  try {
    const result = await gammaClient.waitForCompletion(gammaGenerationId, {
      maxWaitTime: 180000, // 3 minutes
      pollInterval: 5000 // 5 seconds
    })
    
    // Update scan with Gamma URLs
    await adminDb
      .collection('users')
      .doc(userId)
      .collection('bot_scans')
      .doc(scanId)
      .update({
        gammaStatus: 'completed',
        gammaUrl: result.urls?.gamma,
        gammaPdfUrl: result.urls?.pdf,
        gammaPptxUrl: result.urls?.pptx,
        gammaCompletedAt: new Date()
      })
    
    console.log('[Bot Analysis] Gamma report completed:', result.urls?.gamma)
    
  } catch (error: any) {
    console.error('[Bot Analysis] Gamma polling error:', error)
    
    await adminDb
      .collection('users')
      .doc(userId)
      .collection('bot_scans')
      .doc(scanId)
      .update({
        gammaStatus: 'failed',
        gammaError: error.message
      })
  }
}
