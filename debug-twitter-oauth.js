#!/usr/bin/env node
/**
 * Debug Twitter OAuth 500 Error
 * Tests the Twitter OAuth endpoint to identify failure points
 */

import fetch from 'node-fetch';

async function debugTwitterOAuth() {
    console.log('🔍 Debugging Twitter OAuth 500 error...');
    console.log('');
    
    const testUrl = 'https://followlytics.vercel.app/api/auth/twitter';
    
    try {
        console.log(`📡 Testing OAuth endpoint: ${testUrl}`);
        
        const response = await fetch(testUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({})
        });
        
        console.log(`📊 Response status: ${response.status} ${response.statusText}`);
        
        const responseText = await response.text();
        console.log('📄 Response body:', responseText);
        
        if (!response.ok) {
            console.log('');
            console.log('❌ OAuth endpoint failed with 500 error');
            
            try {
                const errorData = JSON.parse(responseText);
                console.log('🔍 Error details:', errorData);
                
                if (errorData.error === 'Twitter API credentials not configured') {
                    console.log('');
                    console.log('🚨 ISSUE IDENTIFIED: Missing Twitter API credentials in Vercel');
                    console.log('');
                    console.log('📋 Required Vercel environment variables:');
                    console.log('   - TWITTER_API_KEY');
                    console.log('   - TWITTER_API_SECRET');
                    console.log('   - NEXT_PUBLIC_APP_URL');
                    console.log('');
                    console.log('🔧 Solution: Add these environment variables to Vercel dashboard');
                }
                
            } catch (parseError) {
                console.log('⚠️ Could not parse error response as JSON');
            }
        } else {
            console.log('✅ OAuth endpoint is working correctly');
        }
        
    } catch (error) {
        console.error('❌ Network error testing OAuth endpoint:', error.message);
    }
    
    console.log('');
    console.log('🔍 Additional checks:');
    
    // Test if we can reach Twitter API directly
    try {
        console.log('📡 Testing Twitter API connectivity...');
        const twitterResponse = await fetch('https://api.twitter.com/1.1/application/rate_limit_status.json', {
            method: 'GET',
            headers: {
                'Authorization': 'Bearer AAAAAAAAAAAAAAAAAAAAAAe43wEAAAAAScjJiEkdCCgL36WjAo5FHPJVWMo%3DbQNzCqF4QjouV4436XA7XJ2y99veap1UcHSckuVKw8THETYwgw'
            }
        });
        
        if (twitterResponse.ok) {
            console.log('✅ Twitter API is reachable');
        } else {
            console.log(`⚠️ Twitter API returned ${twitterResponse.status}`);
        }
    } catch (twitterError) {
        console.log('❌ Could not reach Twitter API:', twitterError.message);
    }
}

// Run the debug
debugTwitterOAuth().catch(console.error);
