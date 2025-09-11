const fetch = require('node-fetch');

async function testCompleteOAuthFlow() {
  console.log('🚀 Testing Complete OAuth + Scanning Flow');
  console.log('=' .repeat(50));
  
  try {
    // Step 1: Test Twitter OAuth initialization
    console.log('\n📱 Step 1: Testing Twitter OAuth initialization...');
    const oauthResponse = await fetch('http://localhost:3000/api/auth/twitter', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    if (oauthResponse.ok) {
      const oauthData = await oauthResponse.json();
      console.log('✅ OAuth initialization successful');
      console.log(`🔗 Authorization URL: ${oauthData.authorization_url}`);
      
      // Step 2: Check OAuth status (should be unauthorized initially)
      console.log('\n🔍 Step 2: Checking OAuth status...');
      const statusResponse = await fetch('http://localhost:3000/api/auth/twitter/status');
      
      if (statusResponse.ok) {
        const statusData = await statusResponse.json();
        console.log(`📊 OAuth Status: ${statusData.authorized ? 'Authorized' : 'Not Authorized'}`);
        
        if (statusData.authorized) {
          console.log(`👤 Authorized user: @${statusData.username}`);
          
          // Step 3: Test scanning with authorized user
          console.log('\n🔍 Step 3: Testing scan with authorized user...');
          const scanResponse = await fetch('http://localhost:3000/api/scan/scalable', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              username: statusData.username,
              estimated_followers: 1000,
              user_id: 'test_user_id'
            })
          });
          
          if (scanResponse.ok) {
            const scanData = await scanResponse.json();
            console.log('✅ Scan initiated successfully');
            console.log(`📋 Job ID: ${scanData.job_id}`);
            console.log(`🔧 Method: ${scanData.method}`);
            console.log(`⏱️ Estimated time: ${scanData.estimated_time}`);
            
            // Monitor scan progress
            console.log('\n📈 Monitoring scan progress...');
            await monitorScanProgress(scanData.job_id);
            
          } else {
            const errorText = await scanResponse.text();
            console.log('❌ Scan failed:', errorText);
          }
          
        } else {
          console.log('⚠️ User not authorized - need to complete OAuth flow first');
          console.log('💡 Visit the authorization URL above to complete OAuth');
        }
        
      } else {
        console.log('❌ Status check failed');
      }
      
    } else {
      const errorText = await oauthResponse.text();
      console.log('❌ OAuth initialization failed:', errorText);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

async function monitorScanProgress(jobId) {
  for (let i = 0; i < 10; i++) {
    await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
    
    try {
      const response = await fetch(`http://localhost:3000/api/scan/scalable?job_id=${jobId}`);
      
      if (response.ok) {
        const data = await response.json();
        console.log(`📊 Check ${i + 1}: ${data.status}`);
        
        if (data.message) {
          console.log(`💬 Message: ${data.message}`);
        }
        
        if (data.progress) {
          console.log(`📈 Progress: ${data.progress}%`);
        }
        
        if (data.followers_extracted) {
          console.log(`👥 Followers extracted: ${data.followers_extracted}`);
        }
        
        if (data.results && data.results.followers) {
          console.log(`🎯 SUCCESS: Found ${data.results.followers.length} followers!`);
          console.log('First 3 followers:');
          data.results.followers.slice(0, 3).forEach((follower, idx) => {
            console.log(`  ${idx + 1}. @${follower.username || follower}`);
          });
          break;
        }
        
        if (data.status === 'completed' || data.status === 'failed') {
          console.log(`🏁 Scan ${data.status}`);
          if (data.error) {
            console.log(`❌ Error: ${data.error}`);
          }
          break;
        }
        
      } else {
        console.log(`⚠️ Status check failed: ${response.status}`);
      }
      
    } catch (error) {
      console.log(`❌ Monitoring error: ${error.message}`);
    }
  }
}

async function testDirectDaytonaFlow() {
  console.log('\n🔧 Testing Direct Daytona Flow...');
  
  try {
    const response = await fetch('http://localhost:3000/api/scan/daytona', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: 'elonmusk',
        estimated_followers: 1000,
        user_id: 'test_user_with_oauth'
      })
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Daytona scan initiated');
      console.log(`📋 Job ID: ${data.job_id}`);
      
      // Monitor this job too
      if (data.job_id) {
        console.log('\n📈 Monitoring Daytona scan...');
        await monitorDaytonaScan(data.job_id);
      }
      
    } else {
      const errorText = await response.text();
      console.log('❌ Daytona scan failed:', errorText);
    }
    
  } catch (error) {
    console.error('❌ Daytona test failed:', error.message);
  }
}

async function monitorDaytonaScan(jobId) {
  for (let i = 0; i < 15; i++) {
    await new Promise(resolve => setTimeout(resolve, 6000)); // Wait 6 seconds
    
    try {
      const response = await fetch(`http://localhost:3000/api/scan/daytona?job_id=${jobId}`);
      
      if (response.ok) {
        const data = await response.json();
        console.log(`📊 Daytona Check ${i + 1}: ${data.status}`);
        
        if (data.message) {
          console.log(`💬 Message: ${data.message}`);
        }
        
        if (data.progress) {
          console.log(`📈 Progress: ${data.progress}%`);
        }
        
        if (data.status === 'completed' && data.results) {
          console.log(`🎯 DAYTONA SUCCESS: Found ${data.results.followers_found || 0} followers!`);
          if (data.results.followers && data.results.followers.length > 0) {
            console.log('Sample followers:');
            data.results.followers.slice(0, 5).forEach((follower, idx) => {
              console.log(`  ${idx + 1}. @${follower.username || follower}`);
            });
          }
          break;
        }
        
        if (data.status === 'failed') {
          console.log(`❌ Daytona scan failed: ${data.error || 'Unknown error'}`);
          break;
        }
        
      } else {
        console.log(`⚠️ Daytona status check failed: ${response.status}`);
      }
      
    } catch (error) {
      console.log(`❌ Daytona monitoring error: ${error.message}`);
    }
  }
}

async function runCompleteTest() {
  console.log('🎯 Starting Complete OAuth + Scanning System Test');
  console.log('Time:', new Date().toISOString());
  console.log('=' .repeat(60));
  
  // Test 1: Complete OAuth flow
  await testCompleteOAuthFlow();
  
  // Test 2: Direct Daytona flow
  await testDirectDaytonaFlow();
  
  console.log('\n🏆 Test Summary:');
  console.log('- OAuth initialization: Tested');
  console.log('- OAuth status check: Tested');
  console.log('- Scalable scanning: Tested');
  console.log('- Daytona scanning: Tested');
  console.log('- Progress monitoring: Tested');
  
  console.log('\n💡 If tests pass:');
  console.log('1. OAuth flow is working');
  console.log('2. Scanning system is operational');
  console.log('3. Real follower extraction should work');
}

// Run complete test
runCompleteTest().catch(console.error);
