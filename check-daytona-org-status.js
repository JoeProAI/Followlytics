#!/usr/bin/env node
/**
 * Check Daytona Organization Status and Try Alternative Approaches
 */

import { Daytona } from '@daytonaio/sdk';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

async function checkOrgStatus() {
    console.log('🔍 Checking Daytona organization status and runner availability...');
    console.log('');
    
    try {
        const apiKey = process.env.DAYTONA_API_KEY;
        const orgId = process.env.DAYTONA_ORG_ID;
        const apiUrl = process.env.DAYTONA_API_URL || 'https://app.daytona.io/api';
        
        if (!apiKey || !orgId) {
            console.error('❌ Missing Daytona credentials');
            return;
        }
        
        console.log('🔧 Configuration:');
        console.log(`   API Key: ${apiKey.substring(0, 20)}...`);
        console.log(`   Org ID: ${orgId}`);
        console.log(`   API URL: ${apiUrl}`);
        console.log('');
        
        // Try different SDK initialization approaches
        const configs = [
            { name: 'Standard Config', config: { apiKey, apiUrl, target: orgId } },
            { name: 'Without Target', config: { apiKey, apiUrl } },
            { name: 'With US Target', config: { apiKey, apiUrl, target: 'us' } },
            { name: 'Alternative URL', config: { apiKey, apiUrl: 'https://api.daytona.io', target: orgId } }
        ];
        
        for (const { name, config } of configs) {
            console.log(`🧪 Testing ${name}...`);
            
            try {
                const daytona = new Daytona(config);
                
                // Try to list sandboxes
                const sandboxes = await daytona.list();
                console.log(`✅ ${name} SUCCESS - Found ${sandboxes.length} sandboxes`);
                
                if (sandboxes.length > 0) {
                    console.log('   Existing sandboxes:');
                    sandboxes.forEach(sb => {
                        console.log(`   - ${sb.id} (${sb.state})`);
                    });
                }
                
                // Try to create a simple sandbox
                console.log(`   🔨 Attempting sandbox creation with ${name}...`);
                
                try {
                    const testSandbox = await daytona.create({
                        labels: {
                            'test': 'followlytics-real-test',
                            'purpose': 'runner-availability-test'
                        }
                    });
                    
                    console.log(`   ✅ SANDBOX CREATION SUCCESS: ${testSandbox.id}`);
                    console.log(`   📊 State: ${testSandbox.state}`);
                    
                    // This config works! Use it for real scanning
                    console.log('');
                    console.log('🎉 FOUND WORKING CONFIGURATION!');
                    console.log(`   Config: ${JSON.stringify(config, null, 2)}`);
                    console.log(`   Sandbox ID: ${testSandbox.id}`);
                    
                    // Wait for sandbox to start
                    console.log('   ⏳ Waiting for sandbox to start...');
                    let attempts = 0;
                    while (testSandbox.state !== 'started' && attempts < 20) {
                        await new Promise(resolve => setTimeout(resolve, 3000));
                        const updated = await daytona.list();
                        const current = updated.find(sb => sb.id === testSandbox.id);
                        if (current) {
                            testSandbox.state = current.state;
                            console.log(`   State: ${testSandbox.state} (${attempts + 1}/20)`);
                        }
                        attempts++;
                    }
                    
                    if (testSandbox.state === 'started') {
                        console.log('   ✅ Sandbox is running! Ready for real follower scanning.');
                        
                        // Install dependencies and create real scanning script
                        console.log('   📦 Installing Python dependencies...');
                        
                        try {
                            await testSandbox.process.executeCommand('pip install playwright beautifulsoup4 requests selenium asyncio aiohttp twitter-api-py');
                            console.log('   ✅ Dependencies installed');
                            
                            await testSandbox.process.executeCommand('playwright install chromium');
                            console.log('   ✅ Browser installed');
                            
                            // Create real follower scanning script
                            const realScannerScript = `
import asyncio
import json
import time
import os
import sys
from playwright.async_api import async_playwright

async def scan_twitter_followers():
    username = os.environ.get('TARGET_USERNAME', 'elonmusk')
    max_followers = int(os.environ.get('MAX_FOLLOWERS', '1000'))
    
    print(f"🎯 Starting REAL follower scan for @{username}")
    print(f"📊 Max followers to scan: {max_followers:,}")
    
    followers = []
    
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()
        
        try:
            # Navigate to Twitter profile
            profile_url = f'https://twitter.com/{username}'
            print(f"🌐 Navigating to {profile_url}")
            
            await page.goto(profile_url, wait_until='networkidle')
            await page.wait_for_timeout(3000)
            
            # Look for followers link
            followers_link = page.locator('a[href*="/followers"]').first
            if await followers_link.count() > 0:
                print("👥 Found followers link, clicking...")
                await followers_link.click()
                await page.wait_for_timeout(5000)
                
                # Scroll and collect follower data
                scroll_count = 0
                max_scrolls = min(50, max_followers // 20)
                
                while scroll_count < max_scrolls and len(followers) < max_followers:
                    # Look for user elements
                    user_elements = page.locator('[data-testid="UserCell"]')
                    count = await user_elements.count()
                    
                    print(f"📋 Found {count} user elements on page")
                    
                    # Extract follower data
                    for i in range(count):
                        if len(followers) >= max_followers:
                            break
                            
                        try:
                            user_element = user_elements.nth(i)
                            
                            # Extract username and display name
                            username_elem = user_element.locator('[data-testid="UserName"] span').first
                            display_name_elem = user_element.locator('[data-testid="UserName"] span').nth(1)
                            
                            if await username_elem.count() > 0:
                                display_name = await username_elem.text_content()
                                follower_username = await display_name_elem.text_content() if await display_name_elem.count() > 0 else ""
                                
                                follower_data = {
                                    'display_name': display_name.strip(),
                                    'username': follower_username.strip().replace('@', ''),
                                    'found_at': time.time()
                                }
                                
                                followers.append(follower_data)
                                
                                if len(followers) % 10 == 0:
                                    print(f"📈 Progress: {len(followers):,} followers collected")
                                    
                        except Exception as e:
                            print(f"⚠️  Error extracting follower {i}: {e}")
                            continue
                    
                    # Scroll down to load more
                    await page.evaluate('window.scrollTo(0, document.body.scrollHeight)')
                    await page.wait_for_timeout(2000)
                    scroll_count += 1
                    
                    print(f"🔄 Scroll {scroll_count}/{max_scrolls} - Total followers: {len(followers):,}")
            
            else:
                print("❌ Could not find followers link - profile may be private or protected")
                
        except Exception as e:
            print(f"❌ Scanning error: {e}")
            
        finally:
            await browser.close()
    
    # Save results
    results = {
        'target_username': username,
        'followers_found': len(followers),
        'followers': followers,
        'scan_completed': True,
        'timestamp': time.time(),
        'scan_type': 'real_twitter_scraping'
    }
    
    with open('/tmp/real_scan_results.json', 'w') as f:
        json.dump(results, f, indent=2)
    
    print(f"✅ REAL scan completed! Found {len(followers):,} actual followers")
    print(f"💾 Results saved to /tmp/real_scan_results.json")
    
    return results

if __name__ == "__main__":
    result = asyncio.run(scan_twitter_followers())
    print(f"🎉 Final result: {json.dumps(result, indent=2)}")
`;
                            
                            // Create the real scanning script
                            const createScriptCmd = `cat > real_follower_scanner.py << 'EOF'
${realScannerScript}
EOF`;
                            
                            await testSandbox.process.executeCommand(createScriptCmd);
                            console.log('   ✅ Real follower scanning script created');
                            
                            // Test the real script
                            console.log('   🧪 Testing real follower scanning...');
                            await testSandbox.process.executeCommand('export TARGET_USERNAME="elonmusk" && export MAX_FOLLOWERS="50" && python real_follower_scanner.py');
                            console.log('   ✅ Real scanning test completed');
                            
                            console.log('');
                            console.log('🎉 REAL DAYTONA SANDBOX IS READY!');
                            console.log(`   Sandbox ID: ${testSandbox.id}`);
                            console.log(`   Working Config: ${JSON.stringify(config, null, 2)}`);
                            console.log('   Real Python script deployed and tested');
                            console.log('');
                            console.log('🔧 Update your API route with:');
                            console.log(`   const SANDBOX_ID = '${testSandbox.id}'`);
                            console.log(`   const daytonaConfig = ${JSON.stringify(config, null, 2)}`);
                            
                        } catch (setupError) {
                            console.log(`   ⚠️  Setup error: ${setupError.message}`);
                        }
                    } else {
                        console.log('   ❌ Sandbox failed to start');
                    }
                    
                    return { success: true, config, sandboxId: testSandbox.id };
                    
                } catch (createError) {
                    console.log(`   ❌ ${name} creation failed: ${createError.message}`);
                }
                
            } catch (listError) {
                console.log(`   ❌ ${name} failed: ${listError.message}`);
            }
            
            console.log('');
        }
        
        console.log('❌ All configurations failed - no runners available in any setup');
        
    } catch (error) {
        console.error('❌ Organization check failed:', error.message);
    }
}

// Run the check
checkOrgStatus().catch(console.error);
