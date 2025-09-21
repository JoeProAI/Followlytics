// Test the current scan process to see where it's failing
const { Daytona } = require('@daytonaio/sdk');

const daytona = new Daytona({
  apiKey: process.env.DAYTONA_API_KEY || 'dtn_30f485a820500d1c393ac4bfcac84be84ce23f87d79b5ba5a8e20f364d4ba567'
});

async function testScanProcess() {
  let sandbox = null;
  
  try {
    console.log('🚀 Testing scan process...');
    
    // Step 1: Create sandbox
    console.log('1️⃣ Creating sandbox...');
    sandbox = await daytona.create({
      language: 'javascript'
    });
    console.log(`✅ Sandbox created: ${sandbox.id}`);
    
    // Step 2: Wait for sandbox to be ready
    console.log('2️⃣ Waiting for sandbox to be ready...');
    await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10 seconds
    
    // Step 3: Test basic commands
    console.log('3️⃣ Testing basic commands...');
    const testResult = await sandbox.process.executeCommand('echo "Hello World" && pwd && ls -la');
    console.log('📊 Test result:', testResult);
    
    // Step 4: Install dependencies
    console.log('4️⃣ Installing Node.js dependencies...');
    const npmResult = await sandbox.process.executeCommand('npm init -y');
    console.log('📦 NPM init result:', npmResult.exitCode === 0 ? 'Success' : 'Failed');
    
    if (npmResult.exitCode === 0) {
      console.log('5️⃣ Installing Playwright...');
      const playwrightResult = await sandbox.process.executeCommand('npm install playwright --save');
      console.log('🎭 Playwright install result:', playwrightResult.exitCode === 0 ? 'Success' : 'Failed');
      
      if (playwrightResult.exitCode === 0) {
        console.log('6️⃣ Installing Playwright browsers...');
        const browserResult = await sandbox.process.executeCommand('npx playwright install chromium');
        console.log('🌐 Browser install result:', browserResult.exitCode === 0 ? 'Success' : 'Failed');
        
        // Step 7: Create and upload minimal test script
        console.log('7️⃣ Creating minimal test script...');
        const testScript = `
console.log('🚀 Minimal test script starting...');
console.log('Testing Node.js execution...');

// Test basic functionality
setTimeout(() => {
  console.log('✅ Test completed successfully!');
  process.exit(0);
}, 2000);
`;
        
        console.log('8️⃣ Uploading test script...');
        const uploadResult = await sandbox.file.upload('test-script.js', testScript);
        console.log('📤 Upload result:', uploadResult ? 'Success' : 'Failed');
        
        // Step 8: Execute the script
        console.log('9️⃣ Executing test script...');
        const execResult = await sandbox.process.executeCommand('node test-script.js');
        console.log('🎯 Execution result:', execResult);
        
        if (execResult.exitCode === 0) {
          console.log('✅ SUCCESS: Full test process completed!');
        } else {
          console.log('❌ FAILED: Script execution failed');
          console.log('Error output:', execResult.result);
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Test process failed:', error.message);
    console.error('Full error:', error);
  } finally {
    // Cleanup
    if (sandbox) {
      try {
        console.log('🧹 Cleaning up sandbox...');
        await sandbox.delete();
        console.log('✅ Sandbox deleted');
      } catch (cleanupError) {
        console.error('❌ Cleanup failed:', cleanupError.message);
      }
    }
  }
}

testScanProcess().catch(console.error);
