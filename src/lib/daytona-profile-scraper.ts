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

      // Write script to sandbox using echo (Daytona SDK doesn't have files.write)
      const scriptBase64 = Buffer.from(pythonScript).toString('base64')
      await sandbox.process.executeCommand(`echo "${scriptBase64}" | base64 -d > scrape_profile.py`)

      console.log(`[Daytona] Running profile scraper...`)
      
      // No dependencies needed - using built-in urllib!

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
import json
import re
import urllib.request
import urllib.error

def scrape_profile():
    try:
        # Use mobile X URL for cleaner HTML
        url = f"https://mobile.x.com/{username}"
        print(f"Fetching profile: {url}")
        
        # Set user agent to look like a browser
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
        
        # Make HTTP request
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req, timeout=15) as response:
            html = response.read().decode('utf-8')
        
        print(f"Fetched {len(html)} bytes of HTML")
        
        # Extract follower count from HTML
        # Look for patterns like "1,234 Followers" or "1.2M Followers"
        patterns = [
            r'"followers_count":([0-9]+)',  # JSON data
            r'([0-9,.]+[KMB]?)\\s+Followers',  # "1.2M Followers"
            r'([0-9,]+)\\s+Followers',  # "1,234 Followers"
        ]
        
        follower_count = 0
        for pattern in patterns:
            match = re.search(pattern, html)
            if match:
                count_text = match.group(1)
                follower_count = parse_count(count_text)
                print(f"Found follower count: {follower_count} (pattern: {pattern})")
                break
        
        # Get name from title tag
        name_match = re.search(r'<title>([^(]+?)\\s*\\(', html)
        name = name_match.group(1).strip() if name_match else username
        
        # Check verification
        verified = 'verified' in html.lower() or '"verified":true' in html
        
        # Get bio
        bio_match = re.search(r'"description":"([^"]+)"', html)
        bio = bio_match.group(1) if bio_match else ''
        
        result = {
            "success": True,
            "followerCount": follower_count,
            "name": name,
            "verified": verified,
            "bio": bio
        }
        
        print("PROFILE_RESULT:", json.dumps(result))
        
    except urllib.error.HTTPError as e:
        if e.code == 404:
            error_msg = "Account not found"
        elif e.code == 403:
            error_msg = "Account is private or suspended"
        else:
            error_msg = f"HTTP error {e.code}"
        
        result = {
            "success": False,
            "error": error_msg
        }
        print("PROFILE_RESULT:", json.dumps(result))
        
    except Exception as e:
        result = {
            "success": False,
            "error": str(e)
        }
        print("PROFILE_RESULT:", json.dumps(result))

def parse_count(text):
    """Convert '1.2M' or '123.4K' or '1,234' to actual number"""
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
    
    try:
        return int(float(text) * multiplier)
    except:
        return 0

scrape_profile()
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
