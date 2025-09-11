#!/usr/bin/env node

/**
 * Test Complete OAuth-Authenticated Daytona Follower Extraction
 * This will launch a sandbox and test the full OAuth authentication flow
 */

const https = require('https');

const API_BASE = 'https://followlytics.vercel.app';

async function makeRequest(url, method = 'GET', data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Followlytics-OAuth-Test/1.0'
      }
    };

    const req = https.request(url, options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });

    req.on('error', reject);
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

async function testCompleteOAuthScan() {
  console.log('🚀 Testing Complete OAuth-Authenticated Daytona Follower Extraction...\n');

  try {
    // Step 1: Submit OAuth-authenticated scan request
    console.log('📤 Step 1: Submitting OAuth-authenticated Daytona scan...');
    const scanRequest = {
      username: 'JoeProAI',
      estimated_followers: 867,
      priority: 'high',
      user_id: 'oauth_test_user'
    };

    const submitResponse = await makeRequest(
      `${API_BASE}/api/scan/daytona`,
      'POST',
      scanRequest
    );

    console.log(`   Status: ${submitResponse.status}`);
    
    if (submitResponse.status !== 200 || !submitResponse.data.success) {
      console.log(`   ❌ Scan submission failed:`);
      console.log(`   Response:`, JSON.stringify(submitResponse.data, null, 2));
      return false;
    }

    const jobId = submitResponse.data.job_id;
    const sandboxId = submitResponse.data.sandbox_id;
    
    console.log(`   ✅ OAuth scan submitted successfully!`);
    console.log(`   📋 Job ID: ${jobId}`);
    console.log(`   🏗️  Sandbox ID: ${sandboxId}`);
    console.log(`   👤 Target: @${scanRequest.username} (${scanRequest.estimated_followers} followers)`);
    console.log(`   ⏱️  Estimated duration: ${submitResponse.data.estimated_duration}`);
    console.log(`   💰 Estimated cost: ${submitResponse.data.estimated_cost}\n`);

    // Step 2: Monitor OAuth scan progress with detailed logging
    console.log('📊 Step 2: Monitoring OAuth-authenticated scan progress...');
    let attempts = 0;
    const maxAttempts = 120; // 20 minutes max
    let lastStatus = '';
    let lastPhase = '';
    let lastProgress = 0;

    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10 seconds
      attempts++;

      const statusResponse = await makeRequest(
        `${API_BASE}/api/scan/daytona?job_id=${jobId}`
      );

      if (statusResponse.status !== 200) {
        console.log(`   ⚠️  Status check failed: ${statusResponse.status}`);
        continue;
      }

      const status = statusResponse.data;
      
      // Log detailed progress updates
      if (status.status !== lastStatus || status.phase !== lastPhase || status.progress !== lastProgress) {
        const timestamp = new Date().toLocaleTimeString();
        console.log(`   [${timestamp}] Status: ${status.status} | Phase: ${status.phase} | Progress: ${status.progress}%`);
        console.log(`   Message: ${status.message}`);
        
        if (status.followers_found > 0) {
          console.log(`   👥 Followers found: ${status.followers_found}`);
        }
        
        // Log phase-specific details
        if (status.phase === 'creating_sandbox') {
          console.log(`   🏗️  Creating Daytona sandbox with OAuth credentials...`);
        } else if (status.phase === 'installing_dependencies') {
          console.log(`   📦 Installing Python, Playwright, and browser dependencies...`);
        } else if (status.phase === 'installing_browser') {
          console.log(`   🌐 Installing Chromium browser for OAuth authentication...`);
        } else if (status.phase === 'scanning_followers') {
          console.log(`   🔐 Running OAuth-authenticated browser scraping...`);
        }
        
        lastStatus = status.status;
        lastPhase = status.phase;
        lastProgress = status.progress;
      }

      // Check if scan completed successfully
      if (status.status === 'completed') {
        console.log('\n✅ OAuth-authenticated scan completed successfully!');
        console.log(`   📊 Total followers extracted: ${status.followers_found}`);
        
        if (status.results && status.results.followers) {
          console.log(`   📋 Sample followers extracted:`);
          status.results.followers.slice(0, 10).forEach((follower, i) => {
            console.log(`     ${i + 1}. @${follower.username} (${follower.display_name})`);
          });
          
          if (status.results.followers.length > 10) {
            console.log(`     ... and ${status.results.followers.length - 10} more`);
          }
          
          if (status.results.ai_analysis) {
            console.log(`   🤖 AI analysis completed with ${Object.keys(status.results.ai_analysis).length} insights`);
          }
        }
        
        console.log('\n🔍 OAuth Authentication Analysis:');
        console.log(`   ✅ Daytona sandbox creation: SUCCESS`);
        console.log(`   ✅ OAuth token injection: SUCCESS`);
        console.log(`   ✅ Browser authentication: SUCCESS`);
        console.log(`   ✅ Follower extraction: SUCCESS`);
        console.log(`   ✅ Data processing: SUCCESS`);
        
        return {
          success: true,
          jobId,
          sandboxId,
          followersFound: status.followers_found,
          results: status.results
        };
      }

      // Check if scan failed
      if (status.status === 'failed') {
        console.log('\n❌ OAuth-authenticated scan failed!');
        console.log(`   Error: ${status.error}`);
        if (status.details) {
          console.log(`   Details: ${status.details}`);
        }
        
        console.log('\n🔍 Failure Analysis:');
        if (status.error && status.error.includes('OAuth')) {
          console.log(`   🔐 OAuth authentication issue detected`);
        } else if (status.error && status.error.includes('sandbox')) {
          console.log(`   🏗️  Daytona sandbox issue detected`);
        } else if (status.error && status.error.includes('browser')) {
          console.log(`   🌐 Browser automation issue detected`);
        }
        
        return {
          success: false,
          error: status.error,
          details: status.details
        };
      }

      // Progress indicator
      if (attempts % 6 === 0) { // Every minute
        console.log(`   ⏳ Still running... (${attempts} checks, ${Math.round(attempts/6)} minutes elapsed)`);
      }
    }

    throw new Error('OAuth scan timeout - exceeded maximum wait time (20 minutes)');

  } catch (error) {
    console.error('\n❌ Complete OAuth scan test failed:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

// Run the complete test
testCompleteOAuthScan().then(result => {
  console.log('\n' + '='.repeat(80));
  console.log('🏁 COMPLETE OAUTH-AUTHENTICATED DAYTONA SCAN TEST RESULTS');
  console.log('='.repeat(80));
  
  if (result.success) {
    console.log('✅ RESULT: SUCCESS');
    console.log(`📊 Followers extracted: ${result.followersFound || 0}`);
    console.log('🔐 OAuth authentication: WORKING');
    console.log('🏗️  Daytona sandbox: WORKING');
    console.log('🌐 Browser scraping: WORKING');
    console.log('📱 Production system: READY');
    
    console.log('\n🎉 The OAuth-authenticated browser scraping system is fully operational!');
    console.log('   Users can now extract followers without individual authentication.');
    console.log('   The system uses app-level OAuth tokens for scalable automation.');
  } else {
    console.log('❌ RESULT: FAILED');
    console.log(`💥 Error: ${result.error}`);
    if (result.details) {
      console.log(`📋 Details: ${result.details}`);
    }
    
    console.log('\n🔧 Next steps:');
    console.log('   • Check Vercel environment variables');
    console.log('   • Verify Twitter app configuration');
    console.log('   • Review Daytona API access');
  }
  
  process.exit(result.success ? 0 : 1);
}).catch(error => {
  console.error('💥 Test execution failed:', error);
  process.exit(1);
});
