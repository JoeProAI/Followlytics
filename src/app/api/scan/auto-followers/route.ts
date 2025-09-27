import { NextRequest, NextResponse } from 'next/server'
import { adminAuth as auth, adminDb as db } from '@/lib/firebase-admin'
import { Daytona } from '@daytonaio/sdk'

interface AutoScanRequest {
  username: string
  scanType: 'complete' | 'sample'
  useBackground: boolean
  useSandbox: boolean
}

interface ScanProgress {
  scanId: string
  phase: 'initializing' | 'getting_user_info' | 'creating_sandbox' | 'opening_browser' | 'navigating' | 'scrolling' | 'extracting' | 'processing' | 'completed' | 'failed'
  progress: number
  message: string
  followersFound: number
  estimatedTotal?: number
  error?: string
  startTime: number
  sandboxId?: string
}

const daytona = new Daytona({
  apiKey: process.env.DAYTONA_API_KEY!,
  apiUrl: process.env.DAYTONA_API_URL || "https://app.daytona.io/api"
})

// In-memory progress tracking
const scanProgress = new Map<string, ScanProgress>()

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const decodedToken = await auth.verifyIdToken(token)
    const userId = decodedToken.uid

    // Parse request
    const body: AutoScanRequest = await request.json()
    const { username, scanType, useBackground, useSandbox } = body

    if (!username) {
      return NextResponse.json({ error: 'Username is required' }, { status: 400 })
    }

    console.log(`🤖 Starting automated scan for @${username} (type: ${scanType})`)

    // Generate scan ID
    const scanId = `auto_${userId}_${Date.now()}`

    // Initialize progress tracking
    const initialProgress: ScanProgress = {
      scanId,
      phase: 'initializing',
      progress: 0,
      message: 'Initializing automated follower scan...',
      followersFound: 0,
      startTime: Date.now()
    }

    scanProgress.set(scanId, initialProgress)

    // Start background processing
    processAutoScan(scanId, userId, username, scanType, useSandbox).catch(error => {
      console.error('❌ Auto scan failed:', error)
      updateProgress(scanId, 'failed', 0, `Scan failed: ${error.message}`, undefined, error.message)
    })

    // Get estimated total (this would normally come from Twitter API or previous scans)
    const estimatedTotal = await getEstimatedFollowerCount(username)

    return NextResponse.json({
      success: true,
      scanId,
      message: `Started automated scan for @${username}`,
      estimatedTotal,
      estimatedTime: getEstimatedTime(estimatedTotal)
    })

  } catch (error: any) {
    console.error('❌ Failed to start auto scan:', error)
    return NextResponse.json({ 
      error: 'Failed to start scan',
      details: error.message 
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const scanId = url.searchParams.get('scanId')
    
    if (!scanId) {
      return NextResponse.json({ error: 'Scan ID required' }, { status: 400 })
    }

    // Verify authentication
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const progress = scanProgress.get(scanId)
    if (!progress) {
      return NextResponse.json({ error: 'Scan not found' }, { status: 404 })
    }

    return NextResponse.json(progress)

  } catch (error: any) {
    console.error('❌ Failed to get scan progress:', error)
    return NextResponse.json({ 
      error: 'Failed to get progress',
      details: error.message 
    }, { status: 500 })
  }
}

async function processAutoScan(
  scanId: string,
  userId: string,
  username: string,
  scanType: string,
  useSandbox: boolean
) {
  let sandbox: any = null

  try {
    // Step 1: Get user info
    updateProgress(scanId, 'getting_user_info', 10, `Getting profile info for @${username}...`)
    
    // This would normally call Twitter API to get user info
    // For now, we'll simulate it
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    if (useSandbox) {
      // Step 2: Create sandbox
      updateProgress(scanId, 'creating_sandbox', 20, 'Creating Daytona sandbox for processing...')
      
      sandbox = await daytona.create({
        image: 'node:18-bullseye'
      }, {
        timeout: 60 * 60 * 1000 // 1 hour timeout
      })

      console.log(`✅ Sandbox created: ${sandbox.id}`)
      updateProgress(scanId, 'creating_sandbox', 30, `Sandbox created: ${sandbox.id}`, sandbox.id)

      // Step 3: Setup browser in sandbox
      updateProgress(scanId, 'opening_browser', 40, 'Setting up browser automation...')
      
      await setupBrowserInSandbox(sandbox)
      
      // Step 4: Navigate and extract
      updateProgress(scanId, 'navigating', 50, `Navigating to @${username}/followers...`)
      
      const followers = await extractFollowersInSandbox(sandbox, username, scanId)
      
      // Step 5: Process results
      updateProgress(scanId, 'processing', 90, `Processing ${followers.length} followers...`)
      
      await storeResults(userId, scanId, username, followers)
      
      updateProgress(scanId, 'completed', 100, `Scan completed! Found ${followers.length} followers`, sandbox.id)

    } else {
      // Fallback: simulate extraction without sandbox
      updateProgress(scanId, 'navigating', 50, 'Simulating follower extraction...')
      
      // Simulate progressive extraction
      for (let i = 0; i < 10; i++) {
        await new Promise(resolve => setTimeout(resolve, 1000))
        const progress = 50 + (i * 4)
        const found = i * 10
        updateProgress(scanId, 'extracting', progress, `Extracting followers... found ${found}`, undefined, undefined, found)
      }
      
      updateProgress(scanId, 'completed', 100, 'Simulation completed! Found 100 followers', undefined, undefined, 100)
    }

  } catch (error: any) {
    console.error(`❌ Auto scan failed for ${scanId}:`, error)
    updateProgress(scanId, 'failed', 0, 'Scan failed', undefined, error.message)
  } finally {
    // Cleanup sandbox
    if (sandbox) {
      try {
        setTimeout(async () => {
          await sandbox.destroy()
          console.log(`🧹 Sandbox cleaned up: ${sandbox.id}`)
        }, 5 * 60 * 1000) // Cleanup after 5 minutes
      } catch (cleanupError) {
        console.log('⚠️ Sandbox cleanup error:', cleanupError)
      }
    }
  }
}

async function setupBrowserInSandbox(sandbox: any) {
  // Install dependencies
  await sandbox.process.executeCommand('apt-get update && apt-get install -y wget gnupg')
  
  // Install Chrome
  await sandbox.process.executeCommand(`
    wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - &&
    echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list &&
    apt-get update &&
    apt-get install -y google-chrome-stable
  `)
  
  // Install Node dependencies
  await sandbox.process.executeCommand('npm init -y && npm install puppeteer')
}

async function extractFollowersInSandbox(sandbox: any, username: string, scanId: string): Promise<string[]> {
  // Create extraction script
  const extractionScript = `
const puppeteer = require('puppeteer');

async function extractFollowers() {
  console.log('🚀 Starting follower extraction for @${username}');
  
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  });
  
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
  
  try {
    // Navigate to followers page
    console.log('🧭 Navigating to followers page...');
    await page.goto('https://x.com/${username}/followers', { 
      waitUntil: 'networkidle2',
      timeout: 30000 
    });
    
    let followers = [];
    let scrollAttempts = 0;
    const maxScrolls = 50;
    
    // Auto-scroll and extract
    while (scrollAttempts < maxScrolls) {
      console.log(\`📜 Scroll attempt \${scrollAttempts + 1}/\${maxScrolls}\`);
      
      // Extract current followers
      const currentFollowers = await page.evaluate(() => {
        const followerElements = document.querySelectorAll('[data-testid="UserCell"] a[href*="/"]');
        const usernames = [];
        
        followerElements.forEach(link => {
          const href = link.getAttribute('href');
          if (href && href.startsWith('/') && !href.includes('/status/')) {
            const username = href.substring(1);
            if (username && !usernames.includes(username)) {
              usernames.push(username);
            }
          }
        });
        
        return usernames;
      });
      
      // Add new followers
      currentFollowers.forEach(follower => {
        if (!followers.includes(follower)) {
          followers.push(follower);
        }
      });
      
      console.log(\`⚡ Found \${followers.length} unique followers so far\`);
      
      // Scroll down
      await page.evaluate(() => {
        window.scrollTo(0, document.body.scrollHeight);
      });
      
      // Wait for new content to load
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      scrollAttempts++;
    }
    
    console.log(\`🎉 Extraction completed! Found \${followers.length} followers\`);
    console.log('📋 Followers:', JSON.stringify(followers));
    
    return followers;
    
  } finally {
    await browser.close();
  }
}

extractFollowers().then(followers => {
  console.log('EXTRACTION_COMPLETE:', JSON.stringify(followers));
}).catch(error => {
  console.error('EXTRACTION_ERROR:', error.message);
});
`

  // Upload and execute script
  await sandbox.process.executeCommand(`cat > /tmp/extract_followers.js << 'EOF'
${extractionScript}
EOF`)

  const result = await sandbox.process.executeCommand('node /tmp/extract_followers.js')
  
  // Parse results
  const output = result.result
  const completeLine = output.split('\n').find((line: string) => line.includes('EXTRACTION_COMPLETE:'))
  
  if (completeLine) {
    const jsonStr = completeLine.replace('EXTRACTION_COMPLETE:', '')
    try {
      return JSON.parse(jsonStr)
    } catch (parseError) {
      console.log('⚠️ Could not parse extraction results')
      return []
    }
  }
  
  return []
}

async function storeResults(userId: string, scanId: string, username: string, followers: string[]) {
  await db.collection('auto_scans').doc(scanId).set({
    userId,
    scanId,
    username,
    followers,
    totalFollowers: followers.length,
    scanType: 'automated',
    createdAt: new Date(),
    status: 'completed'
  })
}

function updateProgress(
  scanId: string, 
  phase: ScanProgress['phase'], 
  progress: number, 
  message: string, 
  sandboxId?: string,
  error?: string,
  followersFound?: number
) {
  const current = scanProgress.get(scanId)
  if (current) {
    const updated: ScanProgress = {
      ...current,
      phase,
      progress,
      message,
      sandboxId,
      error,
      followersFound: followersFound ?? current.followersFound
    }
    scanProgress.set(scanId, updated)
    console.log(`📊 Progress Update [${scanId}]: ${phase} - ${progress}% - ${message}`)
  }
}

async function getEstimatedFollowerCount(username: string): Promise<number> {
  // This would normally call Twitter API to get follower count
  // For now, return a reasonable estimate
  return Math.floor(Math.random() * 10000) + 1000
}

function getEstimatedTime(followerCount: number): string {
  const minutes = Math.ceil(followerCount / 100) // ~100 followers per minute
  if (minutes < 60) {
    return `${minutes} minutes`
  } else {
    return `${Math.ceil(minutes / 60)} hours`
  }
}
