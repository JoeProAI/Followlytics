import { NextRequest, NextResponse } from 'next/server'
import { adminAuth } from '@/lib/firebase-admin'

const APOLLO_API_KEY = process.env.APOLLO_API_KEY
const APOLLO_BASE_URL = 'https://api.apollo.io/v1'

interface AudienceInsights {
  totalFollowers: number
  analyzed: number
  sampleSize: number
  companySizes: {
    small: number      // <50 employees
    medium: number     // 50-200 employees
    large: number      // 200-1000 employees
    enterprise: number // 1000+ employees
    unknown: number
  }
  seniority: {
    executive: number  // C-level, VP
    senior: number     // Director, Senior
    midLevel: number   // Manager, Lead
    entry: number      // Individual contributor
    unknown: number
  }
  topIndustries: Array<{ industry: string; count: number; percentage: number }>
  topLocations: Array<{ location: string; count: number; percentage: number }>
  topCompanies: Array<{ company: string; count: number; size: number }>
  topJobTitles: Array<{ title: string; count: number }>
  creditsUsed: number
}

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.split('Bearer ')[1]
    const decodedToken = await adminAuth.verifyIdToken(token)

    // Get request data
    const { followers, sampleSize = 100 } = await request.json()

    if (!followers || !Array.isArray(followers)) {
      return NextResponse.json({ 
        error: 'followers array is required' 
      }, { status: 400 })
    }

    if (!APOLLO_API_KEY) {
      return NextResponse.json({ 
        error: 'Apollo API not configured' 
      }, { status: 500 })
    }

    // Initialize insights object
    const insights: AudienceInsights = {
      totalFollowers: followers.length,
      analyzed: 0,
      sampleSize: Math.min(sampleSize, followers.length),
      companySizes: {
        small: 0,
        medium: 0,
        large: 0,
        enterprise: 0,
        unknown: 0
      },
      seniority: {
        executive: 0,
        senior: 0,
        midLevel: 0,
        entry: 0,
        unknown: 0
      },
      topIndustries: [],
      topLocations: [],
      topCompanies: [],
      topJobTitles: [],
      creditsUsed: 0
    }

    const industries: Record<string, number> = {}
    const locations: Record<string, number> = {}
    const companies: Record<string, { count: number; size: number }> = {}
    const jobTitles: Record<string, number> = {}

    // Sample followers (to save API calls)
    const sample = followers.slice(0, Math.min(sampleSize, 100))
    
    console.log(`[Apollo] Analyzing ${sample.length} followers out of ${followers.length} total`)

    // Analyze each follower
    for (const username of sample) {
      try {
        // Search by Twitter handle - NO CREDITS USED for basic data
        const response = await fetch(`${APOLLO_BASE_URL}/people/search`, {
          method: 'POST',
          headers: {
            'X-Api-Key': APOLLO_API_KEY,
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache'
          },
          body: JSON.stringify({
            q_twitter_handle: username.replace('@', ''),
            page: 1,
            per_page: 1
          })
        })

        if (!response.ok) {
          console.error(`[Apollo] API error for ${username}:`, response.status)
          continue
        }

        const data = await response.json()
        
        if (data.people && data.people.length > 0) {
          const person = data.people[0]
          insights.analyzed++

          // Company size analysis
          const empCount = person.organization?.estimated_num_employees || 0
          if (empCount === 0) {
            insights.companySizes.unknown++
          } else if (empCount < 50) {
            insights.companySizes.small++
          } else if (empCount < 200) {
            insights.companySizes.medium++
          } else if (empCount < 1000) {
            insights.companySizes.large++
          } else {
            insights.companySizes.enterprise++
          }

          // Seniority analysis
          const seniority = person.seniority?.toLowerCase() || 'unknown'
          if (seniority.includes('c_suite') || seniority.includes('vp') || seniority.includes('owner')) {
            insights.seniority.executive++
          } else if (seniority.includes('director') || seniority.includes('senior')) {
            insights.seniority.senior++
          } else if (seniority.includes('manager') || seniority.includes('lead')) {
            insights.seniority.midLevel++
          } else if (seniority.includes('entry') || seniority.includes('individual')) {
            insights.seniority.entry++
          } else {
            insights.seniority.unknown++
          }

          // Industry tracking
          const industry = person.organization?.industry || 'Unknown'
          industries[industry] = (industries[industry] || 0) + 1

          // Location tracking
          const location = person.country || person.state || person.city || 'Unknown'
          locations[location] = (locations[location] || 0) + 1

          // Company tracking
          const companyName = person.organization?.name || 'Unknown'
          if (!companies[companyName]) {
            companies[companyName] = { count: 0, size: empCount }
          }
          companies[companyName].count++

          // Job title tracking
          const title = person.title || 'Unknown'
          jobTitles[title] = (jobTitles[title] || 0) + 1
        }

        // Rate limiting: 1 request per second to be safe
        await new Promise(resolve => setTimeout(resolve, 1000))

      } catch (error) {
        console.error(`[Apollo] Error analyzing ${username}:`, error)
      }
    }

    // Process top lists
    insights.topIndustries = Object.entries(industries)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([industry, count]) => ({
        industry,
        count,
        percentage: Math.round((count / insights.analyzed) * 100)
      }))

    insights.topLocations = Object.entries(locations)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([location, count]) => ({
        location,
        count,
        percentage: Math.round((count / insights.analyzed) * 100)
      }))

    insights.topCompanies = Object.entries(companies)
      .sort(([, a], [, b]) => b.count - a.count)
      .slice(0, 10)
      .map(([company, data]) => ({
        company,
        count: data.count,
        size: data.size
      }))

    insights.topJobTitles = Object.entries(jobTitles)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([title, count]) => ({
        title,
        count
      }))

    // Credits used: 0 for basic search (only email unlock costs credits)
    insights.creditsUsed = 0

    console.log(`[Apollo] Analysis complete: ${insights.analyzed}/${sample.length} followers analyzed`)

    return NextResponse.json({
      success: true,
      insights,
      message: `Analyzed ${insights.analyzed} out of ${sample.length} followers`
    })

  } catch (error: any) {
    console.error('[Apollo] Analysis error:', error)
    return NextResponse.json({
      error: 'Failed to analyze audience',
      details: error.message
    }, { status: 500 })
  }
}
