const puppeteer = require('puppeteer');

async function testTwitterAppConsentFlow() {
    console.log('🔐 Testing Twitter App Authorization Consent Flow...');
    
    const username = 'JoeProAI';
    
    // OAuth credentials
    const consumerKey = process.env.TWITTER_API_KEY || 'VHdQbXktdml2QUMxdGx2Wm9lbWk6MTpjaQ';
    const consumerSecret = process.env.TWITTER_API_SECRET || 'bXvu43y0vssd-CTv5Ly9L1XYCz6cZcKBLEsi';
    const callbackUrl = 'https://followlytics.vercel.app/auth/callback';
    
    let browser;
    try {
        // Launch browser
        console.log('🚀 Launching browser for Twitter app consent...');
        browser = await puppeteer.launch({
            headless: false, // Keep visible so user can see consent screen
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage'
            ]
        });
        
        const page = await browser.newPage();
        
        // Set user agent
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        
        // Step 1: Navigate to Twitter OAuth authorization URL
        console.log('📄 Step 1: Navigating to Twitter app authorization...');
        
        // Construct OAuth 1.0a authorization URL
        const authUrl = `https://api.twitter.com/oauth/authorize?oauth_token=${consumerKey}&oauth_callback=${encodeURIComponent(callbackUrl)}`;
        
        console.log(`   Authorization URL: ${authUrl}`);
        
        await page.goto(authUrl, { waitUntil: 'networkidle2' });
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        console.log(`   Current URL: ${page.url()}`);
        console.log(`   Page title: ${await page.title()}`);
        
        // Step 2: Check if we're on the authorization page
        const currentUrl = page.url();
        
        if (currentUrl.includes('oauth/authorize') || currentUrl.includes('oauth/authenticate')) {
            console.log('✅ Successfully reached Twitter app authorization page!');
            
            // Look for authorization elements
            const authElements = await page.evaluate(() => {
                const elements = {
                    appName: null,
                    permissions: [],
                    authorizeButton: null,
                    denyButton: null,
                    loginRequired: false
                };
                
                // Check if login is required first
                if (document.querySelector('input[name="session[username_or_email]"]') || 
                    document.querySelector('input[type="email"]') ||
                    document.querySelector('input[type="password"]')) {
                    elements.loginRequired = true;
                    return elements;
                }
                
                // Look for app name
                const appNameEl = document.querySelector('h1, .app-name, [data-testid="app-name"]');
                if (appNameEl) elements.appName = appNameEl.textContent.trim();
                
                // Look for permissions list
                const permissionEls = document.querySelectorAll('li, .permission, [data-testid="permission"]');
                permissionEls.forEach(el => {
                    const text = el.textContent.trim();
                    if (text && text.length > 10) {
                        elements.permissions.push(text);
                    }
                });
                
                // Look for authorize button
                const authorizeBtn = document.querySelector('input[value*="Authorize"], button[data-testid="authorize"], input[type="submit"][value*="Allow"]');
                if (authorizeBtn) {
                    elements.authorizeButton = {
                        text: authorizeBtn.textContent || authorizeBtn.value,
                        type: authorizeBtn.tagName.toLowerCase()
                    };
                }
                
                // Look for deny button
                const denyBtn = document.querySelector('input[value*="Deny"], button[data-testid="deny"], a[href*="deny"]');
                if (denyBtn) {
                    elements.denyButton = {
                        text: denyBtn.textContent || denyBtn.value,
                        type: denyBtn.tagName.toLowerCase()
                    };
                }
                
                return elements;
            });
            
            console.log('\n📋 Authorization Page Details:');
            console.log(`   App Name: ${authElements.appName || 'Not found'}`);
            console.log(`   Permissions: ${authElements.permissions.length > 0 ? authElements.permissions.join(', ') : 'Not found'}`);
            console.log(`   Authorize Button: ${authElements.authorizeButton ? authElements.authorizeButton.text : 'Not found'}`);
            console.log(`   Deny Button: ${authElements.denyButton ? authElements.denyButton.text : 'Not found'}`);
            console.log(`   Login Required: ${authElements.loginRequired}`);
            
            if (authElements.loginRequired) {
                console.log('\n⚠️ User needs to log in to Twitter first');
                console.log('💡 In production, user would:');
                console.log('   1. Enter their Twitter username/email and password');
                console.log('   2. Complete any 2FA if enabled');
                console.log('   3. Then see the app authorization screen');
                
                // Wait for user to potentially log in
                console.log('\n⏳ Waiting 30 seconds for potential user login...');
                await new Promise(resolve => setTimeout(resolve, 30000));
                
                // Check if we're now on auth page
                const newUrl = page.url();
                if (newUrl.includes('oauth/authorize')) {
                    console.log('✅ User logged in! Now on authorization page');
                } else {
                    console.log('⚠️ Still on login page or redirected elsewhere');
                }
            }
            
            // Step 3: Demonstrate automatic authorization (for testing)
            console.log('\n🤖 Step 3: Demonstrating automatic authorization...');
            console.log('💡 In production, this would wait for user to click "Authorize app"');
            
            // Look for authorize button and simulate click
            const authorizeClicked = await page.evaluate(() => {
                const authorizeBtn = document.querySelector('input[value*="Authorize"], button[data-testid="authorize"], input[type="submit"][value*="Allow"]');
                if (authorizeBtn) {
                    // Don't actually click in test - just return true
                    return true;
                }
                return false;
            });
            
            if (authorizeClicked) {
                console.log('✅ Authorize button found - ready for user consent');
                console.log('💡 User would click "Authorize app" to grant permissions');
                
                // In a real implementation, we'd wait for the callback
                console.log('\n🔄 After user authorization, app would:');
                console.log('   1. Receive callback with oauth_token and oauth_verifier');
                console.log('   2. Exchange for access tokens');
                console.log('   3. Store tokens for follower extraction');
                console.log('   4. Redirect to follower scanning page');
            } else {
                console.log('❌ Authorize button not found - page structure may have changed');
            }
            
        } else if (currentUrl.includes('login') || currentUrl.includes('authenticate')) {
            console.log('⚠️ Redirected to login page - user authentication required');
            console.log('💡 User needs to log in to Twitter before app authorization');
            
        } else {
            console.log('❌ Unexpected page - not on Twitter authorization flow');
            console.log(`   Current URL: ${currentUrl}`);
        }
        
        // Step 4: Take screenshot for documentation
        console.log('\n📸 Taking screenshot of authorization page...');
        await page.screenshot({ 
            path: 'twitter-app-consent-screen.png',
            fullPage: true 
        });
        console.log('   Screenshot saved as: twitter-app-consent-screen.png');
        
        // Wait for user to see the consent screen
        console.log('\n⏳ Keeping browser open for 60 seconds to demonstrate consent flow...');
        await new Promise(resolve => setTimeout(resolve, 60000));
        
        return {
            success: true,
            consent_screen_displayed: currentUrl.includes('oauth/authorize'),
            login_required: currentUrl.includes('login'),
            authorization_url: authUrl,
            current_url: currentUrl,
            page_title: await page.title(),
            method: 'twitter_app_consent_flow'
        };
        
    } catch (error) {
        console.error('❌ Twitter app consent flow failed:', error.message);
        return {
            success: false,
            error: error.message,
            method: 'twitter_app_consent_flow'
        };
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}

// Run the Twitter app consent test
testTwitterAppConsentFlow()
    .then(results => {
        console.log('\n🎉 Twitter app consent flow test completed!');
        console.log('Results:', JSON.stringify(results, null, 2));
    })
    .catch(error => {
        console.error('💥 Twitter app consent test failed:', error);
    });
