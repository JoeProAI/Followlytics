const { Daytona } = require('@daytonaio/sdk');

async function testDaytona() {
  console.log('🧪 Testing Daytona SDK methods...');
  
  try {
    const daytona = new Daytona({
      apiKey: process.env.DAYTONA_API_KEY,
      apiUrl: process.env.DAYTONA_API_URL || 'https://app.daytona.io/api',
      target: process.env.DAYTONA_TARGET || 'us'
    });

    console.log('✅ Daytona SDK initialized');
    
    // Create sandbox
    const sandbox = await daytona.create({
      language: 'typescript'
    });
    
    console.log('✅ Sandbox created:', sandbox.id);
    console.log('🔍 Sandbox keys:', Object.keys(sandbox));
    
    // Check process object
    console.log('🔍 Process object keys:', Object.keys(sandbox.process));
    console.log('🔍 Process object methods:');
    for (const key of Object.keys(sandbox.process)) {
      console.log(`  - ${key}: ${typeof sandbox.process[key]}`);
    }
    
    // Check fs object
    console.log('🔍 FS object keys:', Object.keys(sandbox.fs));
    console.log('🔍 FS object methods:');
    for (const key of Object.keys(sandbox.fs)) {
      console.log(`  - ${key}: ${typeof sandbox.fs[key]}`);
    }
    
    // Try to find the right method
    if (typeof sandbox.process.executeCommand === 'function') {
      console.log('✅ Found executeCommand method');
      const result = await sandbox.process.executeCommand('echo "Hello World"');
      console.log('✅ Command result:', result);
    } else if (typeof sandbox.process.exec === 'function') {
      console.log('✅ Found exec method');
      const result = await sandbox.process.exec('echo "Hello World"');
      console.log('✅ Command result:', result);
    } else if (typeof sandbox.process.code_run === 'function') {
      console.log('✅ Found code_run method');
      const result = await sandbox.process.code_run('echo "Hello World"');
      console.log('✅ Command result:', result);
    } else if (typeof sandbox.process.run === 'function') {
      console.log('✅ Found run method');
      const result = await sandbox.process.run('echo "Hello World"');
      console.log('✅ Command result:', result);
    } else {
      console.log('❌ No known command execution method found');
    }
    
    // Cleanup
    await sandbox.delete();
    console.log('✅ Sandbox cleaned up');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testDaytona();
