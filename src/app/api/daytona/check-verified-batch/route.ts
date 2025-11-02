import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase-admin'
import { DaytonaSandboxManager } from '@/lib/daytona-client'

export const maxDuration = 300 // 5 minutes

interface BatchJob {
  batchId: string
  usernames: string[]
  status: 'pending' | 'processing' | 'completed' | 'failed'
  sandboxId?: string
  results?: any[]
  error?: string
}

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
    const { allFollowers } = body // All follower usernames

    if (!allFollowers || !Array.isArray(allFollowers) || allFollowers.length === 0) {
      return NextResponse.json({ 
        error: 'Missing allFollowers array' 
      }, { status: 400 })
    }

    console.log(`[Batch Verify] Checking ${allFollowers.length} followers with parallel sandboxes`)

    // Get Twitter OAuth tokens
    const tokensDoc = await adminDb.collection('x_tokens').doc(userId).get()
    
    if (!tokensDoc.exists) {
      return NextResponse.json({ 
        error: 'Twitter not connected',
        needsAuth: true
      }, { status: 401 })
    }

    const tokens = tokensDoc.data()
    
    if (!tokens || !tokens.accessToken || !tokens.accessTokenSecret) {
      return NextResponse.json({ 
        error: 'Twitter tokens not found',
        needsAuth: true
      }, { status: 401 })
    }

    // Check Daytona config
    const DAYTONA_API_KEY = process.env.DAYTONA_API_KEY
    if (!DAYTONA_API_KEY) {
      return NextResponse.json({ error: 'Daytona not configured' }, { status: 500 })
    }

    // Split followers into batches of 50
    const BATCH_SIZE = 50
    const PARALLEL_SANDBOXES = 5 // Run 5 sandboxes at once
    
    const batches: string[][] = []
    for (let i = 0; i < allFollowers.length; i += BATCH_SIZE) {
      batches.push(allFollowers.slice(i, i + BATCH_SIZE))
    }

    console.log(`[Batch Verify] Created ${batches.length} batches (${BATCH_SIZE} each), running ${PARALLEL_SANDBOXES} in parallel`)

    // Process batches in parallel groups
    const allResults: any[] = []
    let completed = 0
    
    for (let i = 0; i < batches.length; i += PARALLEL_SANDBOXES) {
      const batchGroup = batches.slice(i, i + PARALLEL_SANDBOXES)
      
      console.log(`[Batch Verify] Processing batches ${i + 1}-${i + batchGroup.length} of ${batches.length}`)
      
      // Launch multiple sandboxes in parallel
      const batchPromises = batchGroup.map(async (batchUsernames, batchIndex) => {
        const actualBatchNum = i + batchIndex + 1
        console.log(`[Batch ${actualBatchNum}] Starting sandbox for ${batchUsernames.length} users`)
        
        try {
          // Create sandbox for this batch
          const sandbox = await DaytonaSandboxManager.createSandbox({
            name: `verify-batch-${actualBatchNum}-${Date.now()}`,
            envVars: {
              TWITTER_ACCESS_TOKEN: tokens.accessToken,
              TWITTER_ACCESS_TOKEN_SECRET: tokens.accessTokenSecret,
              USERNAMES: JSON.stringify(batchUsernames),
              BATCH_NUM: actualBatchNum.toString()
            }
          })

          console.log(`[Batch ${actualBatchNum}] Sandbox created: ${sandbox.id}`)

          // Simplified verification script (faster)
          const verifyScript = `
const puppeteer = require('puppeteer');

async function checkVerified() {
  const usernames = JSON.parse(process.env.USERNAMES);
  const batchNum = process.env.BATCH_NUM;
  const results = [];
  
  console.log(\`[Batch \${batchNum}] Starting verification for \${usernames.length} users\`);
  
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  
  // Quick check - just look for verified badge in profile
  for (let i = 0; i < usernames.length; i++) {
    const username = usernames[i];
    
    try {
      await page.goto(\`https://x.com/\${username}\`, { 
        waitUntil: 'domcontentloaded',
        timeout: 8000 
      });
      
      // Wait a bit for content to load
      await page.waitForTimeout(1000);
      
      // Check for verified badge (SVG with specific aria-label)
      const isVerified = await page.evaluate(() => {
        // Look for verified badge SVG
        const badges = document.querySelectorAll('svg[aria-label*="Verified"]');
        return badges.length > 0;
      });
      
      results.push({
        username,
        verified: isVerified,
        checked: true
      });
      
      if ((i + 1) % 10 === 0) {
        console.log(\`[Batch \${batchNum}] Checked \${i + 1}/\${usernames.length}\`);
      }
    } catch (err) {
      console.error(\`[Batch \${batchNum}] Error checking @\${username}:\`, err.message);
      results.push({
        username,
        verified: false,
        checked: false,
        error: err.message
      });
    }
  }
  
  await browser.close();
  
  console.log(\`[Batch \${batchNum}] Completed. Verified: \${results.filter(r => r.verified).length}/\${results.length}\`);
  console.log(JSON.stringify(results));
  return results;
}

checkVerified().catch(console.error);
`;

          // Write and execute script
          const base64Script = Buffer.from(verifyScript).toString('base64')
          await sandbox.process.executeCommand(`echo '${base64Script}' | base64 -d > /tmp/verify.js`)
          
          // Install Puppeteer
          console.log(`[Batch ${actualBatchNum}] Installing dependencies...`)
          await sandbox.process.executeCommand('npm init -y')
          await sandbox.process.executeCommand('npm install puppeteer')
          
          // Execute
          console.log(`[Batch ${actualBatchNum}] Running verification...`)
          const execution = await sandbox.process.executeCommand('node /tmp/verify.js')
          
          // Parse results
          let batchResults = []
          try {
            const output = execution.result || ''
            const outputMatch = output.match(/\[[\s\S]*\]/)
            if (outputMatch) {
              batchResults = JSON.parse(outputMatch[0])
              console.log(`[Batch ${actualBatchNum}] ✅ Got ${batchResults.length} results`)
            }
          } catch (parseError) {
            console.error(`[Batch ${actualBatchNum}] Parse error:`, parseError)
          }

          return { batchNum: actualBatchNum, results: batchResults }
          
        } catch (error) {
          console.error(`[Batch ${actualBatchNum}] Failed:`, error)
          return { 
            batchNum: actualBatchNum, 
            results: batchUsernames.map(u => ({ username: u, verified: false, checked: false, error: 'Batch failed' }))
          }
        }
      })

      // Wait for all sandboxes in this group to complete
      const batchGroupResults = await Promise.all(batchPromises)
      
      // Collect results
      batchGroupResults.forEach(batch => {
        allResults.push(...batch.results)
        completed++
      })
      
      console.log(`[Batch Verify] Progress: ${completed}/${batches.length} batches complete`)
    }

    // Update Firestore with all results
    console.log(`[Batch Verify] Updating Firestore with ${allResults.length} results`)
    const batch = adminDb.batch()
    const followersRef = adminDb.collection('users').doc(userId).collection('followers')
    
    allResults.forEach((result: any) => {
      if (result.checked) {
        const sanitizedUsername = result.username
          .replace(/^_+|_+$/g, '')
          .replace(/\//g, '_')
          .replace(/\./g, '_') || 'unknown_user'
        
        const docRef = followersRef.doc(sanitizedUsername)
        batch.set(docRef, {
          verified: result.verified,
          verified_checked_at: new Date().toISOString(),
          verified_method: 'daytona_batch'
        }, { merge: true })
      }
    })

    await batch.commit()

    const verifiedCount = allResults.filter(r => r.verified).length
    const checkedCount = allResults.filter(r => r.checked).length

    console.log(`[Batch Verify] ✅ Complete! ${verifiedCount} verified out of ${checkedCount} checked`)

    return NextResponse.json({
      success: true,
      total: allResults.length,
      checked: checkedCount,
      verified: verifiedCount,
      failed: allResults.length - checkedCount,
      batches: batches.length,
      message: `Checked ${checkedCount} followers across ${batches.length} parallel batches`
    })

  } catch (error) {
    console.error('[Batch Verify] Error:', error)
    return NextResponse.json(
      { 
        error: 'Verification failed', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    )
  }
}
