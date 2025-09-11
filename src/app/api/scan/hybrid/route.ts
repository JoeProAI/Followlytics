import { NextRequest, NextResponse } from 'next/server'

// Hybrid follower extraction: Browser automation for small accounts, Twitter API for large accounts
export async function POST(request: NextRequest) {
  try {
    const { username, estimated_followers } = await request.json()
    
    // Account size thresholds
    const BROWSER_LIMIT = 50000  // Use browser automation up to 50K followers
    const API_REQUIRED = 50000   // Use Twitter API for 50K+ followers
    
    console.log(`📊 Account: @${username} with ~${estimated_followers} followers`)
    
    // Determine extraction method
    let extractionMethod: string
    let estimatedTime: string
    let estimatedCost: string
    
    // Twitter API followers endpoint requires Enterprise ($42k/month)
    // Use browser automation for all account sizes
    extractionMethod = 'browser_automation'
    
    if (estimated_followers < 10000) {
      estimatedTime = '2-5 minutes'
      estimatedCost = '$0.50-$2.00'
    } else if (estimated_followers < 100000) {
      estimatedTime = '15-45 minutes'
      estimatedCost = '$2.00-$10.00'
    } else if (estimated_followers < 1000000) {
      estimatedTime = '1-4 hours'
      estimatedCost = '$10.00-$50.00'
    } else {
      estimatedTime = '4-12 hours'
      estimatedCost = '$50.00-$200.00'
    }
    
    console.log(`🔧 Selected method: ${extractionMethod}`)
    console.log(`⏱️ Estimated time: ${estimatedTime}`)
    console.log(`💰 Estimated cost: ${estimatedCost}`)
    
    // Route to appropriate extraction method
    if (extractionMethod === 'browser_automation') {
      return await browserExtraction(username, estimated_followers)
    } else {
      return await twitterApiExtraction(username, estimated_followers)
    }
    
  } catch (error) {
    console.error('Hybrid extraction error:', error)
    return NextResponse.json(
      { error: 'Failed to initiate follower extraction' },
      { status: 500 }
    )
  }
}

async function browserExtraction(username: string, followers: number) {
  // Use existing Daytona browser automation for small accounts
  const response = await fetch('/api/scan/daytona', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username,
      estimated_followers: followers,
      method: 'browser_automation'
    })
  })
  
  return response
}

async function twitterApiExtraction(username: string, followers: number) {
  // Twitter API followers endpoint requires Enterprise ($42k/month)
  // Fall back to optimized browser automation for large accounts
  console.log(`⚠️ Twitter API followers requires Enterprise access - using optimized browser automation`)
  
  return await optimizedBrowserExtraction(username, followers)
}

async function optimizedBrowserExtraction(username: string, followers: number) {
  // Use chunked browser automation for large accounts
  console.log(`🚀 Starting optimized browser extraction for ${followers} followers`)
  
  const chunkSize = 50000 // Process 50K followers per chunk
  const chunks = Math.ceil(followers / chunkSize)
  
  if (chunks > 1) {
    console.log(`📊 Large account detected: splitting into ${chunks} chunks of ${chunkSize} followers each`)
  }
  
  // For now, route to existing Daytona browser automation
  // TODO: Implement parallel chunk processing
  const response = await fetch('/api/scan/daytona', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username,
      estimated_followers: followers,
      method: 'optimized_browser_automation',
      chunks: chunks
    })
  })
  
  return response
}

async function extractFollowersWithPagination(userId: string, totalFollowers: number) {
  const followers = []
  let nextToken = null
  let requestCount = 0
  const maxRequests = Math.ceil(totalFollowers / 1000) // 1000 followers per request
  
  console.log(`📡 Starting pagination extraction for ${totalFollowers} followers (${maxRequests} requests)`)
  
  do {
    try {
      let url = `https://api.twitter.com/2/users/${userId}/followers?max_results=1000&user.fields=username,name,public_metrics`
      if (nextToken) {
        url += `&pagination_token=${nextToken}`
      }
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${process.env.TWITTER_BEARER_TOKEN}`,
          'Content-Type': 'application/json'
        }
      })
      
      if (!response.ok) {
        if (response.status === 429) {
          // Rate limited - wait 15 minutes
          console.log('⏳ Rate limited, waiting 15 minutes...')
          await new Promise(resolve => setTimeout(resolve, 15 * 60 * 1000))
          continue
        }
        throw new Error(`API request failed: ${response.status}`)
      }
      
      const data = await response.json()
      
      if (data.data) {
        followers.push(...data.data.map(user => ({
          username: user.username,
          name: user.name,
          followers_count: user.public_metrics?.followers_count || 0
        })))
        
        console.log(`📊 Extracted ${followers.length}/${totalFollowers} followers`)
      }
      
      nextToken = data.meta?.next_token
      requestCount++
      
      // Rate limiting: 15 requests per 15 minutes
      if (requestCount % 15 === 0 && nextToken) {
        console.log('⏳ Rate limit pause (15 requests completed)')
        await new Promise(resolve => setTimeout(resolve, 15 * 60 * 1000))
      }
      
    } catch (error) {
      console.error('Pagination request failed:', error)
      break
    }
    
  } while (nextToken && followers.length < totalFollowers)
  
  console.log(`✅ Extraction complete: ${followers.length} followers`)
  
  return {
    followers,
    total_followers: followers.length,
    method: 'twitter_api_v2',
    extraction_time: new Date().toISOString()
  }
}
