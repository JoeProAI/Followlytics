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
    
    // Test file system operations
    console.log('🧪 Testing file system operations...');
    
    // Try different folder creation methods
    const testMethods = [
      'create_folder',
      'createFolder', 
      'mkdir',
      'createDirectory',
      'createDir'
    ];
    
    for (const method of testMethods) {
      if (typeof sandbox.fs[method] === 'function') {
        console.log(`✅ Found FS method: ${method}`);
        try {
          await sandbox.fs[method]('test-dir', '755');
          console.log(`✅ ${method} worked!`);
          break;
        } catch (err) {
          console.log(`❌ ${method} failed:`, err.message);
        }
      }
    }
    
    // Try file upload methods
    const uploadMethods = [
      'upload_file',
      'uploadFile',
      'writeFile',
      'createFile'
    ];
    
    for (const method of uploadMethods) {
      if (typeof sandbox.fs[method] === 'function') {
        console.log(`✅ Found upload method: ${method}`);
        try {
          const testContent = Buffer.from('Hello World', 'utf8');
          await sandbox.fs[method](testContent, 'test-file.txt');
          console.log(`✅ ${method} worked!`);
          break;
        } catch (err) {
          console.log(`❌ ${method} failed:`, err.message);
        }
      }
    }
    
    // Test other file operations
    const otherMethods = [
      'listFiles',
      'list_files',
      'getFileInfo', 
      'get_file_info',
      'stat',
      'getStats',
      'fileInfo'
    ];
    
    for (const method of otherMethods) {
      if (typeof sandbox.fs[method] === 'function') {
        console.log(`✅ Found method: ${method}`);
      }
    }
    
    // Test listFiles method
    try {
      console.log('🧪 Testing listFiles...');
      const files = await sandbox.fs.listFiles('.');
      console.log('✅ listFiles result:', files.slice(0, 3)); // Show first 3 files
    } catch (err) {
      console.log('❌ listFiles failed:', err.message);
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
