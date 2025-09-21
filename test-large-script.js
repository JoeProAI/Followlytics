// Test with a larger script to find the size limit
const { Daytona } = require('@daytonaio/sdk');

const daytona = new Daytona({
  apiKey: process.env.DAYTONA_API_KEY || 'dtn_30f485a820500d1c393ac4bfcac84be84ce23f87d79b5ba5a8e20f364d4ba567'
});

async function testLargeScript() {
  let sandbox = null;
  
  try {
    console.log('🚀 Testing large script upload...');
    
    // Create sandbox
    sandbox = await daytona.create({ language: 'javascript' });
    console.log(`✅ Sandbox created: ${sandbox.id}`);
    
    await new Promise(resolve => setTimeout(resolve, 10000));
    
    // Create directory
    await sandbox.fs.createFolder('scanner', '755');
    
    // Test different script sizes
    const sizes = [1000, 5000, 10000, 20000, 25000, 30000];
    
    for (const size of sizes) {
      console.log(`\n📏 Testing script size: ${size} bytes`);
      
      // Create a script of specific size
      let testScript = `
console.log('🚀 Large test script starting...');
console.log('Script size: ${size} bytes');

// Padding to reach target size
`;
      
      // Add padding comments to reach target size
      const padding = '// '.repeat(Math.max(0, Math.floor((size - testScript.length) / 3)));
      testScript += padding;
      
      // Add ending
      testScript += `
setTimeout(() => {
  console.log('✅ Large script completed successfully!');
  process.exit(0);
}, 1000);
`;
      
      console.log(`📄 Actual script size: ${testScript.length} bytes`);
      
      try {
        // Upload the script
        const scriptBuffer = Buffer.from(testScript, 'utf8');
        await sandbox.fs.uploadFile(scriptBuffer, `scanner/large-script-${size}.js`);
        
        // Test syntax
        const syntaxResult = await sandbox.process.executeCommand(`node -c scanner/large-script-${size}.js`);
        
        if (syntaxResult.exitCode === 0) {
          console.log(`✅ Size ${size}: Upload and syntax check successful`);
          
          // Test execution
          const execResult = await sandbox.process.executeCommand(`cd scanner && timeout 10 node large-script-${size}.js`);
          if (execResult.exitCode === 0) {
            console.log(`✅ Size ${size}: Execution successful`);
          } else {
            console.log(`⚠️ Size ${size}: Execution failed - ${execResult.result}`);
          }
        } else {
          console.log(`❌ Size ${size}: Syntax check failed - ${syntaxResult.result}`);
          break;
        }
        
      } catch (error) {
        console.log(`❌ Size ${size}: Upload failed - ${error.message}`);
        break;
      }
    }
    
    // Test the actual problematic script size (22,276 bytes)
    console.log(`\n🎯 Testing actual problematic size: 22276 bytes`);
    
    // Create a script similar to the actual one but minimal
    const actualSizeScript = `
console.log('🚀 Actual size test script starting...');

// This simulates the size of the actual interactive scanner script
const { chromium } = require('playwright');

async function takeScreenshot(page, step, description) {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = \`/tmp/screenshot_\${step}_\${timestamp}.png\`;
    await page.screenshot({ path: filename, fullPage: true });
    console.log(\`📸 Screenshot saved: \${step} - \${description}\`);
    return filename;
  } catch (error) {
    console.log(\`⚠️ Screenshot failed for \${step}: \${error.message}\`);
    return null;
  }
}

(async () => {
  try {
    console.log('🚀 Launching browser...');
    
    // Add lots of padding to reach 22KB
    ${'// '.repeat(7000)}
    
    console.log('✅ Large script simulation completed!');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
})();
`;
    
    console.log(`📄 Simulated script size: ${actualSizeScript.length} bytes`);
    
    try {
      const scriptBuffer = Buffer.from(actualSizeScript, 'utf8');
      await sandbox.fs.uploadFile(scriptBuffer, 'scanner/actual-size-test.js');
      
      const syntaxResult = await sandbox.process.executeCommand('node -c scanner/actual-size-test.js');
      console.log(`🔍 22KB script syntax check: ${syntaxResult.exitCode === 0 ? 'Valid' : 'Invalid'}`);
      
      if (syntaxResult.exitCode !== 0) {
        console.log('❌ Syntax error:', syntaxResult.result);
      }
      
    } catch (error) {
      console.log(`❌ 22KB script upload failed: ${error.message}`);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    if (sandbox) {
      try {
        await sandbox.delete();
        console.log('✅ Sandbox deleted');
      } catch (cleanupError) {
        console.error('❌ Cleanup failed:', cleanupError.message);
      }
    }
  }
}

testLargeScript().catch(console.error);
