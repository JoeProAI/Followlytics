import { NextRequest, NextResponse } from 'next/server'
import { activeScanJobs } from '@/lib/scan-jobs'
import { Daytona } from '@daytonaio/sdk'

// OAuth-authenticated browser scraping using Daytona sandboxes
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { username, estimated_followers, priority = 'normal', user_id } = body

    if (!username) {
      return NextResponse.json({ 
        error: 'Username is required' 
      }, { status: 400 })
    }

    // Check for required credentials
    const daytonaApiKey = process.env.DAYTONA_API_KEY
    const daytonaApiUrl = process.env.DAYTONA_API_URL || 'https://app.daytona.io/api'
    const twitterAccessToken = process.env.TWITTER_ACCESS_TOKEN
    const twitterAccessTokenSecret = process.env.TWITTER_ACCESS_TOKEN_SECRET
    
    console.log('Environment check:', {
      hasDaytonaKey: !!daytonaApiKey,
      hasTwitterToken: !!twitterAccessToken,
      hasTwitterSecret: !!twitterAccessTokenSecret
    })
    
    if (!daytonaApiKey || !twitterAccessToken || !twitterAccessTokenSecret) {
      return NextResponse.json({ 
        error: 'Required credentials not configured',
        missing: {
          daytona_key: !daytonaApiKey,
          twitter_token: !twitterAccessToken,
          twitter_secret: !twitterAccessTokenSecret
        }
      }, { status: 503 })
    }

    console.log(`🚀 Starting OAuth-authenticated browser scraping for @${username}`)
    
    // Initialize Daytona client
    const daytona = new Daytona({
      apiKey: daytonaApiKey,
      apiUrl: daytonaApiUrl
    })

    // Generate unique job ID
    const jobId = `oauth_scrape_${Date.now()}_${username}`
    
    // Estimate cost and time based on follower count
    const estimatedCount = estimated_followers || 1000
    let costEstimate, timeEstimate
    
    if (estimatedCount <= 1000) {
      costEstimate = '$0.50'
      timeEstimate = '2-3 minutes'
    } else if (estimatedCount <= 10000) {
      costEstimate = '$2.00'
      timeEstimate = '5-8 minutes'
    } else {
      costEstimate = '$5.00'
      timeEstimate = '10-15 minutes'
    }

    // Initialize job tracking
    activeScanJobs.set(jobId, {
      id: jobId,
      username,
      status: 'initializing',
      phase: 'creating_sandbox',
      progress: 0,
      estimated_followers: estimatedCount,
      extracted_followers: 0,
      cost_estimate: costEstimate,
      time_estimate: timeEstimate,
      started_at: new Date().toISOString(),
      sandbox_id: null,
      error: null
    })

    // Start background extraction
    extractFollowersInBackground(daytona, jobId, username, estimatedCount, {
      accessToken: twitterAccessToken,
      accessTokenSecret: twitterAccessTokenSecret
    })

    return NextResponse.json({
      success: true,
      job_id: jobId,
      status: 'started',
      message: `OAuth-authenticated follower extraction started for @${username}`,
      estimated_cost: costEstimate,
      estimated_time: timeEstimate,
      check_status_url: `/api/scan/daytona?job_id=${jobId}`
    })

  } catch (error) {
    console.error('Daytona scan error:', error)
    return NextResponse.json({
      error: 'Failed to start follower extraction',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// Background extraction function
async function extractFollowersInBackground(
  daytona: Daytona, 
  jobId: string, 
  username: string, 
  estimatedCount: number,
  oauthCredentials: { accessToken: string, accessTokenSecret: string }
) {
  try {
    const job = activeScanJobs.get(jobId)
    if (!job) return

    // Step 1: Create sandbox
    console.log(`📦 Creating Daytona sandbox for ${jobId}`)
    job.phase = 'creating_sandbox'
    job.progress = 10
    activeScanJobs.set(jobId, job)

    const sandbox = await daytona.sandbox.create({
      name: `twitter-oauth-scraper-${Date.now()}`,
      image: 'ubuntu:22.04'
    })

    job.sandbox_id = sandbox.id
    console.log(`✅ Sandbox created: ${sandbox.id}`)

    // Step 2: Install dependencies
    job.phase = 'installing_dependencies'
    job.progress = 20
    activeScanJobs.set(jobId, job)

    await daytona.sandbox.execute(sandbox.id, {
      command: 'apt-get update && apt-get install -y python3 python3-pip nodejs npm curl wget'
    })

    await daytona.sandbox.execute(sandbox.id, {
      command: 'pip3 install playwright beautifulsoup4 requests asyncio aiohttp'
    })

    // Step 3: Install Playwright browser
    job.phase = 'installing_browser'
    job.progress = 30
    activeScanJobs.set(jobId, job)

    await daytona.sandbox.execute(sandbox.id, {
      command: 'playwright install chromium'
    })

    // Step 4: Create OAuth scraping script
    job.phase = 'preparing_scraper'
    job.progress = 40
    activeScanJobs.set(jobId, job)

    const oauthScrapingScript = createOAuthScrapingScript(username, estimatedCount, oauthCredentials)
    
    await daytona.sandbox.execute(sandbox.id, {
      command: `cat > /tmp/oauth_follower_scraper.py << 'EOF'
${oauthScrapingScript}
EOF`
    })

    // Step 5: Execute scraping
    job.phase = 'extracting_followers'
    job.progress = 50
    activeScanJobs.set(jobId, job)

    console.log(`🔍 Starting OAuth follower extraction for @${username}`)
    
    const result = await daytona.sandbox.execute(sandbox.id, {
      command: 'cd /tmp && python3 oauth_follower_scraper.py 2>&1'
    })

    // Step 6: Process results
    job.phase = 'processing_results'
    job.progress = 90
    activeScanJobs.set(jobId, job)

    if (result.stdout) {
      console.log('Scraping output:', result.stdout)
      
      // Try to extract JSON results
      const jsonMatch = result.stdout.match(/\{[\s\S]*"followers"[\s\S]*\}/g)
      if (jsonMatch) {
        try {
          const extractedData = JSON.parse(jsonMatch[jsonMatch.length - 1])
          
          job.status = 'completed'
          job.phase = 'completed'
          job.progress = 100
          job.extracted_followers = extractedData.followers?.length || 0
          job.results = extractedData
          job.completed_at = new Date().toISOString()
          
          console.log(`✅ OAuth extraction completed: ${job.extracted_followers} followers`)
        } catch (parseError) {
          console.error('Failed to parse results:', parseError)
          job.status = 'failed'
          job.error = 'Failed to parse extraction results'
        }
      } else {
        job.status = 'failed'
        job.error = 'No valid results found in scraping output'
      }
    } else {
      job.status = 'failed'
      job.error = 'No output from scraping script'
    }

    activeScanJobs.set(jobId, job)

    // Cleanup sandbox after delay
    setTimeout(async () => {
      try {
        await daytona.sandbox.delete(sandbox.id)
        console.log(`🧹 Cleaned up sandbox: ${sandbox.id}`)
      } catch (cleanupError) {
        console.error('Sandbox cleanup error:', cleanupError)
      }
    }, 300000) // 5 minutes

  } catch (error) {
    console.error(`💥 Background extraction failed for ${jobId}:`, error)
    const job = activeScanJobs.get(jobId)
    if (job) {
      job.status = 'failed'
      job.error = error instanceof Error ? error.message : 'Unknown extraction error'
      activeScanJobs.set(jobId, job)
    }
  }
}

// Create OAuth-authenticated scraping script
function createOAuthScrapingScript(
  username: string, 
  estimatedCount: number,
  oauthCredentials: { accessToken: string, accessTokenSecret: string }
): string {
  return `#!/usr/bin/env python3
"""
OAuth-Authenticated Twitter Follower Scraper
Uses app's OAuth tokens to authenticate browser session
"""

import asyncio
import json
import time
import os
from playwright.async_api import async_playwright
import requests
import hashlib
import hmac
import base64
from urllib.parse import quote, urlencode

class OAuthTwitterScraper:
    def __init__(self, target_username, max_followers=10000):
        self.target_username = target_username
        self.max_followers = max_followers
        self.followers = []
        
        # OAuth credentials from environment
        self.access_token = "${oauthCredentials.accessToken}"
        self.access_token_secret = "${oauthCredentials.accessTokenSecret}"
        
        print(f"🚀 OAuth Twitter Scraper initialized for @{target_username}")
        print(f"📊 Max followers to extract: {max_followers}")
        print(f"🔑 Using app OAuth credentials for authentication")

    async def authenticate_browser_session(self, page):
        """Inject OAuth authentication into browser session"""
        print("🔐 Authenticating browser session with OAuth tokens...")
        
        try:
            # Navigate to Twitter
            await page.goto('https://x.com/login', wait_until='networkidle')
            
            # Inject authentication tokens via localStorage and cookies
            await page.evaluate(f'''
                // Set OAuth tokens in localStorage
                localStorage.setItem('access_token', '{self.access_token}');
                localStorage.setItem('access_token_secret', '{self.access_token_secret}');
                
                // Set authentication cookies
                document.cookie = 'auth_token={self.access_token}; domain=.x.com; path=/';
                document.cookie = 'ct0=oauth_authenticated; domain=.x.com; path=/';
            ''')
            
            # Wait and check if authentication worked
            await page.wait_for_timeout(3000)
            
            # Try to navigate to home to verify auth
            await page.goto('https://x.com/home', wait_until='networkidle')
            
            # Check if we're logged in (look for compose tweet button or similar)
            is_authenticated = await page.locator('[data-testid="SideNav_NewTweet_Button"]').count() > 0
            
            if is_authenticated:
                print("✅ Browser session authenticated successfully")
                return True
            else:
                print("⚠️ Authentication may not have worked, proceeding anyway")
                return False
                
        except Exception as e:
            print(f"❌ Authentication error: {e}")
            return False

    async def extract_followers_from_page(self, page):
        """Extract followers from the current page"""
        followers_found = []
        
        try:
            # Wait for follower elements to load
            await page.wait_for_selector('[data-testid="UserCell"]', timeout=10000)
            
            # Extract follower information
            follower_elements = await page.locator('[data-testid="UserCell"]').all()
            
            for element in follower_elements:
                try:
                    # Extract username
                    username_elem = await element.locator('[data-testid="User-Name"] a').first
                    username_href = await username_elem.get_attribute('href')
                    
                    if username_href:
                        username = username_href.split('/')[-1]
                        
                        # Extract display name
                        display_name_elem = await element.locator('[data-testid="User-Name"] span').first
                        display_name = await display_name_elem.text_content() if display_name_elem else username
                        
                        followers_found.append({
                            'username': username,
                            'display_name': display_name.strip(),
                            'extracted_at': time.strftime("%Y-%m-%d %H:%M:%S"),
                            'method': 'oauth_browser_scraping'
                        })
                        
                except Exception as e:
                    print(f"Error extracting follower: {e}")
                    continue
            
            print(f"📊 Extracted {len(followers_found)} followers from current page")
            return followers_found
            
        except Exception as e:
            print(f"❌ Error extracting followers: {e}")
            return []

    async def scroll_and_load_more(self, page, max_scrolls=50):
        """Scroll to load more followers with pagination"""
        print("📜 Scrolling to load more followers...")
        
        for scroll in range(max_scrolls):
            if len(self.followers) >= self.max_followers:
                print(f"✅ Reached target of {self.max_followers} followers")
                break
                
            # Scroll to bottom
            await page.evaluate('window.scrollTo(0, document.body.scrollHeight)')
            
            # Wait for new content to load
            await page.wait_for_timeout(2000)
            
            # Extract new followers
            new_followers = await self.extract_followers_from_page(page)
            
            # Add unique followers
            existing_usernames = {f['username'] for f in self.followers}
            unique_new = [f for f in new_followers if f['username'] not in existing_usernames]
            
            self.followers.extend(unique_new)
            
            print(f"📈 Scroll {scroll + 1}: {len(unique_new)} new, {len(self.followers)} total")
            
            # Break if no new followers found
            if not unique_new:
                print("⏹️ No new followers found, stopping")
                break
                
        return len(self.followers)

    async def run_extraction(self):
        """Main extraction process"""
        print(f"🎯 Starting OAuth follower extraction for @{self.target_username}")
        
        async with async_playwright() as p:
            # Launch browser
            browser = await p.chromium.launch(
                headless=True,
                args=['--no-sandbox', '--disable-dev-shm-usage']
            )
            
            context = await browser.new_context(
                user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            )
            
            page = await context.new_page()
            
            try:
                # Step 1: Authenticate browser session
                auth_success = await self.authenticate_browser_session(page)
                
                # Step 2: Navigate to target user's followers page
                followers_url = f'https://x.com/{self.target_username}/followers'
                print(f"🌐 Navigating to: {followers_url}")
                
                await page.goto(followers_url, wait_until='networkidle')
                await page.wait_for_timeout(3000)
                
                # Step 3: Check if page loaded correctly
                page_title = await page.title()
                print(f"📄 Page title: {page_title}")
                
                # Step 4: Extract initial followers
                initial_followers = await self.extract_followers_from_page(page)
                self.followers.extend(initial_followers)
                
                # Step 5: Scroll and load more
                if len(self.followers) < self.max_followers:
                    await self.scroll_and_load_more(page)
                
                # Step 6: Generate results
                results = {
                    "target_username": self.target_username,
                    "followers_found": len(self.followers),
                    "total_extracted": len(self.followers),
                    "followers": self.followers[:self.max_followers],  # Limit to max
                    "scan_completed_at": time.strftime("%Y-%m-%d %H:%M:%S"),
                    "status": "completed" if self.followers else "failed",
                    "method": "oauth_authenticated_browser_scraping",
                    "authentication": "app_oauth_tokens"
                }
                
                print(f"\\n🎉 EXTRACTION COMPLETED!")
                print(f"📊 Total followers extracted: {len(self.followers)}")
                print(f"🔑 Authentication method: OAuth app tokens")
                print(f"✅ Status: {'Success' if self.followers else 'Failed'}")
                
                # Save results
                with open('/tmp/oauth_scan_results.json', 'w') as f:
                    json.dump(results, f, indent=2)
                
                # Output results for parsing
                print("\\n" + "="*50)
                print(json.dumps(results, indent=2))
                print("="*50)
                
                return results
                
            except Exception as e:
                print(f"💥 Extraction failed: {e}")
                return {
                    "target_username": self.target_username,
                    "status": "failed",
                    "error": str(e),
                    "method": "oauth_authenticated_browser_scraping"
                }
                
            finally:
                await browser.close()

# Main execution
async def main():
    scraper = OAuthTwitterScraper("${username}", ${estimatedCount})
    results = await scraper.run_extraction()
    return results

if __name__ == "__main__":
    asyncio.run(main())
`
}

// GET endpoint for checking job status
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const jobId = searchParams.get('job_id')

  if (!jobId) {
    return NextResponse.json({ error: 'job_id parameter required' }, { status: 400 })
  }

  const job = activeScanJobs.get(jobId)
  
  if (!job) {
    return NextResponse.json({ error: 'Job not found' }, { status: 404 })
  }

  return NextResponse.json({
    job_id: jobId,
    status: job.status,
    phase: job.phase,
    progress: job.progress,
    username: job.username,
    estimated_followers: job.estimated_followers,
    extracted_followers: job.extracted_followers,
    cost_estimate: job.cost_estimate,
    time_estimate: job.time_estimate,
    started_at: job.started_at,
    completed_at: job.completed_at,
    error: job.error,
    results: job.results
  })
}
