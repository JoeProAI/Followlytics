// Test the file upload process to see where it's failing
const { Daytona } = require('@daytonaio/sdk');

const daytona = new Daytona({
  apiKey: process.env.DAYTONA_API_KEY || 'dtn_30f485a820500d1c393ac4bfcac84be84ce23f87d79b5ba5a8e20f364d4ba567'
});

async function testFileUpload() {
  let sandbox = null;
  
  try {
    console.log('🚀 Testing file upload process...');
    
    // Step 1: Create sandbox
    console.log('1️⃣ Creating sandbox...');
    sandbox = await daytona.create({
      language: 'javascript'
    });
    console.log(`✅ Sandbox created: ${sandbox.id}`);
    
    // Step 2: Wait for sandbox to be ready
    console.log('2️⃣ Waiting for sandbox to be ready...');
    await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10 seconds
    
    // Step 3: Test creating directory
    console.log('3️⃣ Creating scanner directory...');
    try {
      await sandbox.fs.createFolder('scanner', '755');
      console.log('✅ Directory created successfully');
    } catch (dirError) {
      console.log('❌ Directory creation failed:', dirError.message);
      return;
    }
    
    // Step 4: Create a minimal test script
    console.log('4️⃣ Creating minimal test script...');
    const testScript = `
console.log('🚀 Minimal test script starting...');
console.log('Testing sandbox execution...');

// Simple test that completes quickly
setTimeout(() => {
  console.log('✅ Test completed successfully!');
  process.exit(0);
}, 2000);
`;
    
    console.log(`📄 Script size: ${testScript.length} bytes`);
    
    // Step 5: Upload the script
    console.log('5️⃣ Uploading test script...');
    try {
      const scriptBuffer = Buffer.from(testScript, 'utf8');
      await sandbox.fs.uploadFile(scriptBuffer, 'scanner/test-script.js');
      console.log('✅ File uploaded successfully');
    } catch (uploadError) {
      console.log('❌ File upload failed:', uploadError.message);
      
      // Try alternative method using command
      console.log('🔄 Trying alternative upload method...');
      const base64Script = Buffer.from(testScript).toString('base64');
      const cmdResult = await sandbox.process.executeCommand(`mkdir -p scanner && echo '${base64Script}' | base64 -d > scanner/test-script.js`);
      console.log('📋 Command upload result:', cmdResult.exitCode === 0 ? 'Success' : 'Failed');
      
      if (cmdResult.exitCode !== 0) {
        console.log('❌ Alternative upload also failed:', cmdResult.result);
        return;
      }
    }
    
    // Step 6: Verify file exists
    console.log('6️⃣ Verifying file exists...');
    const listResult = await sandbox.process.executeCommand('ls -la scanner/');
    console.log('📁 Directory contents:', listResult.result);
    
    // Step 7: Check file content
    console.log('7️⃣ Checking file content...');
    const catResult = await sandbox.process.executeCommand('cat scanner/test-script.js');
    console.log('📄 File content preview:', catResult.result.substring(0, 200) + '...');
    
    // Step 8: Test JavaScript syntax
    console.log('8️⃣ Testing JavaScript syntax...');
    const syntaxResult = await sandbox.process.executeCommand('node -c scanner/test-script.js');
    console.log('🔍 Syntax check result:', syntaxResult.exitCode === 0 ? 'Valid' : 'Invalid');
    
    if (syntaxResult.exitCode !== 0) {
      console.log('❌ Syntax error:', syntaxResult.result);
      
      // Try to identify the issue
      console.log('🔍 Analyzing syntax issue...');
      const headResult = await sandbox.process.executeCommand('head -10 scanner/test-script.js');
      console.log('📄 First 10 lines:', headResult.result);
      
      const tailResult = await sandbox.process.executeCommand('tail -10 scanner/test-script.js');
      console.log('📄 Last 10 lines:', tailResult.result);
    } else {
      // Step 9: Execute the script
      console.log('9️⃣ Executing test script...');
      const execResult = await sandbox.process.executeCommand('cd scanner && node test-script.js');
      console.log('🎯 Execution result:', execResult);
      
      if (execResult.exitCode === 0) {
        console.log('✅ SUCCESS: Complete file upload and execution test passed!');
      } else {
        console.log('❌ FAILED: Script execution failed');
        console.log('Error output:', execResult.result);
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

testFileUpload().catch(console.error);
