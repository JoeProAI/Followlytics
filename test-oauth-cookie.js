#!/usr/bin/env node
/**
 * Test OAuth Cookie Setting
 */

import fetch from 'node-fetch';

async function testOAuthCookie() {
    console.log('🔍 Testing OAuth cookie setting...');
    console.log('');
    
    try {
        // Test OAuth initialization and check if cookie is set
        console.log('📡 Testing OAuth initialization with cookie inspection...');
        
        const response = await fetch('https://followlytics.vercel.app/api/auth/twitter', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({})
        });
        
        console.log('📊 Response status:', response.status);
        
        // Check for Set-Cookie headers
        const setCookieHeaders = response.headers.get('set-cookie');
        console.log('🍪 Set-Cookie headers:', setCookieHeaders);
        
        if (setCookieHeaders) {
            if (setCookieHeaders.includes('twitter_oauth_token_secret')) {
                console.log('✅ OAuth token secret cookie is being set');
                
                // Extract the cookie value
                const cookieMatch = setCookieHeaders.match(/twitter_oauth_token_secret=([^;]+)/);
                if (cookieMatch) {
                    console.log('   Cookie value:', cookieMatch[1]);
                }
            } else {
                console.log('❌ OAuth token secret cookie NOT found in Set-Cookie headers');
            }
        } else {
            console.log('❌ No Set-Cookie headers found');
        }
        
        const responseData = await response.json();
        console.log('📄 Response data:', responseData);
        
        // Now test callback with the cookie
        if (setCookieHeaders && setCookieHeaders.includes('twitter_oauth_token_secret')) {
            console.log('');
            console.log('📡 Testing callback with cookie...');
            
            const callbackResponse = await fetch('https://followlytics.vercel.app/api/auth/twitter/callback?oauth_token=test&oauth_verifier=test', {
                method: 'GET',
                headers: {
                    'Cookie': setCookieHeaders.split(',')[0] // Use the first cookie
                },
                redirect: 'manual'
            });
            
            console.log('📊 Callback status:', callbackResponse.status);
            const location = callbackResponse.headers.get('location');
            console.log('🔗 Callback redirect:', location);
            
            if (location && !location.includes('missing_token_secret')) {
                console.log('✅ Token secret cookie is working');
            } else {
                console.log('❌ Token secret still missing in callback');
            }
        }
        
    } catch (error) {
        console.error('❌ Test error:', error.message);
    }
}

testOAuthCookie().catch(console.error);
