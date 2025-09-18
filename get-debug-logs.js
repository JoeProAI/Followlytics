// Get debug logs from the extraction
const { Daytona } = require('@daytonaio/sdk');

const sandboxId = '042ade46-2e19-47c1-b96b-730c64ce0208';

async function getDebugLogs() {
  try {
    console.log('📋 Getting debug logs from sandbox:', sandboxId);
    
    const daytona = new Daytona({
      apiKey: process.env.DAYTONA_API_KEY || 'dtn_30f485a820500d1c393ac4bfcac84be84ce23f87d79b5ba5a8e20f364d4ba567',
      apiUrl: process.env.DAYTONA_API_URL || 'https://app.daytona.io/api'
    });

    const sandbox = await daytona.get(sandboxId);
    
    if (!sandbox) {
      console.log('❌ Sandbox not found');
      return;
    }
    
    console.log('✅ Connected to sandbox');
    
    // Get extraction log
    console.log('\n📄 EXTRACTION LOG:');
    const logResponse = await sandbox.process.executeCommand('cat /tmp/extraction.log 2>/dev/null || echo "no_log"');
    const logContent = logResponse.result || '';
    
    if (logContent !== 'no_log') {
      console.log(logContent);
    } else {
      console.log('❌ No extraction log found');
    }
    
    // Get any other relevant logs
    console.log('\n📄 CHECKING FOR OTHER LOGS:');
    const otherLogs = await sandbox.process.executeCommand('ls -la /tmp/*.log /tmp/*.txt 2>/dev/null || echo "no_other_logs"');
    const otherLogsContent = otherLogs.result || '';
    
    if (otherLogsContent !== 'no_other_logs') {
      console.log('Found other log files:');
      console.log(otherLogsContent);
    }
    
    // Check the results file for debug info
    console.log('\n📊 RESULTS FILE CONTENT:');
    const resultResponse = await sandbox.process.executeCommand('cat /tmp/followers_result.json 2>/dev/null || echo "no_results"');
    const resultContent = resultResponse.result || '';
    
    if (resultContent !== 'no_results') {
      try {
        const results = JSON.parse(resultContent);
        console.log(JSON.stringify(results, null, 2));
      } catch (e) {
        console.log('Raw results content:');
        console.log(resultContent);
      }
    } else {
      console.log('❌ No results file found');
    }
    
  } catch (error) {
    console.error('❌ Failed to get debug logs:', error.message);
  }
}

getDebugLogs();
