#!/usr/bin/env node

/**
 * Test OAuth-authenticated Daytona browser scraping system
 * This script tests the complete flow of OAuth-authenticated follower extraction
 */

const https = require('https');

const API_BASE = 'https://followlytics-git-main-joeproais-projects.vercel.app';

async function makeRequest(url, method = 'GET', data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Followlytics-Test/1.0'
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

async function testOAuthDaytonaScan() {
  console.log('🧪 Testing OAuth-authenticated Daytona browser scraping system...\n');

  try {
    // Step 1: Submit scan request
    console.log('📤 Step 1: Submitting OAuth-authenticated scan request...');
    const scanRequest = {
      username: 'JoeProAI',
      estimated_followers: 1000,
      priority: 'high',
      user_id: 'test_user_oauth'
    };

    const submitResponse = await makeRequest(
      `${API_BASE}/api/scan/daytona`,
      'POST',
      scanRequest
    );

    console.log(`   Status: ${submitResponse.status}`);
    console.log(`   Response:`, JSON.stringify(submitResponse.data, null, 2));

    if (submitResponse.status !== 200 || !submitResponse.data.success) {
      throw new Error(`Scan submission failed: ${JSON.stringify(submitResponse.data)}`);
    }

    const jobId = submitResponse.data.job_id;
    const sandboxId = submitResponse.data.sandbox_id;
    
    console.log(`   ✅ Scan submitted successfully!`);
    console.log(`   📋 Job ID: ${jobId}`);
    console.log(`   🏗️  Sandbox ID: ${sandboxId}`);
    console.log(`   ⏱️  Estimated duration: ${submitResponse.data.estimated_duration}`);
    console.log(`   💰 Estimated cost: ${submitResponse.data.estimated_cost}\n`);

    // Step 2: Monitor scan progress
    console.log('📊 Step 2: Monitoring OAuth scan progress...');
    let attempts = 0;
    const maxAttempts = 60; // 10 minutes max
    let lastStatus = '';
    let lastPhase = '';

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
      
      // Only log if status or phase changed
      if (status.status !== lastStatus || status.phase !== lastPhase) {
        console.log(`   [${attempts}] Status: ${status.status} | Phase: ${status.phase} | Progress: ${status.progress}%`);
        console.log(`   Message: ${status.message}`);
        
        if (status.followers_found > 0) {
          console.log(`   👥 Followers found: ${status.followers_found}`);
        }
        
        lastStatus = status.status;
        lastPhase = status.phase;
      }

      // Check if scan completed
      if (status.status === 'completed') {
        console.log('\n✅ OAuth-authenticated scan completed successfully!');
        console.log(`   📊 Total followers found: ${status.followers_found}`);
        
        if (status.results && status.results.followers) {
          console.log(`   📋 Sample followers:`, status.results.followers.slice(0, 5).map(f => f.username));
          
          if (status.results.ai_analysis) {
            console.log(`   🤖 AI analysis available: ${Object.keys(status.results.ai_analysis).length} insights`);
          }
        }
        
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
        console.log('\n❌ OAuth scan failed!');
        console.log(`   Error: ${status.error}`);
        if (status.details) {
          console.log(`   Details: ${status.details}`);
        }
        
        return {
          success: false,
          error: status.error,
          details: status.details
        };
      }
    }

    throw new Error('Scan timeout - exceeded maximum wait time');

  } catch (error) {
    console.error('\n❌ OAuth Daytona scan test failed:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

// Run the test
testOAuthDaytonaScan().then(result => {
  console.log('\n' + '='.repeat(60));
  console.log('🏁 OAuth-AUTHENTICATED DAYTONA SCAN TEST COMPLETE');
  console.log('='.repeat(60));
  
  if (result.success) {
    console.log('✅ RESULT: SUCCESS');
    console.log(`📊 Followers extracted: ${result.followersFound || 0}`);
    console.log('🔐 OAuth authentication: WORKING');
    console.log('🏗️  Daytona sandbox: WORKING');
    console.log('🌐 Browser scraping: WORKING');
  } else {
    console.log('❌ RESULT: FAILED');
    console.log(`💥 Error: ${result.error}`);
  }
  
  process.exit(result.success ? 0 : 1);
}).catch(error => {
  console.error('💥 Test execution failed:', error);
  process.exit(1);
});
