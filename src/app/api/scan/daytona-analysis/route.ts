import { NextRequest, NextResponse } from 'next/server'
import { adminAuth as auth } from '@/lib/firebase-admin'
import { Daytona } from '@daytonaio/sdk'

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const decodedToken = await auth.verifyIdToken(token)
    const userId = decodedToken.uid

    const { followers, targetUsername, analysisType } = await request.json()

    if (!followers || !Array.isArray(followers) || followers.length === 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'No followers provided for analysis' 
      }, { status: 400 })
    }

    console.log(`🔍 Starting Daytona analysis for ${followers.length} followers of @${targetUsername}`)

    // Initialize Daytona SDK
    const daytona = new Daytona({
      apiKey: process.env.DAYTONA_API_KEY!,
      apiUrl: process.env.DAYTONA_API_URL || 'https://app.daytona.io/api'
    })

    // Create analysis sandbox using working configuration from memory
    console.log('📦 Creating Daytona sandbox for follower analysis...')
    
    const sandbox = await daytona.create({
      image: 'node:18'
    })

    console.log(`✅ Sandbox created: ${sandbox.id}`)
    
    // Set environment variables after creation
    await sandbox.process.executeCommand(`export TARGET_USERNAME="${targetUsername}"`)
    await sandbox.process.executeCommand(`export ANALYSIS_TYPE="${analysisType}"`)
    await sandbox.process.executeCommand(`export FOLLOWER_COUNT="${followers.length}"`)

    // Create analysis script
    const analysisScript = `
const fs = require('fs');

console.log('🔍 Starting follower analysis...');

// Follower data from extraction
const followers = ${JSON.stringify(followers)};
const targetUsername = process.env.TARGET_USERNAME;
const analysisType = process.env.ANALYSIS_TYPE;

console.log(\`📊 Analyzing \${followers.length} followers of @\${targetUsername}\`);

// Basic analysis
const analysis = {
  totalFollowers: followers.length,
  targetUsername: targetUsername,
  analysisType: analysisType,
  timestamp: new Date().toISOString(),
  
  // Username patterns
  patterns: {
    withNumbers: followers.filter(f => /\\d/.test(f)).length,
    withUnderscores: followers.filter(f => f.includes('_')).length,
    shortNames: followers.filter(f => f.length <= 5).length,
    longNames: followers.filter(f => f.length >= 12).length
  },
  
  // Length distribution
  lengthStats: {
    average: Math.round(followers.reduce((sum, f) => sum + f.length, 0) / followers.length),
    shortest: Math.min(...followers.map(f => f.length)),
    longest: Math.max(...followers.map(f => f.length))
  },
  
  // Sample followers (first 20)
  sampleFollowers: followers.slice(0, 20),
  
  // Common prefixes/suffixes
  commonPrefixes: getCommonPrefixes(followers),
  commonSuffixes: getCommonSuffixes(followers)
};

function getCommonPrefixes(usernames) {
  const prefixes = {};
  usernames.forEach(username => {
    if (username.length >= 3) {
      const prefix = username.substring(0, 3).toLowerCase();
      prefixes[prefix] = (prefixes[prefix] || 0) + 1;
    }
  });
  
  return Object.entries(prefixes)
    .filter(([prefix, count]) => count >= 3)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([prefix, count]) => ({ prefix, count }));
}

function getCommonSuffixes(usernames) {
  const suffixes = {};
  usernames.forEach(username => {
    if (username.length >= 3) {
      const suffix = username.substring(username.length - 3).toLowerCase();
      suffixes[suffix] = (suffixes[suffix] || 0) + 1;
    }
  });
  
  return Object.entries(suffixes)
    .filter(([suffix, count]) => count >= 3)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([suffix, count]) => ({ suffix, count }));
}

console.log('📊 Analysis complete:', JSON.stringify(analysis, null, 2));

// Save results
fs.writeFileSync('/tmp/analysis_results.json', JSON.stringify(analysis, null, 2));

console.log('✅ Analysis saved to /tmp/analysis_results.json');
    `

    // Upload and execute analysis script
    await sandbox.process.executeCommand(`cat > /tmp/analysis.js << 'EOF'
${analysisScript}
EOF`)

    console.log('📊 Running follower analysis...')
    const analysisResult = await sandbox.process.executeCommand('node /tmp/analysis.js')
    
    console.log('📊 Analysis output:', analysisResult.result)

    // Get analysis results
    let analysisData = null
    try {
      const resultsCommand = await sandbox.process.executeCommand('cat /tmp/analysis_results.json')
      analysisData = JSON.parse(resultsCommand.result)
    } catch (parseError) {
      console.warn('⚠️ Could not parse analysis results:', parseError)
    }

    // Cleanup sandbox (using correct method)
    setTimeout(async () => {
      try {
        await daytona.delete(sandbox.id)
        console.log('🧹 Analysis sandbox cleaned up')
      } catch (cleanupError) {
        console.warn('⚠️ Sandbox cleanup error:', cleanupError)
      }
    }, 5000)

    return NextResponse.json({
      success: true,
      analysis: analysisData,
      sandboxId: sandbox.id,
      message: `Analysis complete for ${followers.length} followers`
    })

  } catch (error: any) {
    console.error('❌ Daytona analysis error:', error)
    
    return NextResponse.json({
      success: false,
      error: error.message || 'Analysis failed',
      details: error.toString()
    }, { status: 500 })
  }
}
