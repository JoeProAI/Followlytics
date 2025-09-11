#!/usr/bin/env node
/**
 * Test Twitter OAuth Callback Route
 */

import fetch from 'node-fetch';

async function testCallbackRoute() {
    console.log('🔍 Testing Twitter OAuth callback route...');
    console.log('');
    
    // Test the callback route with sample parameters
    const testUrl = 'https://followlytics.vercel.app/api/auth/twitter/callback?oauth_token=test_token&oauth_verifier=test_verifier';
    
    try {
        console.log('📡 Testing callback with sample parameters...');
        console.log('   URL:', testUrl);
        
        const response = await fetch(testUrl, {
            method: 'GET',
            redirect: 'manual' // Don't follow redirects so we can see the response
        });
        
        console.log('📊 Response status:', response.status);
        console.log('📄 Response headers:', Object.fromEntries(response.headers.entries()));
        
        if (response.status === 302 || response.status === 301) {
            const location = response.headers.get('location');
            console.log('🔗 Redirect location:', location);
            
            if (location && location.includes('dashboard')) {
                console.log('✅ Callback redirects to dashboard correctly');
                
                // Check if there are any cookies being set
                const setCookieHeaders = response.headers.get('set-cookie');
                if (setCookieHeaders) {
                    console.log('🍪 Cookies being set:', setCookieHeaders);
                } else {
                    console.log('⚠️ No cookies being set in callback response');
                }
            } else {
                console.log('❌ Callback not redirecting to dashboard');
            }
        } else {
            const responseText = await response.text();
            console.log('📄 Response body:', responseText);
        }
        
    } catch (error) {
        console.error('❌ Callback test error:', error.message);
    }
    
    console.log('');
    console.log('🔍 Common callback issues:');
    console.log('   1. Firebase Admin SDK initialization failing');
    console.log('   2. Twitter API token exchange failing');
    console.log('   3. Firebase custom token creation failing');
    console.log('   4. Cookie not being set with correct domain/path');
    console.log('   5. Firestore write permissions issues');
}

testCallbackRoute().catch(console.error);
