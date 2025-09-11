const fetch = require('node-fetch');

async function debugFollowerExtraction() {
  console.log('🔍 Debugging Follower Extraction');
  console.log('=' .repeat(50));
  
  try {
    // Start a real extraction
    console.log('🚀 Starting follower extraction for small account...');
    const response = await fetch('http://localhost:3000/api/scan/daytona', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: 'elonmusk',
        estimated_followers: 1000,
        method: 'debug_extraction'
      })
    });
    
    if (!response.ok) {
      console.error(`❌ HTTP ${response.status}: ${response.statusText}`);
      const errorText = await response.text();
      console.error('Error details:', errorText);
      return;
    }
    
    const result = await response.json();
    console.log('\n✅ Job started:');
    console.log(`📋 Job ID: ${result.job_id}`);
    console.log(`📊 Status: ${result.status}`);
    
    // Monitor the job for actual results
    if (result.job_id) {
      console.log('\n🔍 Monitoring job progress...');
      
      for (let i = 0; i < 20; i++) { // Check for 2 minutes
        await new Promise(resolve => setTimeout(resolve, 6000)); // Wait 6 seconds
        
        const statusResponse = await fetch(`http://localhost:3000/api/scan/daytona?job_id=${result.job_id}`);
        
        if (statusResponse.ok) {
          const statusResult = await statusResponse.json();
          console.log(`\n📈 Check ${i + 1}: ${statusResult.status}`);
          console.log(`💬 Message: ${statusResult.message || 'No message'}`);
          
          if (statusResult.progress) {
            console.log(`📊 Progress: ${statusResult.progress}%`);
          }
          
          if (statusResult.followers_extracted) {
            console.log(`👥 Followers extracted: ${statusResult.followers_extracted}`);
          }
          
          if (statusResult.results && statusResult.results.followers) {
            console.log(`🎯 ACTUAL FOLLOWERS FOUND: ${statusResult.results.followers.length}`);
            console.log('First 5 followers:');
            statusResult.results.followers.slice(0, 5).forEach((follower, idx) => {
              console.log(`  ${idx + 1}. @${follower.username || follower}`);
            });
            break;
          }
          
          if (statusResult.status === 'completed' || statusResult.status === 'failed') {
            console.log(`\n🏁 Job ${statusResult.status}`);
            if (statusResult.error) {
              console.log(`❌ Error: ${statusResult.error}`);
            }
            break;
          }
          
        } else {
          console.log(`⚠️ Status check failed: ${statusResponse.status}`);
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Debug extraction failed:', error.message);
  }
}

async function checkDaytonaLogs() {
  console.log('\n📋 Checking recent Daytona jobs...');
  
  try {
    // Get recent job status
    const response = await fetch('http://localhost:3000/api/scan/daytona?action=list_recent');
    
    if (response.ok) {
      const result = await response.json();
      console.log('Recent jobs:', JSON.stringify(result, null, 2));
    } else {
      console.log('No recent jobs endpoint available');
    }
    
  } catch (error) {
    console.log('Could not check recent jobs:', error.message);
  }
}

async function testDirectBrowserExtraction() {
  console.log('\n🌐 Testing direct browser extraction...');
  
  try {
    const response = await fetch('http://localhost:3000/api/scan/daytona', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: 'testuser',
        estimated_followers: 100,
        method: 'direct_browser_test',
        debug: true
      })
    });
    
    const result = await response.json();
    console.log('Direct test result:', JSON.stringify(result, null, 2));
    
  } catch (error) {
    console.error('Direct test failed:', error.message);
  }
}

async function runDebug() {
  console.log('🚀 Starting follower extraction debugging');
  console.log('Time:', new Date().toISOString());
  console.log('=' .repeat(60));
  
  // Test 1: Check recent jobs
  await checkDaytonaLogs();
  
  // Test 2: Direct browser test
  await testDirectBrowserExtraction();
  
  // Test 3: Full extraction debug
  await debugFollowerExtraction();
  
  console.log('\n🎯 Debug Summary:');
  console.log('- Job creation: Tested');
  console.log('- Status monitoring: Tested');
  console.log('- Follower extraction: Monitored');
  console.log('- Results verification: Checked');
}

// Run debug
runDebug().catch(console.error);
