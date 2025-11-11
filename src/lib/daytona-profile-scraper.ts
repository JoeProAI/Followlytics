// Daytona Profile Scraper - Get EXACT follower count from X profile page
// Fast, reliable, no rate limits

import { Daytona } from '@daytonaio/sdk'

interface ProfileResult {
  success: boolean
  followerCount?: number
  verified?: boolean
  name?: string
  bio?: string
  error?: string
}

export class DaytonaClient {
  private daytona: Daytona

  constructor() {
    this.daytona = new Daytona({
      apiKey: process.env.DAYTONA_API_KEY || ''
    })
  }

  async getFollowerCount(username: string): Promise<ProfileResult> {
    let sandbox: any

    try {
      console.log(`[Daytona] Creating sandbox for profile scrape...`)

      // Create sandbox
      sandbox = await this.daytona.create({
        language: 'python' as const
      })

      console.log(`[Daytona] Sandbox created: ${sandbox.id}`)

      // Python script to scrape profile and get exact follower count
      const pythonScript = this.getProfileScraperScript(username)

      // Write script to sandbox
      await sandbox.files.write('scrape_profile.py', pythonScript)

      console.log(`[Daytona] Installing dependencies...`)

      // Install dependencies
      await sandbox.process.executeCommand('pip install playwright beautifulsoup4')

      await sandbox.process.executeCommand('playwright install chromium')

      console.log(`[Daytona] Running profile scraper...`)

      // Run scraper
      const result = await sandbox.process.executeCommand('python scrape_profile.py')

      console.log(`[Daytona] Script output:`, result.result)

      // Parse output
      const profileData = this.parseScriptOutput(result.result || '')

      // Cleanup
      if (sandbox) {
        await sandbox.stop().catch((err: any) => 
          console.error('[Daytona] Cleanup failed:', err)
        )
      }

      return profileData

    } catch (error: any) {
      console.error('[Daytona] Profile scrape failed:', error)

      // Cleanup on error
      if (sandbox) {
        await sandbox.stop().catch((err: any) => 
          console.error('[Daytona] Cleanup failed:', err)
        )
      }

      return {
        success: false,
        error: error.message
      }
    }
  }

  private getProfileScraperScript(username: string): string {
    return `#!/usr/bin/env python3
import asyncio
import json
import re
from playwright.async_api import async_playwright

async def scrape_profile():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()
        
        try:
            # Go to profile page
            url = f"https://x.com/{username}"
            print(f"Navigating to {url}...")
            await page.goto(url, wait_until='networkidle', timeout=30000)
            
            # Wait for profile to load
            await page.wait_for_timeout(3000)
            
            # Get page content
            content = await page.content()
            
            # Extract follower count from page
            # X shows follower count in format: "123.4K Followers" or "1.2M Followers"
            follower_match = re.search(r'([0-9,.]+[KMB]?)\\s+Followers?', content)
            
            if not follower_match:
                # Try alternative pattern in data attributes
                follower_match = re.search(r'data-testid="[^"]*"[^>]*>([0-9,.]+[KMB]?)\\s+<[^>]*Followers', content)
            
            if follower_match:
                follower_text = follower_match.group(1)
                follower_count = parse_count(follower_text)
            else:
                # Last resort: try to find any number followed by "Followers"
                follower_match = re.search(r'([0-9,]+)\\s+Followers?', content)
                follower_count = int(follower_match.group(1).replace(',', '')) if follower_match else 0
            
            # Get profile name
            name_match = re.search(r'<title>([^(]+)\\s*\\(', content)
            name = name_match.group(1).strip() if name_match else username
            
            # Check if verified
            verified = 'verified' in content.lower() or 'blue-verified' in content.lower()
            
            # Get bio
            bio_match = re.search(r'<div[^>]*data-testid="UserDescription"[^>]*>([^<]+)', content)
            bio = bio_match.group(1).strip() if bio_match else ''
            
            result = {
                "success": True,
                "followerCount": follower_count,
                "name": name,
                "verified": verified,
                "bio": bio
            }
            
            print("PROFILE_RESULT:", json.dumps(result))
            
        except Exception as e:
            print("ERROR:", str(e))
            result = {
                "success": False,
                "error": str(e)
            }
            print("PROFILE_RESULT:", json.dumps(result))
        
        finally:
            await browser.close()

def parse_count(text):
    """Convert '1.2M' or '123.4K' to actual number"""
    text = text.replace(',', '')
    multiplier = 1
    
    if 'K' in text:
        multiplier = 1000
        text = text.replace('K', '')
    elif 'M' in text:
        multiplier = 1000000
        text = text.replace('M', '')
    elif 'B' in text:
        multiplier = 1000000000
        text = text.replace('B', '')
    
    return int(float(text) * multiplier)

asyncio.run(scrape_profile())
`
  }

  private parseScriptOutput(output: string): ProfileResult {
    try {
      // Look for PROFILE_RESULT: in output
      const match = output.match(/PROFILE_RESULT:\s*({[\s\S]*})/)
      
      if (!match) {
        return {
          success: false,
          error: 'Failed to parse profile data'
        }
      }

      const data = JSON.parse(match[1])
      return data

    } catch (error: any) {
      return {
        success: false,
        error: `Parse error: ${error.message}`
      }
    }
  }
}
