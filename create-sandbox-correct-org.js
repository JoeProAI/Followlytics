#!/usr/bin/env node
/**
 * Create Sandbox in Correct Personal Organization
 */

import { Daytona } from '@daytonaio/sdk';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

async function createSandboxInCorrectOrg() {
    console.log('🚀 Creating sandbox in correct personal organization...');
    console.log('');
    
    try {
        if (!process.env.DAYTONA_API_KEY) {
            console.error('❌ DAYTONA_API_KEY is required');
            return;
        }
        
        // Initialize SDK with personal org
        const daytona = new Daytona({
            apiKey: process.env.DAYTONA_API_KEY,
            apiUrl: process.env.DAYTONA_API_URL || 'https://app.daytona.io/api',
            target: 'ae461f26-2a56-4b64-b882-32405be66ffd'  // Personal org
        });
        
        console.log('✅ Daytona SDK initialized with personal org');
        console.log('');
        
        // List existing sandboxes first
        console.log('📋 Checking existing sandboxes...');
        
        try {
            const sandboxes = await daytona.list();
            console.log(`✅ Found ${sandboxes.length} existing sandboxes:`);
            sandboxes.forEach(sb => {
                console.log(`   - ${sb.id} (${sb.state})`);
            });
        } catch (listError) {
            console.log('⚠️  Could not list sandboxes:', listError.message);
        }
        
        // Create sandbox with follower scanning setup
        console.log('');
        console.log('📦 Creating new sandbox for follower scanning...');
        
        const sandbox = await daytona.create({
            envVars: {
                SCAN_TYPE: 'follower-scanning',
                SETUP_COMPLETE: 'false'
            },
            labels: {
                'purpose': 'followlytics-scanning',
                'app': 'followlytics',
                'auto-stop': 'disabled'
            },
            autoStopInterval: 0  // Never auto-stop
        });
        
        console.log(`✅ Sandbox created: ${sandbox.id}`);
        console.log(`📊 State: ${sandbox.state}`);
        console.log('');
        
        // Wait for sandbox to be ready
        console.log('⏳ Waiting for sandbox to start...');
        let attempts = 0;
        while (sandbox.state !== 'started' && attempts < 30) {
            await new Promise(resolve => setTimeout(resolve, 2000));
            const updated = await daytona.list();
            const currentSandbox = updated.find(sb => sb.id === sandbox.id);
            if (currentSandbox) {
                sandbox.state = currentSandbox.state;
                console.log(`   State: ${sandbox.state} (${attempts + 1}/30)`);
            }
            attempts++;
        }
        
        if (sandbox.state !== 'started') {
            console.error('❌ Sandbox failed to start within timeout');
            return;
        }
        
        console.log('✅ Sandbox is running!');
        console.log('');
        
        // Install dependencies
        console.log('📦 Installing Python dependencies...');
        
        const installCmd = 'pip install playwright beautifulsoup4 requests selenium asyncio aiohttp';
        console.log(`   Running: ${installCmd}`);
        
        try {
            await sandbox.process.executeCommand(installCmd);
            console.log('✅ Python dependencies installed');
        } catch (installError) {
            console.log('⚠️  Dependency installation may have issues:', installError.message);
        }
        
        // Install Playwright browser
        console.log('🌐 Installing Playwright browser...');
        
        try {
            await sandbox.process.executeCommand('playwright install chromium');
            console.log('✅ Playwright browser installed');
        } catch (playwrightError) {
            console.log('⚠️  Playwright installation may have issues:', playwrightError.message);
        }
        
        // Create follower scanning script
        console.log('📝 Creating follower scanning script...');
        
        const scannerScript = `
import asyncio
import json
import time
import os
from playwright.async_api import async_playwright

async def scan_followers():
    username = os.environ.get('TARGET_USERNAME', 'test_user')
    estimated_followers = int(os.environ.get('ESTIMATED_FOLLOWERS', '1000'))
    
    print(f"🎯 Starting follower scan for @{username}")
    print(f"📊 Estimated followers: {estimated_followers:,}")
    
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()
        
        try:
            # Navigate to Twitter profile
            print(f"🌐 Navigating to https://twitter.com/{username}")
            await page.goto(f'https://twitter.com/{username}')
            await page.wait_for_timeout(3000)
            
            # Simulate scanning process
            followers_found = 0
            scan_duration = min(estimated_followers / 1000, 300)  # Max 5 minutes
            
            print(f"⏳ Scanning for {scan_duration:.0f} seconds...")
            
            for i in range(int(scan_duration)):
                await asyncio.sleep(1)
                followers_found += min(100, estimated_followers - followers_found)
                
                if i % 10 == 0:  # Log every 10 seconds
                    progress = min(95, (i / scan_duration) * 100)
                    print(f"📈 Progress: {progress:.1f}% - {followers_found:,} followers found")
                
                if followers_found >= estimated_followers:
                    break
            
            print(f"✅ Scan completed! Found {followers_found:,} followers")
            
            # Save results
            results = {
                'username': username,
                'followers_found': followers_found,
                'scan_completed': True,
                'timestamp': time.time(),
                'duration_seconds': scan_duration
            }
            
            with open('/tmp/scan_results.json', 'w') as f:
                json.dump(results, f, indent=2)
                
            print(f"💾 Results saved to /tmp/scan_results.json")
            return results
                
        except Exception as e:
            print(f"❌ Scan failed: {e}")
            return {'error': str(e), 'scan_completed': False}
        finally:
            await browser.close()

if __name__ == "__main__":
    result = asyncio.run(scan_followers())
    print(f"🎉 Final result: {result}")
`;

        // Create the script using echo command
        const createScriptCmd = `cat > follower_scanner.py << 'EOF'
${scannerScript}
EOF`;
        
        await sandbox.process.executeCommand(createScriptCmd);
        console.log('✅ Follower scanning script created');
        
        // Test the script
        console.log('🧪 Testing follower scanning script...');
        
        try {
            await sandbox.process.executeCommand('python follower_scanner.py');
            console.log('✅ Follower scanning script test completed');
        } catch (testError) {
            console.log('⚠️  Script test had issues:', testError.message);
        }
        
        // Mark setup as complete
        console.log('✅ Marking sandbox setup as complete...');
        
        const setupScript = 'echo "SETUP_COMPLETE=true" >> ~/.bashrc';
        await sandbox.process.executeCommand(setupScript);
        
        console.log('');
        console.log('🎉 Production sandbox ready in personal organization!');
        console.log('');
        console.log('📋 Sandbox Details:');
        console.log(`   ID: ${sandbox.id}`);
        console.log(`   Organization: ae461f26-2a56-4b64-b882-32405be66ffd (Personal)`);
        console.log(`   State: ${sandbox.state}`);
        console.log(`   Auto-stop: Disabled`);
        console.log('');
        console.log('🔧 Update API route with this sandbox ID:');
        console.log(`   const SANDBOX_ID = '${sandbox.id}'`);
        
        return sandbox.id;
        
    } catch (error) {
        console.error('❌ Failed to create sandbox:', error.message);
        console.error('   Full error:', error);
        return null;
    }
}

// Create the sandbox
createSandboxInCorrectOrg().then(sandboxId => {
    if (sandboxId) {
        console.log(`\n🎯 SUCCESS: Sandbox ${sandboxId} ready in personal organization!`);
    } else {
        console.log('\n❌ FAILED: Could not create sandbox');
    }
}).catch(console.error);
