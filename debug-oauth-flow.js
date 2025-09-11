#!/usr/bin/env node
/**
 * Debug Complete Twitter OAuth Flow
 */

import fetch from 'node-fetch';

async function debugOAuthFlow() {
    console.log('🔍 Testing complete Twitter OAuth flow...');
    console.log('');
    
    try {
        // Step 1: Test OAuth initialization
        console.log('📡 Step 1: Testing OAuth initialization...');
        const initResponse = await fetch('https://followlytics.vercel.app/api/auth/twitter', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({})
        });
        
        if (!initResponse.ok) {
            console.log('❌ OAuth initialization failed:', initResponse.status);
            return;
        }
        
        const initData = await initResponse.json();
        console.log('✅ OAuth initialization successful');
        console.log('   Authorization URL:', initData.authorization_url);
        console.log('   OAuth Token:', initData.oauth_token);
        
        // Step 2: Test what happens after user authorizes (simulate callback)
        console.log('');
        console.log('📡 Step 2: Testing callback flow...');
        console.log('   (This would normally happen after user authorizes on Twitter)');
        
        // Step 3: Test Twitter auth status endpoint
        console.log('');
        console.log('📡 Step 3: Testing auth status endpoint...');
        const statusResponse = await fetch('https://followlytics.vercel.app/api/auth/twitter/status', {
            method: 'GET'
        });
        
        if (statusResponse.ok) {
            const statusData = await statusResponse.json();
            console.log('✅ Auth status endpoint working');
            console.log('   Response:', statusData);
        } else {
            console.log('⚠️ Auth status endpoint returned:', statusResponse.status);
        }
        
        // Step 4: Check what the dashboard expects
        console.log('');
        console.log('📋 Expected flow after authorization:');
        console.log('   1. User clicks "Start Trial" → OAuth init (✅ Working)');
        console.log('   2. User redirected to Twitter → Authorizes app');
        console.log('   3. Twitter redirects to callback → Processes tokens');
        console.log('   4. Callback sets Firebase token cookie → Redirects to dashboard');
        console.log('   5. Dashboard detects auth success → Shows authenticated state');
        console.log('');
        
        console.log('🔍 Potential issues:');
        console.log('   - Firebase token not being set in cookie properly');
        console.log('   - useAuth hook not detecting the token');
        console.log('   - Dashboard not updating authentication state');
        console.log('   - Callback route failing silently');
        
    } catch (error) {
        console.error('❌ Debug flow error:', error.message);
    }
}

debugOAuthFlow().catch(console.error);
