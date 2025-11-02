import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase-admin'
import { DaytonaSandboxManager } from '@/lib/daytona-client'

export const maxDuration = 300 // 5 minutes

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const idToken = authHeader.split('Bearer ')[1]
    const decodedToken = await adminAuth.verifyIdToken(idToken)
    const userId = decodedToken.uid

    const body = await request.json()
    const { usernames } = body // Array of usernames to check

    if (!usernames || !Array.isArray(usernames) || usernames.length === 0) {
      return NextResponse.json({ 
        error: 'Missing usernames array' 
      }, { status: 400 })
    }

    console.log(`[Daytona Verify] Checking verified status for ${usernames.length} users`)

    // Get Twitter OAuth tokens
    const tokensSnapshot = await adminDb
      .collection('x_tokens')
      .where('userId', '==', userId)
      .limit(1)
      .get()

    if (tokensSnapshot.empty) {
      return NextResponse.json({ 
        error: 'Twitter not connected. Please authorize Twitter access first.',
        needsAuth: true
      }, { status: 401 })
    }

    const tokens = tokensSnapshot.docs[0].data()

    // Create Daytona sandbox using proper SDK
    const DAYTONA_API_KEY = process.env.DAYTONA_API_KEY
    if (!DAYTONA_API_KEY) {
      return NextResponse.json({ error: 'Daytona not configured' }, { status: 500 })
    }

    // Create sandbox using SDK
    console.log('[Daytona Verify] Creating sandbox...')
    const sandbox = await DaytonaSandboxManager.createSandbox({
      name: `verify-${userId}-${Date.now()}`,
      envVars: {
        TWITTER_ACCESS_TOKEN: tokens.accessToken,
        TWITTER_ACCESS_TOKEN_SECRET: tokens.accessTokenSecret,
        USERNAMES: JSON.stringify(usernames)
      }
    })

    console.log(`[Daytona Verify] Sandbox created: ${sandbox.id}`)

    // Run verified check script
    const verifyScript = `
const puppeteer = require('puppeteer');

async function checkVerified() {
  const usernames = JSON.parse(process.env.USERNAMES);
  const results = [];
  
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  
  // Set cookies/tokens for Twitter authentication
  await page.goto('https://x.com');
  
  // Inject OAuth tokens
  await page.evaluate((token, secret) => {
    localStorage.setItem('twitter_oauth_token', token);
    localStorage.setItem('twitter_oauth_token_secret', secret);
  }, process.env.TWITTER_ACCESS_TOKEN, process.env.TWITTER_ACCESS_TOKEN_SECRET);
  
  // Process in batches of 10 to avoid rate limits
  for (let i = 0; i < usernames.length; i++) {
    const username = usernames[i];
    console.log(\`Checking \${i + 1}/\${usernames.length}: @\${username}\`);
    
    try {
      await page.goto(\`https://x.com/\${username}\`, { 
        waitUntil: 'networkidle2',
        timeout: 10000 
      });
      
      // Wait a bit for page to load
      await page.waitForTimeout(2000);
      
      // Check for verified badge
      const isVerified = await page.evaluate(() => {
        // Look for verified SVG icon or aria-label
        const verifiedIcon = document.querySelector('[aria-label*="Verified"]') ||
                            document.querySelector('[data-testid="icon-verified"]') ||
                            document.querySelector('svg[aria-label="Verified account"]');
        return !!verifiedIcon;
      });
      
      results.push({
        username,
        verified: isVerified,
        checked: true
      });
      
    } catch (error) {
      console.error(\`Error checking @\${username}:\`, error.message);
      results.push({
        username,
        verified: false,
        checked: false,
        error: error.message
      });
    }
    
    // Small delay between checks
    if (i < usernames.length - 1) {
      await page.waitForTimeout(1000);
    }
  }
  
  await browser.close();
  
  console.log(JSON.stringify(results));
  return results;
}

checkVerified().catch(console.error);
`;

    // Execute script in sandbox using SDK
    console.log('[Daytona Verify] Executing verification script...')
    
    // Write script to file and execute
    const base64Script = Buffer.from(verifyScript).toString('base64')
    await sandbox.process.executeCommand(`echo '${base64Script}' | base64 -d > /tmp/verify.js`)
    
    // Install dependencies
    await sandbox.process.executeCommand('npm init -y')
    await sandbox.process.executeCommand('npm install puppeteer')
    
    // Execute the script
    const execution = await sandbox.process.executeCommand('node /tmp/verify.js')
    
    // Parse results from output
    let verifiedResults = []
    try {
      // Find JSON array in result (use [\s\S]* instead of .* with s flag for compatibility)
      const output = execution.result || execution.output || ''
      const outputMatch = output.match(/\[[\s\S]*\]/)
      if (outputMatch) {
        verifiedResults = JSON.parse(outputMatch[0])
      }
    } catch (parseError) {
      console.error('[Daytona Verify] Failed to parse results:', parseError)
      console.error('[Daytona Verify] Execution output:', execution.result || execution.output)
    }

    // Update Firestore with verified status
    const batch = adminDb.batch()
    const followersRef = adminDb.collection('users').doc(userId).collection('followers')
    
    verifiedResults.forEach((result: any) => {
      if (result.checked) {
        const sanitizedUsername = result.username
          .replace(/^_+|_+$/g, '')
          .replace(/\//g, '_')
          .replace(/\./g, '_') || 'unknown_user'
        
        const docRef = followersRef.doc(sanitizedUsername)
        batch.set(docRef, {
          verified: result.verified,
          verified_checked_at: new Date().toISOString(),
          verified_method: 'daytona_browser'
        }, { merge: true })
      }
    })

    await batch.commit()

    // Cleanup sandbox
    try {
      await fetch(`https://api.daytona.io/workspace/${sandbox.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${DAYTONA_API_KEY}` }
      })
    } catch (cleanupError) {
      console.error('[Daytona Verify] Sandbox cleanup failed:', cleanupError)
    }

    const checkedCount = verifiedResults.filter((r: any) => r.checked).length
    const verifiedCount = verifiedResults.filter((r: any) => r.verified).length

    console.log(`[Daytona Verify] ✅ Checked ${checkedCount} users, found ${verifiedCount} verified`)

    return NextResponse.json({
      success: true,
      checked: checkedCount,
      verified: verifiedCount,
      results: verifiedResults,
      sandbox_id: sandbox.id
    })

  } catch (error: any) {
    console.error('[Daytona Verify] Error:', error)
    return NextResponse.json({ 
      error: 'Failed to check verified status',
      details: error.message 
    }, { status: 500 })
  }
}
