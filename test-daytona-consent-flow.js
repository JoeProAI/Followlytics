const { Daytona } = require('@daytona/sdk');

async function testDaytonaConsentFlow() {
    console.log('🧪 Testing Twitter App Consent Flow in Daytona Sandbox...');
    
    const username = 'JoeProAI';
    const maxFollowers = 50; // Small test batch
    
    try {
        // Initialize Daytona client
        const daytona = new Daytona({
            apiKey: process.env.DAYTONA_API_KEY || "dtn_30f485a820500d1c393ac4bfcac84be84ce23f87d79b5ba5a8e20f364d4ba567",
            apiUrl: process.env.DAYTONA_API_URL || "https://app.daytona.io/api"
        });
        
        console.log('🔌 Connected to Daytona API');
        
        // Create a new sandbox for testing
        console.log('📦 Creating test sandbox...');
        const sandbox = await daytona.sandbox.create({
            name: `twitter-consent-test-${Date.now()}`,
            image: 'ubuntu:22.04'
        });
        
        console.log(`✅ Sandbox created: ${sandbox.id}`);
        console.log('⏳ Waiting for sandbox to start...');
        
        // Wait for sandbox to be ready
        let attempts = 0;
        while (attempts < 30) {
            const status = await daytona.sandbox.get(sandbox.id);
            console.log(`   Sandbox status: ${status.state}`);
            
            if (status.state === 'started') {
                console.log('🚀 Sandbox is ready!');
                break;
            }
            
            await new Promise(resolve => setTimeout(resolve, 2000));
            attempts++;
        }
        
        if (attempts >= 30) {
            throw new Error('Sandbox failed to start within timeout');
        }
        
        // Install dependencies
        console.log('📦 Installing Python and dependencies...');
        
        const installCommands = [
            'apt-get update',
            'apt-get install -y python3 python3-pip curl wget',
            'pip3 install playwright beautifulsoup4 asyncio',
            'playwright install chromium',
            'playwright install-deps'
        ];
        
        for (const cmd of installCommands) {
            console.log(`   Running: ${cmd}`);
            const result = await sandbox.process.executeCommand(cmd);
            console.log(`   Result: ${result.toString().slice(0, 200)}...`);
        }
        
        // Create the Twitter consent test script
        console.log('📝 Creating Twitter consent test script...');
        
        const testScript = `#!/usr/bin/env python3
import asyncio
import json
import os
from playwright.async_api import async_playwright
from datetime import datetime
import urllib.parse

async def test_twitter_consent():
    """Test Twitter app consent flow in Daytona sandbox"""
    
    username = "${username}"
    max_followers = ${maxFollowers}
    
    # OAuth credentials
    consumer_key = "${process.env.TWITTER_API_KEY || 'VHdQbXktdml2QUMxdGx2Wm9lbWk6MTpjaQ'}"
    callback_url = 'https://followlytics.vercel.app/auth/callback'
    
    print(f"🎯 Testing Twitter consent for @{username}")
    print(f"🔐 Using consumer key: {consumer_key[:10]}...")
    
    async with async_playwright() as p:
        # Launch browser (headless=False for testing, but won't be visible in sandbox)
        browser = await p.chromium.launch(
            headless=True,  # Must be headless in sandbox
            args=[
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu',
                '--no-first-run'
            ]
        )
        
        context = await browser.new_context(
            viewport={'width': 1920, 'height': 1080},
            user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        )
        
        page = await context.new_page()
        
        try:
            # Step 1: Navigate to Twitter consent page
            print("\\n🔐 Step 1: Navigating to Twitter app consent...")
            
            auth_url = f"https://api.twitter.com/oauth/authorize?oauth_token={consumer_key}&oauth_callback={urllib.parse.quote(callback_url)}"
            print(f"   Auth URL: {auth_url}")
            
            await page.goto(auth_url, wait_until='networkidle')
            await asyncio.sleep(3)
            
            current_url = page.url
            page_title = await page.title()
            
            print(f"   Current URL: {current_url}")
            print(f"   Page title: {page_title}")
            
            # Take screenshot for debugging
            await page.screenshot(path='/tmp/consent_screen.png', full_page=True)
            print("   📸 Screenshot saved: /tmp/consent_screen.png")
            
            # Check page content
            page_content = await page.content()
            
            # Look for consent elements
            consent_detected = False
            if 'oauth/authorize' in current_url or 'Authorize' in page_title:
                consent_detected = True
                print("   ✅ Twitter consent screen detected!")
                
                # Look for specific elements
                auth_elements = await page.evaluate('''() => {
                    const elements = {
                        hasAuthButton: !!document.querySelector('input[value*="Authorize"], button[data-testid="authorize"]'),
                        hasDenyButton: !!document.querySelector('input[value*="Deny"], button[data-testid="deny"]'),
                        hasAppName: !!document.querySelector('h1, .app-name'),
                        hasLoginForm: !!document.querySelector('input[type="password"], input[name="password"]')
                    };
                    return elements;
                }''')
                
                print(f"   Auth button found: {auth_elements['hasAuthButton']}")
                print(f"   Deny button found: {auth_elements['hasDenyButton']}")
                print(f"   App name found: {auth_elements['hasAppName']}")
                print(f"   Login required: {auth_elements['hasLoginForm']}")
                
            elif 'login' in current_url:
                print("   ⚠️ Redirected to login - user authentication required first")
                
            else:
                print("   ❌ Unexpected page - consent flow may have issues")
            
            # Step 2: Test follower page access (without authorization)
            print(f"\\n👥 Step 2: Testing @{username} followers page access...")
            
            followers_url = f'https://x.com/{username}/followers'
            await page.goto(followers_url, wait_until='networkidle')
            await asyncio.sleep(5)
            
            print(f"   Followers URL: {page.url}")
            print(f"   Page title: {await page.title()}")
            
            # Try to extract some followers
            followers = []
            try:
                # Scroll a few times
                for i in range(3):
                    await page.evaluate('window.scrollTo(0, document.body.scrollHeight)')
                    await asyncio.sleep(2)
                
                # Extract usernames
                usernames = await page.evaluate('''() => {
                    const found = new Set();
                    const links = document.querySelectorAll('a[href^="/"]');
                    
                    links.forEach(link => {
                        const href = link.getAttribute('href');
                        if (href && href.startsWith('/') && href.length > 1) {
                            const username = href.substring(1).split('/')[0];
                            if (username.length >= 2 && username.length <= 15 && 
                                /^[a-zA-Z0-9_]+$/.test(username) &&
                                !['home', 'explore', 'search', 'settings'].includes(username.toLowerCase())) {
                                found.add(username);
                            }
                        }
                    });
                    
                    return Array.from(found);
                }''')
                
                followers = usernames.slice(0, max_followers).map(username => ({
                    username: username,
                    extracted_at: new Date().toISOString(),
                    method: 'daytona_consent_test'
                }));
                
                print(f"   ✅ Extracted {followers.length} followers without authorization")
                if (followers.length > 0) {
                    const sample = followers.slice(0, 5).map(f => f.username);
                    print(f"   📝 Sample: {sample.join(', ')}");
                }
                
            } catch (error) {
                print(f"   ⚠️ Follower extraction failed: {error}")
            
            # Create test results
            results = {
                'test_type': 'daytona_consent_flow',
                'target_username': username,
                'consent_screen_detected': consent_detected,
                'current_url': current_url,
                'page_title': page_title,
                'followers_extracted': len(followers),
                'followers': followers,
                'timestamp': datetime.now().isoformat(),
                'sandbox_test': True
            }
            
            # Save results
            with open('/tmp/consent_test_results.json', 'w') as f:
                json.dump(results, f, indent=2)
            
            print(f"\\n=== DAYTONA CONSENT TEST RESULTS ===")
            print(f"Consent screen detected: {consent_detected}")
            print(f"Followers extracted: {len(followers)}")
            print(f"Test completed successfully!")
            
            return results
            
        except Exception as e:
            print(f"❌ Test failed: {e}")
            return {'error': str(e), 'test_type': 'daytona_consent_flow'}
            
        finally:
            await browser.close()

if __name__ == "__main__":
    result = asyncio.run(test_twitter_consent())
    print("\\nTest completed!")
`;
        
        // Write the test script to sandbox
        await sandbox.fs.writeFile('/tmp/consent_test.py', testScript);
        console.log('✅ Test script uploaded to sandbox');
        
        // Run the consent test
        console.log('🚀 Running Twitter consent test in sandbox...');
        const testResult = await sandbox.process.executeCommand('cd /tmp && python3 consent_test.py');
        
        console.log('\n=== DAYTONA CONSENT TEST OUTPUT ===');
        console.log(testResult.toString());
        
        // Try to get the results file
        try {
            const resultsContent = await sandbox.fs.readFile('/tmp/consent_test_results.json');
            const results = JSON.parse(resultsContent);
            
            console.log('\n=== PARSED RESULTS ===');
            console.log(`Consent screen detected: ${results.consent_screen_detected}`);
            console.log(`Followers extracted: ${results.followers_extracted}`);
            console.log(`Page title: ${results.page_title}`);
            console.log(`Current URL: ${results.current_url}`);
            
            if (results.followers && results.followers.length > 0) {
                console.log('Sample followers:', results.followers.slice(0, 5).map(f => f.username));
            }
            
        } catch (error) {
            console.log('⚠️ Could not read results file:', error.message);
        }
        
        // Clean up sandbox
        console.log('🧹 Cleaning up sandbox...');
        await daytona.sandbox.delete(sandbox.id);
        console.log('✅ Sandbox deleted');
        
        return {
            success: true,
            sandbox_id: sandbox.id,
            test_completed: true
        };
        
    } catch (error) {
        console.error('❌ Daytona consent test failed:', error.message);
        return {
            success: false,
            error: error.message
        };
    }
}

// Run the test
testDaytonaConsentFlow()
    .then(results => {
        console.log('\n🎉 Daytona consent flow test completed!');
        console.log('Final results:', JSON.stringify(results, null, 2));
    })
    .catch(error => {
        console.error('💥 Test failed:', error);
    });
