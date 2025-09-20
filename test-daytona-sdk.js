const { Daytona } = require('@daytonaio/sdk');

async function testDaytonaSDK() {
  console.log('🔍 Testing Daytona SDK...');
  
  try {
    // Initialize Daytona client
    const daytona = new Daytona({
      apiKey: process.env.DAYTONA_API_KEY || 'dtn_30f485a820500d1c393ac4bfcac84be84ce23f87d79b5ba5a8e20f364d4ba567',
      apiUrl: process.env.DAYTONA_API_URL || 'https://app.daytona.io/api'
    });
    
    console.log('✅ Daytona client initialized');
    console.log('📊 Configuration:');
    console.log('  - API Key:', process.env.DAYTONA_API_KEY ? 'Present' : 'Using hardcoded');
    console.log('  - API URL:', process.env.DAYTONA_API_URL || 'https://app.daytona.io/api');
    
    // Test 1: List existing sandboxes
    console.log('\n🔍 Test 1: Listing sandboxes...');
    try {
      const sandboxes = await daytona.list();
      console.log(`✅ Found ${sandboxes.length} sandboxes`);
      
      if (sandboxes.length > 0) {
        console.log('📋 Existing sandboxes:');
        sandboxes.forEach((sb, i) => {
          console.log(`  ${i + 1}. ID: ${sb.id}, State: ${sb.state}, Created: ${sb.createdAt}`);
        });
      }
    } catch (listError) {
      console.error('❌ Failed to list sandboxes:', listError);
      console.error('Error details:', {
        message: listError.message,
        statusCode: listError.statusCode,
        stack: listError.stack?.split('\n')[0]
      });
    }
    
    // Test 2: Try to create a simple sandbox
    console.log('\n🔍 Test 2: Creating test sandbox...');
    try {
      const newSandbox = await daytona.create({
        language: 'javascript'
      });
      console.log(`✅ Created sandbox: ${newSandbox.id}`);
      console.log(`📊 State: ${newSandbox.state}`);
      
      // Clean up - delete the test sandbox
      console.log('🧹 Cleaning up test sandbox...');
      await daytona.delete(newSandbox.id);
      console.log('✅ Test sandbox deleted');
      
    } catch (createError) {
      console.error('❌ Failed to create sandbox:', createError);
      console.error('Error details:', {
        message: createError.message,
        statusCode: createError.statusCode,
        response: createError.response?.data || 'No response data'
      });
    }
    
  } catch (initError) {
    console.error('❌ Failed to initialize Daytona SDK:', initError);
    console.error('Error details:', {
      message: initError.message,
      statusCode: initError.statusCode
    });
  }
}

// Run the test
testDaytonaSDK().catch(console.error);
