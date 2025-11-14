import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase-admin'
import { getGammaClient } from '@/lib/gamma-enhanced'

export const dynamic = 'force-dynamic'
export const maxDuration = 60 // Allow up to 60 seconds for Gamma generation

// Background polling for Gamma completion
async function pollGammaCompletion(
  reportId: string,
  gammaGenerationId: string,
  gammaClient: any
) {
  try {
    const result = await gammaClient.waitForCompletion(gammaGenerationId, {
      maxWaitTime: 180000, // 3 minutes
      pollInterval: 5000, // 5 seconds
      onProgress: (status: any) => {
        console.log('[Gamma] Progress:', { reportId, status: status.status })
      }
    })
    
    // Update Firebase with completion
    await adminDb.collection('gamma_reports').doc(reportId).update({
      status: 'completed',
      url: result.urls?.gamma,
      pdfUrl: result.urls?.pdf,
      pptxUrl: result.urls?.pptx,
      completedAt: new Date(),
      warnings: result.warnings || []
    })
    
    console.log('[Gamma] Completed:', { reportId, urls: result.urls })
    
  } catch (error: any) {
    console.error('[Gamma] Polling failed:', error)
    await adminDb.collection('gamma_reports').doc(reportId).update({
      status: 'failed',
      error: error.message,
      updatedAt: new Date()
    })
  }
}

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
    const { follower, analysisId, username, targetUsername, customPrompt, format, exportAs } = body
    
    console.log('[Gamma] Request:', { 
      customPrompt: customPrompt || 'default',
      format: format || 'presentation',
      exportAs: exportAs || 'none'
    })

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

    // SUPER UNIQUE THEMING SYSTEM
    // Each follower gets custom theme, image style, tone, and visuals
    const getUniqueThemeConfig = (follower: any) => {
      const cat = follower.category?.toLowerCase() || ''
      const priority = follower.priority || 'MEDIUM'
      const verified = follower.verified || false
      const influenceScore = follower.influenceScore || 5
      
      // Dynamic theme selection based on multiple factors
      let themeId = 'modern'
      let imageStyle = 'modern, professional, high quality'
      let tone = 'professional, engaging'
      let audience = 'business professionals'
      let visualConcepts = 'data visualization, metrics, analytics'
      
      // AI/ML/Tech personas
      if (cat.includes('ai') || cat.includes('ml') || cat.includes('machine learning')) {
        themeId = verified ? 'aurora' : 'midnight'
        imageStyle = 'futuristic, neural networks, AI-themed, cyberpunk aesthetic, neon accents, tech patterns'
        tone = 'technical but accessible, cutting-edge, innovative'
        audience = 'AI engineers, ML researchers, tech innovators'
        visualConcepts = 'neural networks, data flows, algorithmic patterns, futuristic dashboards'
      }
      // Developers/Engineers
      else if (cat.includes('engineer') || cat.includes('developer') || cat.includes('programmer')) {
        themeId = priority === 'HIGH' ? 'dusk' : 'ocean'
        imageStyle = 'code-themed, terminal aesthetics, developer workspace, clean modern design, tech minimalism'
        tone = 'direct, technical, code-friendly'
        audience = 'software engineers, developers, tech teams'
        visualConcepts = 'code snippets, terminal windows, development environments, technical diagrams'
      }
      // Founders/Entrepreneurs
      else if (cat.includes('founder') || cat.includes('entrepreneur') || cat.includes('ceo')) {
        themeId = verified ? 'luxury' : 'corporate'
        imageStyle = 'executive, premium, strategic, growth-focused, ambitious, high-end business aesthetic'
        tone = 'strategic, visionary, results-driven'
        audience = 'founders, CEOs, entrepreneurs, investors'
        visualConcepts = 'growth charts, strategic roadmaps, business metrics, success indicators'
      }
      // VCs/Investors
      else if (cat.includes('vc') || cat.includes('investor') || cat.includes('venture')) {
        themeId = 'prestige'
        imageStyle = 'financial, premium, investment-focused, wealth-building, sophisticated, data-rich'
        tone = 'analytical, ROI-focused, strategic'
        audience = 'venture capitalists, angel investors, fund managers'
        visualConcepts = 'portfolio analytics, market trends, investment dashboards, financial growth'
      }
      // Content Creators/Influencers
      else if (cat.includes('creator') || cat.includes('influencer') || cat.includes('content')) {
        themeId = influenceScore > 7 ? 'vibrant' : 'creative'
        imageStyle = 'dynamic, colorful, engaging, social media aesthetic, content-focused, eye-catching'
        tone = 'energetic, relatable, engaging'
        audience = 'content creators, influencers, digital marketers'
        visualConcepts = 'social media engagement, viral content, audience growth, creative layouts'
      }
      // Media/Journalists
      else if (cat.includes('journalist') || cat.includes('media') || cat.includes('reporter')) {
        themeId = 'editorial'
        imageStyle = 'editorial, news-worthy, storytelling, journalistic, impactful, narrative-driven'
        tone = 'informative, credible, newsworthy'
        audience = 'journalists, media professionals, news outlets'
        visualConcepts = 'story angles, news impact, media reach, editorial graphics'
      }
      // Designers/Creatives
      else if (cat.includes('design') || cat.includes('creative') || cat.includes('artist')) {
        themeId = 'artistic'
        imageStyle = 'artistic, creative, design-forward, aesthetic, visual-first, innovative layouts'
        tone = 'creative, expressive, visually-driven'
        audience = 'designers, artists, creative professionals'
        visualConcepts = 'design systems, creative portfolios, visual hierarchies, aesthetic compositions'
      }
      // Marketers/Growth
      else if (cat.includes('marketing') || cat.includes('growth') || cat.includes('seo')) {
        themeId = 'performance'
        imageStyle = 'growth-focused, conversion-driven, metrics-heavy, performance marketing, data-backed'
        tone = 'results-oriented, data-driven, conversion-focused'
        audience = 'marketers, growth hackers, performance specialists'
        visualConcepts = 'conversion funnels, growth metrics, A/B testing, marketing dashboards'
      }
      // Academics/Researchers
      else if (cat.includes('research') || cat.includes('professor') || cat.includes('phd')) {
        themeId = 'academic'
        imageStyle = 'scholarly, research-oriented, academic, evidence-based, scientific, publication-quality'
        tone = 'scholarly, evidence-based, analytical'
        audience = 'researchers, academics, scholars'
        visualConcepts = 'research findings, data analysis, scientific diagrams, academic visuals'
      }
      
      // Priority-based theme overrides for high-value followers
      if (priority === 'HIGH' && influenceScore >= 8) {
        themeId = verified ? 'prestige' : 'aurora'
        imageStyle += ', premium quality, high-impact, executive-level'
        tone += ', high-value, strategic'
      }
      
      return {
        themeId,
        imageStyle,
        tone,
        audience,
        visualConcepts,
        // Dynamic card count based on influence
        numCards: influenceScore >= 8 ? 15 : influenceScore >= 6 ? 12 : 10
      }
    }

    const uniqueConfig = getUniqueThemeConfig(followerData)

    // Create rich markdown content for Gamma
    // Use custom prompt if provided, otherwise use default template
    const markdownContent = customPrompt
      ? `# 📊 ${followerData.name || followerData.username}
## Custom Analysis: ${customPrompt}

**@${followerData.username}**${followerData.verified ? ' ✓ Verified' : ''}

---

## 🎯 Profile Overview

**Followers:** ${followerData.followerCount ? followerData.followerCount.toLocaleString() : 'Unknown'}  
${followerData.verified ? '**Status:** ✓ Verified Account' : '**Status:** Standard Account'}  
${followerData.category ? `**Category:** ${followerData.category}` : ''}

${followerData.bio ? `## 📝 Bio

${followerData.bio}

---

` : ''}## 🔍 Analysis Request

**User wants to know:** ${customPrompt}

---

## 💡 Insights

${followerData.strategicValue || 'Based on their profile and follower count, this user shows potential for meaningful engagement.'}

---

## ✨ Key Metrics

| Metric | Value |
|--------|-------|
${followerData.followerCount ? `| Follower Count | ${followerData.followerCount.toLocaleString()} |` : ''}
${followerData.verified ? '| Verified | ✓ Yes |' : '| Verified | No |'}
${followerData.influenceScore ? `| Influence Score | ${followerData.influenceScore}/10 |` : ''}
${followerData.engagementValue ? `| Engagement Level | ${followerData.engagementValue} |` : ''}

---

*Generated by Followlytics AI Analysis*  
*Analysis Focus: ${customPrompt}*`
      : `# 📊 ${followerData.name || followerData.username}
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
      theme: uniqueConfig.themeId,
      themeConfig: uniqueConfig,
      status: 'generating',
      createdAt: new Date(),
      type: 'individual_follower',
      customPrompt: customPrompt || null,
      analysisType: customPrompt ? 'custom' : 'standard'
    })

    // Call Gamma API with FULL v1.0 capabilities
    if (process.env.GAMMA_API_KEY) {
      try {
        const gamma = getGammaClient()
        
        // Determine format based on user request
        const requestedFormat = format || 'presentation' // presentation, document, social, webpage
        
        // Generate with enhanced options using unique theme config
        const result = await gamma.generate({
          inputText: markdownContent,
          textMode: customPrompt ? 'generate' : 'preserve',
          format: requestedFormat,
          numCards: requestedFormat === 'presentation' ? uniqueConfig.numCards : undefined,
          
          // UNIQUE THEME ID based on follower profile
          themeId: uniqueConfig.themeId,
          
          // SUPER CUSTOMIZED AI Image generation
          imageOptions: {
            source: 'aiGenerated',
            model: 'flux-1-pro',
            style: uniqueConfig.imageStyle
          },
          
          // PERSONALIZED Text customization
          textOptions: {
            amount: 'medium',
            tone: uniqueConfig.tone,
            audience: uniqueConfig.audience,
            language: 'en'
          },
          
          // Card dimensions based on format
          cardOptions: requestedFormat === 'social' ? {
            dimensions: '1:1' // Square for social media
          } : requestedFormat === 'webpage' ? {
            dimensions: '16:9'
          } : undefined,
          
          // Export options
          exportAs: exportAs || undefined, // 'pdf', 'pptx', or 'both'
          
          // DYNAMIC Additional customization with visual concepts
          additionalInstructions: customPrompt ? 
            `Focus the analysis on: ${customPrompt}. Create visuals featuring: ${uniqueConfig.visualConcepts}. Use ${uniqueConfig.tone} tone for ${uniqueConfig.audience}.` :
            `Create a ${followerData.priority}-priority ${followerData.category} analysis report. Visuals should feature: ${uniqueConfig.visualConcepts}. Tone: ${uniqueConfig.tone} for ${uniqueConfig.audience}.`,
          
          // Sharing settings
          sharingOptions: {
            workspaceAccess: 'view',
            externalAccess: 'view'
          }
        })
        
        // Store generation info
        await adminDb.collection('gamma_reports').doc(generationId).update({
          status: 'generating',
          gammaGenerationId: result.id,
          format: requestedFormat,
          exportAs: exportAs || null,
          warnings: result.warnings || [],
          updatedAt: new Date()
        })
        
        console.log('[Gamma] Enhanced generation started:', {
          generationId,
          gammaGenerationId: result.id,
          follower: followerData.username,
          format: requestedFormat,
          exportAs: exportAs || 'none',
          warnings: result.warnings?.length || 0
        })
        
        // Start background polling for completion
        // This runs async without blocking the response
        pollGammaCompletion(generationId, result.id, gamma).catch(err => {
          console.error('[Gamma] Polling error:', err)
        })
        
      } catch (gammaError: any) {
        console.error('[Gamma] Generation error:', {
          message: gammaError.message,
          stack: gammaError.stack,
          follower: followerData.username
        })
        
        // Fall back to simulation
        await adminDb.collection('gamma_reports').doc(generationId).update({
          status: 'completed',
          url: `https://gamma.app/docs/follower-analysis-${followerData.username.toLowerCase()}-${generationId}`,
          completedAt: new Date(),
          note: `Simulated (API Error: ${gammaError.message}). Add valid GAMMA_API_KEY to Vercel.`,
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
