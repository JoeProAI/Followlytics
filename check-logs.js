// Check extraction logs and process status
const { Daytona } = require('@daytonaio/sdk');

const sandboxId = '52917708-d2f8-44dc-9995-24b4e3b12663';

async function checkLogs() {
  try {
    console.log('🔍 Checking extraction logs and process status...');
    
    const daytona = new Daytona({
      apiKey: process.env.DAYTONA_API_KEY || 'dtn_30f485a820500d1c393ac4bfcac84be84ce23f87d79b5ba5a8e20f364d4ba567',
      apiUrl: process.env.DAYTONA_API_URL || 'https://app.daytona.io/api'
    });

    const sandbox = await daytona.get(sandboxId);
    
    console.log('📋 Checking extraction log...');
    const logResponse = await sandbox.process.executeCommand('cat /tmp/extraction.log 2>/dev/null || echo "no_extraction_log"');
    const logContent = logResponse.result || '';
    
    if (logContent !== 'no_extraction_log') {
      console.log('📄 Extraction Log:');
      console.log(logContent);
    } else {
      console.log('❌ No extraction log found');
    }
    
    console.log('\n🔍 Checking if extraction process is running...');
    const processCheck = await sandbox.process.executeCommand('ps aux | grep -E "(node|simple_scroll)" | grep -v grep || echo "no_processes"');
    const processStatus = processCheck.result || '';
    
    if (processStatus !== 'no_processes') {
      console.log('⏳ Running processes:');
      console.log(processStatus);
    } else {
      console.log('❌ No extraction processes running');
    }
    
    console.log('\n📁 Checking /tmp directory contents...');
    const dirCheck = await sandbox.process.executeCommand('ls -la /tmp/ | grep -E "(simple_scroll|followers|extraction)" || echo "no_files"');
    const dirContent = dirCheck.result || '';
    
    if (dirContent !== 'no_files') {
      console.log('📂 Relevant files in /tmp:');
      console.log(dirContent);
    } else {
      console.log('❌ No relevant files found in /tmp');
    }
    
    console.log('\n🔍 Checking if simple_scroll.js exists and trying to run it manually...');
    const fileCheck = await sandbox.process.executeCommand('ls -la /tmp/simple_scroll.js 2>/dev/null || echo "file_not_found"');
    const fileExists = fileCheck.result || '';
    
    if (fileExists !== 'file_not_found') {
      console.log('✅ simple_scroll.js exists');
      console.log('📄 File info:', fileExists);
      
      console.log('\n🚀 Trying to run extraction manually...');
      const manualRun = await sandbox.process.executeCommand('cd /tmp && timeout 30s node simple_scroll.js || echo "manual_run_completed"');
      const manualResult = manualRun.result || '';
      console.log('📊 Manual run output:');
      console.log(manualResult);
      
    } else {
      console.log('❌ simple_scroll.js not found');
    }
    
  } catch (error) {
    console.error('❌ Failed to check logs:', error.message);
  }
}

checkLogs();
