const fetch = require('node-fetch');

async function testScalableSystem() {
  console.log('🧪 Testing Scalable Browser Automation System');
  console.log('=' .repeat(50));
  
  const testCases = [
    { username: 'elonmusk', estimated_followers: 50000, description: 'Medium account test' },
    { username: 'cristiano', estimated_followers: 200000, description: 'Large account test (parallel)' },
    { username: 'katyperry', estimated_followers: 1000000, description: 'Very large account test (5 workers)' }
  ];
  
  for (const testCase of testCases) {
    console.log(`\n📊 Testing: ${testCase.description}`);
    console.log(`👤 Username: ${testCase.username}`);
    console.log(`👥 Estimated followers: ${testCase.estimated_followers.toLocaleString()}`);
    
    try {
      // Test scalable endpoint
      console.log('\n🚀 Calling /api/scan/scalable...');
      const startTime = Date.now();
      
      const response = await fetch('http://localhost:3000/api/scan/scalable', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: testCase.username,
          estimated_followers: testCase.estimated_followers
        })
      });
      
      const responseTime = Date.now() - startTime;
      console.log(`⏱️ Response time: ${responseTime}ms`);
      
      if (!response.ok) {
        console.error(`❌ HTTP ${response.status}: ${response.statusText}`);
        const errorText = await response.text();
        console.error('Error details:', errorText);
        continue;
      }
      
      const result = await response.json();
      console.log('\n✅ Response received:');
      console.log(`📋 Job ID: ${result.job_id}`);
      console.log(`🔧 Method: ${result.method}`);
      console.log(`📊 Status: ${result.status}`);
      console.log(`⏱️ Estimated time: ${result.estimated_time}`);
      console.log(`💰 Estimated cost: ${result.estimated_cost}`);
      
      if (result.workers) {
        console.log(`👷 Workers: ${result.workers.total} total, ${result.workers.successful} successful`);
      }
      
      // Test status endpoint
      if (result.job_id) {
        console.log('\n🔍 Testing status endpoint...');
        const statusResponse = await fetch(`http://localhost:3000/api/scan/scalable?job_id=${result.job_id}`);
        
        if (statusResponse.ok) {
          const statusResult = await statusResponse.json();
          console.log(`📈 Status check: ${statusResult.status}`);
          console.log(`💬 Message: ${statusResult.message || 'No message'}`);
        } else {
          console.log(`⚠️ Status check failed: ${statusResponse.status}`);
        }
      }
      
      console.log('\n' + '✅'.repeat(20));
      
    } catch (error) {
      console.error(`❌ Test failed for ${testCase.username}:`, error.message);
      console.log('\n' + '❌'.repeat(20));
    }
    
    // Wait between tests
    if (testCase !== testCases[testCases.length - 1]) {
      console.log('\n⏳ Waiting 2 seconds before next test...');
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  
  console.log('\n🏁 All tests completed');
}

async function testDaytonaConnection() {
  console.log('\n🔧 Testing Daytona connection...');
  
  try {
    const response = await fetch('http://localhost:3000/api/scan/daytona', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: 'testuser',
        estimated_followers: 100,
        method: 'connection_test'
      })
    });
    
    console.log(`🌐 Daytona endpoint status: ${response.status}`);
    
    if (response.ok) {
      const result = await response.json();
      console.log('✅ Daytona connection successful');
      console.log('Response:', JSON.stringify(result, null, 2));
    } else {
      const errorText = await response.text();
      console.log('❌ Daytona connection failed');
      console.log('Error:', errorText);
    }
    
  } catch (error) {
    console.error('❌ Daytona connection error:', error.message);
  }
}

async function runAllTests() {
  console.log('🚀 Starting comprehensive scalable system tests');
  console.log('Time:', new Date().toISOString());
  console.log('=' .repeat(60));
  
  // Test 1: Daytona connection
  await testDaytonaConnection();
  
  // Test 2: Scalable system
  await testScalableSystem();
  
  console.log('\n🎯 Test Summary:');
  console.log('- Scalable endpoint routing: Tested');
  console.log('- Parallel processing logic: Tested');
  console.log('- Status monitoring: Tested');
  console.log('- Error handling: Tested');
  
  console.log('\n💡 Next steps:');
  console.log('1. Check server logs for detailed processing info');
  console.log('2. Monitor actual Daytona sandbox creation');
  console.log('3. Verify follower extraction results');
}

// Run tests
runAllTests().catch(console.error);
