const puppeteer = require('puppeteer');

async function testBrowserFollowerExtraction() {
    console.log('🔍 Testing Local Browser-Based Follower Extraction...');
    
    const username = 'JoeProAI';
    const maxFollowers = 50;
    
    let browser;
    try {
        // Launch browser
        console.log('🚀 Launching browser...');
        browser = await puppeteer.launch({
            headless: false, // Set to true for production
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage'
            ]
        });
        
        const page = await browser.newPage();
        
        // Set user agent
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        
        // Navigate to Twitter followers page
        console.log(`📄 Navigating to @${username} followers page...`);
        const followersUrl = `https://x.com/${username}/followers`;
        
        await page.goto(followersUrl, { waitUntil: 'networkidle2', timeout: 30000 });
        
        console.log(`   Current URL: ${page.url()}`);
        console.log(`   Page title: ${await page.title()}`);
        
        // Wait for content to load
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        // Check if we need authentication
        const currentUrl = page.url();
        if (currentUrl.includes('login') || currentUrl.includes('authenticate')) {
            console.log('⚠️ Authentication required - user would need to log in');
            console.log('💡 In production, this would redirect user to complete OAuth flow');
        }
        
        // Scroll to load more content
        console.log('📜 Scrolling to load more followers...');
        for (let i = 0; i < 3; i++) {
            await page.evaluate(() => {
                window.scrollTo(0, document.body.scrollHeight);
            });
            await new Promise(resolve => setTimeout(resolve, 2000));
            console.log(`   Scroll ${i + 1}/3 completed`);
        }
        
        // Extract follower data
        console.log('🔍 Extracting follower data...');
        
        const followers = await page.evaluate((maxFollowers) => {
            const followers = [];
            
            // Look for user profile links
            const userLinks = document.querySelectorAll('a[href^="/"]');
            const foundUsernames = new Set();
            
            userLinks.forEach(link => {
                const href = link.getAttribute('href');
                if (href && href.startsWith('/') && href.length > 1) {
                    const potentialUsername = href.substring(1).split('/')[0];
                    
                    // Validate username format
                    if (potentialUsername.length >= 2 && 
                        potentialUsername.length <= 15 &&
                        /^[a-zA-Z0-9_]+$/.test(potentialUsername) &&
                        !['home', 'explore', 'search', 'settings', 'help', 'about', 
                          'privacy', 'terms', 'notifications', 'messages', 'compose', 
                          'login', 'signup', 'i'].includes(potentialUsername.toLowerCase())) {
                        foundUsernames.add(potentialUsername);
                    }
                }
            });
            
            // Also look for @mentions in text
            const textContent = document.body.innerText;
            const mentionMatches = textContent.match(/@([a-zA-Z0-9_]{2,15})/g);
            if (mentionMatches) {
                mentionMatches.forEach(mention => {
                    const username = mention.substring(1);
                    foundUsernames.add(username);
                });
            }
            
            // Convert to follower objects
            Array.from(foundUsernames).slice(0, maxFollowers).forEach((username, index) => {
                followers.push({
                    username: username,
                    display_name: username.replace('_', ' '),
                    extracted_at: new Date().toISOString(),
                    source: 'browser_extraction',
                    method: 'local_test'
                });
            });
            
            return followers;
        }, maxFollowers);
        
        console.log(`✅ Extracted ${followers.length} potential followers`);
        
        if (followers.length > 0) {
            console.log('📝 Sample followers:');
            followers.slice(0, 10).forEach((follower, index) => {
                console.log(`   ${index + 1}. @${follower.username}`);
            });
        }
        
        // Save results
        const results = {
            target_username: username,
            followers_found: followers.length,
            followers: followers,
            scan_completed_at: new Date().toISOString(),
            status: followers.length > 0 ? 'completed' : 'partial',
            method: 'local_browser_test',
            note: 'Local test - authentication may be required for full access'
        };
        
        console.log('\n=== EXTRACTION RESULTS ===');
        console.log(`Target: @${username}`);
        console.log(`Followers found: ${results.followers_found}`);
        console.log(`Status: ${results.status}`);
        
        return results;
        
    } catch (error) {
        console.error('❌ Browser extraction failed:', error.message);
        return {
            target_username: username,
            followers_found: 0,
            followers: [],
            error: error.message,
            status: 'failed'
        };
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}

// Run the test
testBrowserFollowerExtraction()
    .then(results => {
        console.log('\n🎉 Test completed!');
        console.log('Results:', JSON.stringify(results, null, 2));
    })
    .catch(error => {
        console.error('💥 Test failed:', error);
    });
