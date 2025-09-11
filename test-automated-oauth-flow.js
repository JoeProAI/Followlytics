const puppeteer = require('puppeteer');

async function testAutomatedOAuthFlow() {
    console.log('🔐 Testing Automated Twitter OAuth Flow...');
    
    const username = 'JoeProAI';
    const maxFollowers = 100;
    
    // OAuth credentials from environment
    const consumerKey = process.env.TWITTER_API_KEY || 'VHdQbXktdml2QUMxdGx2Wm9lbWk6MTpjaQ';
    const consumerSecret = process.env.TWITTER_API_SECRET || 'bXvu43y0vssd-CTv5Ly9L1XYCz6cZcKBLEsi';
    const accessToken = process.env.TWITTER_ACCESS_TOKEN || '1767231492793434113-8v4Jj7OqahTodDW8ObJXR3UOPL7xY8';
    const accessTokenSecret = process.env.TWITTER_ACCESS_TOKEN_SECRET || 'L9LrgBtCkNFseE7KjPtgVx1NuqF7okFrIMrjcneiiFlkx';
    
    let browser;
    try {
        // Launch browser
        console.log('🚀 Launching browser with automated OAuth...');
        browser = await puppeteer.launch({
            headless: false, // Set to true for production
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-web-security',
                '--disable-features=VizDisplayCompositor'
            ]
        });
        
        const page = await browser.newPage();
        
        // Set user agent
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        
        // Step 1: Inject OAuth tokens directly into browser session
        console.log('🔑 Step 1: Injecting OAuth tokens into browser session...');
        
        // Navigate to Twitter first to establish domain
        await page.goto('https://x.com', { waitUntil: 'networkidle2' });
        
        // Extract user ID from access token (format: user_id-random_string)
        const userId = accessToken.split('-')[0];
        console.log(`   User ID extracted: ${userId}`);
        
        // Set authentication cookies that Twitter expects
        await page.setCookie(
            {
                name: 'auth_token',
                value: accessToken,
                domain: '.x.com',
                path: '/',
                httpOnly: true,
                secure: true,
                sameSite: 'None'
            },
            {
                name: 'ct0',
                value: accessTokenSecret, // Use token secret as CSRF token
                domain: '.x.com',
                path: '/',
                httpOnly: false,
                secure: true,
                sameSite: 'Lax'
            },
            {
                name: 'twid',
                value: `u%3D${userId}`, // User ID in Twitter format
                domain: '.x.com',
                path: '/',
                httpOnly: true,
                secure: true,
                sameSite: 'None'
            }
        );
        
        console.log('   ✅ OAuth cookies injected successfully');
        
        // Step 2: Verify authentication by navigating to home
        console.log('🏠 Step 2: Verifying authentication...');
        await page.goto('https://x.com/home', { waitUntil: 'networkidle2' });
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        const currentUrl = page.url();
        const pageTitle = await page.title();
        
        console.log(`   Current URL: ${currentUrl}`);
        console.log(`   Page title: ${pageTitle}`);
        
        if (currentUrl.includes('login') || pageTitle.toLowerCase().includes('login')) {
            console.log('   ⚠️ Authentication failed - still on login page');
            console.log('   🔄 Trying alternative authentication method...');
            
            // Alternative: Try to set localStorage tokens
            await page.evaluate((tokens) => {
                localStorage.setItem('twitter_oauth_token', tokens.accessToken);
                localStorage.setItem('twitter_oauth_token_secret', tokens.accessTokenSecret);
                localStorage.setItem('twitter_user_id', tokens.userId);
            }, { accessToken, accessTokenSecret, userId });
            
        } else {
            console.log('   ✅ Authentication successful - can access protected pages');
        }
        
        // Step 3: Navigate to followers page
        console.log(`👥 Step 3: Accessing @${username} followers page...`);
        const followersUrl = `https://x.com/${username}/followers`;
        
        await page.goto(followersUrl, { waitUntil: 'networkidle2' });
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        console.log(`   Current URL: ${page.url()}`);
        console.log(`   Page title: ${await page.title()}`);
        
        // Step 4: Enhanced follower extraction with scrolling
        console.log('🔍 Step 4: Extracting followers with enhanced scrolling...');
        
        const followers = [];
        const seenUsernames = new Set();
        
        // Scroll and extract in batches
        for (let scrollRound = 0; scrollRound < 5; scrollRound++) {
            console.log(`   📜 Scroll round ${scrollRound + 1}/5`);
            
            // Scroll to load more content
            await page.evaluate(() => {
                window.scrollTo(0, document.body.scrollHeight);
            });
            await new Promise(resolve => setTimeout(resolve, 3000));
            
            // Extract followers from current view
            const batchFollowers = await page.evaluate(() => {
                const followers = [];
                const foundUsernames = new Set();
                
                // Look for user profile links with more specific selectors
                const selectors = [
                    'a[href^="/"][href*="/"]',
                    '[data-testid="UserCell"] a[href^="/"]',
                    '[data-testid="user"] a[href^="/"]',
                    'div[data-testid="cellInnerDiv"] a[href^="/"]'
                ];
                
                selectors.forEach(selector => {
                    const links = document.querySelectorAll(selector);
                    links.forEach(link => {
                        const href = link.getAttribute('href');
                        if (href && href.startsWith('/') && href.length > 1) {
                            const potentialUsername = href.substring(1).split('/')[0];
                            
                            // Enhanced username validation
                            if (potentialUsername.length >= 2 && 
                                potentialUsername.length <= 15 &&
                                /^[a-zA-Z0-9_]+$/.test(potentialUsername) &&
                                !['home', 'explore', 'search', 'settings', 'help', 'about', 
                                  'privacy', 'terms', 'notifications', 'messages', 'compose', 
                                  'login', 'signup', 'i', 'intent', 'oauth', 'hashtag'].includes(potentialUsername.toLowerCase())) {
                                
                                // Try to get display name from nearby elements
                                let displayName = potentialUsername;
                                const parentElement = link.closest('[data-testid="UserCell"], [data-testid="user"], div');
                                if (parentElement) {
                                    const nameElement = parentElement.querySelector('[dir="ltr"]');
                                    if (nameElement && nameElement.textContent.trim()) {
                                        displayName = nameElement.textContent.trim();
                                    }
                                }
                                
                                foundUsernames.add(JSON.stringify({
                                    username: potentialUsername,
                                    display_name: displayName
                                }));
                            }
                        }
                    });
                });
                
                // Convert back to objects
                foundUsernames.forEach(userStr => {
                    const user = JSON.parse(userStr);
                    followers.push(user);
                });
                
                return followers;
            });
            
            // Add new followers to our collection
            batchFollowers.forEach(follower => {
                if (!seenUsernames.has(follower.username)) {
                    seenUsernames.add(follower.username);
                    followers.push({
                        username: follower.username,
                        display_name: follower.display_name,
                        extracted_at: new Date().toISOString(),
                        source: followersUrl,
                        method: 'automated_oauth_browser',
                        scroll_round: scrollRound + 1
                    });
                }
            });
            
            console.log(`   Found ${batchFollowers.length} new followers (Total: ${followers.length})`);
            
            // Stop if we've reached our limit
            if (followers.length >= maxFollowers) {
                console.log(`   ✅ Reached target of ${maxFollowers} followers`);
                break;
            }
        }
        
        // Limit to max followers
        const finalFollowers = followers.slice(0, maxFollowers);
        
        console.log(`✅ Extracted ${finalFollowers.length} followers with automated OAuth`);
        
        if (finalFollowers.length > 0) {
            console.log('📝 Sample followers:');
            finalFollowers.slice(0, 10).forEach((follower, index) => {
                console.log(`   ${index + 1}. @${follower.username} (${follower.display_name})`);
            });
        }
        
        // Create results
        const results = {
            target_username: username,
            followers_found: finalFollowers.length,
            followers: finalFollowers,
            scan_completed_at: new Date().toISOString(),
            status: finalFollowers.length > 0 ? 'completed' : 'partial',
            method: 'automated_oauth_browser',
            authentication: 'oauth_tokens_injected',
            note: 'Automated OAuth flow with token injection'
        };
        
        console.log('\n=== AUTOMATED OAUTH EXTRACTION RESULTS ===');
        console.log(`Target: @${username}`);
        console.log(`Followers found: ${results.followers_found}`);
        console.log(`Status: ${results.status}`);
        console.log(`Authentication: ${results.authentication}`);
        
        return results;
        
    } catch (error) {
        console.error('❌ Automated OAuth extraction failed:', error.message);
        return {
            target_username: username,
            followers_found: 0,
            followers: [],
            error: error.message,
            status: 'failed',
            method: 'automated_oauth_browser'
        };
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}

// Run the automated OAuth test
testAutomatedOAuthFlow()
    .then(results => {
        console.log('\n🎉 Automated OAuth test completed!');
        console.log('Results:', JSON.stringify(results, null, 2));
    })
    .catch(error => {
        console.error('💥 Automated OAuth test failed:', error);
    });
