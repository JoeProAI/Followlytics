#!/usr/bin/env node
/**
 * Test Twitter API Credentials in Production
 */

import fetch from 'node-fetch';

async function testTwitterCredentials() {
    console.log('🔍 Testing Twitter API credentials in production...');
    console.log('');
    
    // Test endpoint that shows what credentials are being used
    const testUrl = 'https://followlytics.vercel.app/api/debug/twitter-credentials';
    
    try {
        console.log('📡 Creating debug endpoint test...');
        
        // First, let's test the OAuth endpoint with verbose logging
        const oauthResponse = await fetch('https://followlytics.vercel.app/api/auth/twitter', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({})
        });
        
        const responseText = await oauthResponse.text();
        console.log('📊 OAuth Response Status:', oauthResponse.status);
        console.log('📄 OAuth Response:', responseText);
        
        if (responseText.includes('415')) {
            console.log('');
            console.log('🔍 Error 415 Analysis:');
            console.log('   - Callback URL not approved for this client application');
            console.log('   - This suggests the Twitter API Key/Secret combination');
            console.log('     does not match the app that has the approved callback URLs');
            console.log('');
            
            // Extract the specific error details
            try {
                const errorData = JSON.parse(responseText);
                if (errorData.details) {
                    console.log('📋 Full error details:');
                    console.log('   ', errorData.details);
                }
            } catch (e) {
                // Response might not be JSON
            }
            
            console.log('');
            console.log('🔧 Possible solutions:');
            console.log('   1. Verify TWITTER_API_KEY in Vercel matches your Twitter app');
            console.log('   2. Verify TWITTER_API_SECRET in Vercel matches your Twitter app');
            console.log('   3. Check if you have multiple Twitter apps and using wrong credentials');
            console.log('   4. Regenerate Twitter API keys and update Vercel environment variables');
        }
        
    } catch (error) {
        console.error('❌ Network error:', error.message);
    }
    
    console.log('');
    console.log('📝 Local credentials (from .env.local):');
    console.log('   TWITTER_API_KEY: rR0QYeVEdOabCthwyQ2vxy7ra');
    console.log('   TWITTER_API_SECRET: yhgT1ayY84BrQ9jg4isLJxPt7GCXWd9lTnxjCleD7HcMyWciRi');
    console.log('');
    console.log('💡 These should match exactly in your Vercel environment variables');
}

testTwitterCredentials().catch(console.error);
