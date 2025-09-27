import { NextRequest, NextResponse } from 'next/server'
import { adminAuth as auth, adminDb as db } from '@/lib/firebase-admin'
import { Daytona } from '@daytonaio/sdk'

interface FollowerData {
  username: string
  displayName: string
  profileImage?: string
  isVerified?: boolean
  followerCount?: string
}

interface ProcessingRequest {
  followers: FollowerData[]
  processingType: 'analysis' | 'comparison' | 'export' | 'deduplication'
}

const daytona = new Daytona({
  apiKey: process.env.DAYTONA_API_KEY!,
  apiUrl: process.env.DAYTONA_API_URL || "https://app.daytona.io/api"
})

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
    const body: ProcessingRequest = await request.json()
    const { followers, processingType } = body

    if (!followers || followers.length === 0) {
      return NextResponse.json({ error: 'No followers data provided' }, { status: 400 })
    }

    console.log(`🚀 Starting sandbox processing for ${followers.length} followers (type: ${processingType})`)

    // Create processing job ID
    const jobId = `process_${userId}_${Date.now()}`

    // Start background processing
    processFollowersInSandbox(jobId, userId, followers, processingType).catch(error => {
      console.error('❌ Background processing failed:', error)
    })

    return NextResponse.json({
      success: true,
      jobId,
      message: `Started ${processingType} processing for ${followers.length} followers`,
      estimatedTime: getEstimatedProcessingTime(followers.length, processingType)
    })

  } catch (error: any) {
    console.error('❌ Failed to start follower processing:', error)
    return NextResponse.json({ 
      error: 'Failed to start processing',
      details: error.message 
    }, { status: 500 })
  }
}

async function processFollowersInSandbox(
  jobId: string,
  userId: string,
  followers: FollowerData[],
  processingType: string
) {
  let sandbox: any = null

  try {
    console.log(`📦 Creating sandbox for follower processing: ${jobId}`)

    // Create sandbox
    sandbox = await daytona.create({
      name: `follower-processor-${jobId}`,
      image: 'node:18-bullseye',
      timeout: 30 * 60 * 1000, // 30 minutes
    })

    console.log(`✅ Sandbox created: ${sandbox.id}`)

    // Create processing script
    const processingScript = generateProcessingScript(followers, processingType)
    
    // Upload script to sandbox
    await sandbox.process.executeCommand(`cat > /tmp/process_followers.js << 'EOF'
${processingScript}
EOF`)

    // Install dependencies
    await sandbox.process.executeCommand('npm init -y && npm install lodash axios')

    // Execute processing
    console.log(`⚡ Starting ${processingType} processing...`)
    const result = await sandbox.process.executeCommand('node /tmp/process_followers.js')

    console.log(`✅ Processing completed: ${result.result.substring(0, 500)}`)

    // Parse results
    let processedData
    try {
      processedData = JSON.parse(result.result)
    } catch (parseError) {
      console.log('⚠️ Could not parse results as JSON, storing raw output')
      processedData = { rawOutput: result.result }
    }

    // Store results in Firebase
    await db.collection('follower_processing').doc(jobId).set({
      userId,
      jobId,
      processingType,
      originalCount: followers.length,
      processedData,
      status: 'completed',
      createdAt: new Date(),
      completedAt: new Date()
    })

    console.log(`💾 Results stored for job: ${jobId}`)

  } catch (error: any) {
    console.error(`❌ Processing failed for job ${jobId}:`, error)
    
    // Store error in Firebase
    await db.collection('follower_processing').doc(jobId).set({
      userId,
      jobId,
      processingType,
      originalCount: followers.length,
      status: 'failed',
      error: error.message,
      createdAt: new Date(),
      failedAt: new Date()
    })

  } finally {
    // Cleanup sandbox
    if (sandbox) {
      try {
        await sandbox.destroy()
        console.log(`🧹 Sandbox cleaned up: ${sandbox.id}`)
      } catch (cleanupError) {
        console.log('⚠️ Sandbox cleanup error:', cleanupError)
      }
    }
  }
}

function generateProcessingScript(followers: FollowerData[], processingType: string): string {
  const followersJson = JSON.stringify(followers, null, 2)

  return `
const _ = require('lodash');

const followers = ${followersJson};

console.log('🚀 Starting ${processingType} processing for', followers.length, 'followers');

let results = {};

try {
  switch ('${processingType}') {
    case 'analysis':
      results = analyzeFollowers(followers);
      break;
    case 'deduplication':
      results = deduplicateFollowers(followers);
      break;
    case 'comparison':
      results = compareFollowers(followers);
      break;
    case 'export':
      results = exportFollowers(followers);
      break;
    default:
      results = { error: 'Unknown processing type: ${processingType}' };
  }
  
  console.log(JSON.stringify(results, null, 2));
  
} catch (error) {
  console.log(JSON.stringify({ error: error.message }, null, 2));
}

function analyzeFollowers(followers) {
  const analysis = {
    total: followers.length,
    verified: followers.filter(f => f.isVerified).length,
    withImages: followers.filter(f => f.profileImage).length,
    usernamePatterns: {},
    displayNameAnalysis: {},
    topUsernames: followers.slice(0, 20).map(f => f.username)
  };
  
  // Analyze username patterns
  followers.forEach(f => {
    const firstChar = f.username.charAt(0).toLowerCase();
    analysis.usernamePatterns[firstChar] = (analysis.usernamePatterns[firstChar] || 0) + 1;
  });
  
  // Analyze display names
  const displayNames = followers.map(f => f.displayName).filter(Boolean);
  analysis.displayNameAnalysis = {
    total: displayNames.length,
    unique: [...new Set(displayNames)].length,
    averageLength: displayNames.reduce((sum, name) => sum + name.length, 0) / displayNames.length
  };
  
  return analysis;
}

function deduplicateFollowers(followers) {
  const unique = _.uniqBy(followers, 'username');
  const duplicates = followers.length - unique.length;
  
  return {
    original: followers.length,
    unique: unique.length,
    duplicatesRemoved: duplicates,
    followers: unique
  };
}

function compareFollowers(followers) {
  // This would compare with previous scans - placeholder for now
  return {
    current: followers.length,
    comparison: 'No previous scan to compare with',
    followers: followers.slice(0, 10) // Sample
  };
}

function exportFollowers(followers) {
  const csv = 'username,displayName,isVerified,profileImage\\n' + 
    followers.map(f => 
      \`\${f.username},"\${f.displayName}",\${f.isVerified || false},\${f.profileImage || ''}\`
    ).join('\\n');
    
  return {
    format: 'CSV',
    totalRecords: followers.length,
    csv: csv,
    summary: {
      verified: followers.filter(f => f.isVerified).length,
      withImages: followers.filter(f => f.profileImage).length
    }
  };
}
`
}

function getEstimatedProcessingTime(followerCount: number, processingType: string): string {
  const baseTime = Math.ceil(followerCount / 1000) // 1 second per 1000 followers
  
  const multipliers = {
    analysis: 1,
    deduplication: 0.5,
    comparison: 2,
    export: 0.3
  }
  
  const multiplier = multipliers[processingType as keyof typeof multipliers] || 1
  const estimatedSeconds = Math.max(5, baseTime * multiplier)
  
  if (estimatedSeconds < 60) {
    return `${estimatedSeconds} seconds`
  } else {
    return `${Math.ceil(estimatedSeconds / 60)} minutes`
  }
}

// GET endpoint to check processing status
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const jobId = url.searchParams.get('jobId')
    
    if (!jobId) {
      return NextResponse.json({ error: 'Job ID required' }, { status: 400 })
    }

    // Verify authentication
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const decodedToken = await auth.verifyIdToken(token)
    const userId = decodedToken.uid

    // Get job status from Firebase
    const jobDoc = await db.collection('follower_processing').doc(jobId).get()
    
    if (!jobDoc.exists) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

    const jobData = jobDoc.data()
    
    // Verify user owns this job
    if (jobData?.userId !== userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    return NextResponse.json(jobData)

  } catch (error: any) {
    console.error('❌ Failed to get job status:', error)
    return NextResponse.json({ 
      error: 'Failed to get status',
      details: error.message 
    }, { status: 500 })
  }
}
