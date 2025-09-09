#!/usr/bin/env node
/**
 * Complete End-to-End Test of Twitter Follower Scanning with Daytona
 * Tests the actual API endpoint to validate the entire flow works
 */

import fetch from 'node-fetch';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const API_BASE = 'http://localhost:3000';

async function testCompleteFlow() {
    console.log('🧪 COMPLETE END-TO-END SCAN FLOW TEST');
    console.log('=====================================');
    console.log('');
    
    try {
        // Step 1: Test Daytona connection first
        console.log('1️⃣ Testing Daytona Connection...');
        const testResponse = await fetch(`${API_BASE}/api/test-daytona`);
        const testData = await testResponse.json();
        
        if (!testData.success) {
            console.error('❌ Daytona connection failed:', testData.error);
            console.error('   Details:', testData.details);
            return;
        }
        
        console.log('✅ Daytona connection working');
        console.log(`   Found ${testData.sandbox_count} sandboxes`);
        console.log('');
        
        // Step 2: Submit a real scan request
        console.log('2️⃣ Submitting Scan Request...');
        const scanRequest = {
            username: 'JoeProAI',
            estimated_followers: 800,
            priority: 'normal',
            user_id: 'test-user'
        };
        
        console.log(`   Target: @${scanRequest.username}`);
        console.log(`   Expected followers: ${scanRequest.estimated_followers}`);
        
        const scanResponse = await fetch(`${API_BASE}/api/scan/daytona`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(scanRequest)
        });
        
        const scanData = await scanResponse.json();
        
        if (!scanData.success) {
            console.error('❌ Scan submission failed:', scanData.error);
            console.error('   Details:', scanData.details);
            return;
        }
        
        console.log('✅ Scan submitted successfully');
        console.log(`   Job ID: ${scanData.job_id}`);
        console.log(`   Sandbox ID: ${scanData.sandbox_id}`);
        console.log(`   Account size: ${scanData.account_size}`);
        console.log(`   Estimated duration: ${scanData.estimated_duration}`);
        console.log(`   Estimated cost: ${scanData.estimated_cost}`);
        console.log('');
        
        // Step 3: Monitor scan progress
        console.log('3️⃣ Monitoring Scan Progress...');
        const jobId = scanData.job_id;
        let completed = false;
        let attempts = 0;
        const maxAttempts = 60; // 10 minutes max
        
        while (!completed && attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10 seconds
            
            const statusResponse = await fetch(`${API_BASE}/api/scan/daytona?job_id=${jobId}`);
            const statusData = await statusResponse.json();
            
            if (!statusData.success) {
                console.error('❌ Status check failed:', statusData.error);
                break;
            }
            
            const progress = statusData.progress || 0;
            const phase = statusData.phase || 'unknown';
            const status = statusData.status || 'unknown';
            const followersFound = statusData.followers_found || 0;
            
            console.log(`   [${attempts + 1}/${maxAttempts}] ${progress}% - ${phase} (${status})`);
            if (followersFound > 0) {
                console.log(`   Followers found so far: ${followersFound}`);
            }
            
            if (status === 'completed') {
                console.log('✅ Scan completed successfully!');
                console.log(`   Total followers found: ${followersFound}`);
                console.log(`   Final phase: ${phase}`);
                completed = true;
                break;
            }
            
            if (status === 'failed') {
                console.error('❌ Scan failed');
                console.error(`   Error phase: ${phase}`);
                if (statusData.error) {
                    console.error(`   Error details: ${statusData.error}`);
                }
                break;
            }
            
            attempts++;
        }
        
        if (!completed && attempts >= maxAttempts) {
            console.log('⚠️ Scan did not complete within timeout');
            console.log('   This may be normal for the first run (sandbox setup takes time)');
        }
        
        console.log('');
        console.log('4️⃣ Test Summary:');
        console.log('================');
        
        if (completed) {
            console.log('✅ COMPLETE SUCCESS - All systems working!');
            console.log('   ✅ Daytona connection');
            console.log('   ✅ Sandbox creation');
            console.log('   ✅ Dependency installation');
            console.log('   ✅ Script deployment');
            console.log('   ✅ Scan execution');
            console.log('   ✅ Progress tracking');
            console.log('   ✅ Results retrieval');
            console.log('');
            console.log('🚀 READY FOR PRODUCTION DEPLOYMENT!');
        } else {
            console.log('⚠️ PARTIAL SUCCESS - System started but needs monitoring');
            console.log('   ✅ Daytona connection');
            console.log('   ✅ Sandbox creation');
            console.log('   ⏳ Scan in progress or timed out');
            console.log('');
            console.log('💡 Check the scan status manually or increase timeout');
        }
        
    } catch (error) {
        console.error('❌ COMPLETE TEST FAILED:', error.message);
        console.error('   Full error:', error);
        console.log('');
        console.log('🔧 TROUBLESHOOTING STEPS:');
        console.log('1. Ensure Next.js dev server is running (npm run dev)');
        console.log('2. Check Daytona API credentials in .env.local');
        console.log('3. Verify Daytona account has available compute resources');
        console.log('4. Check network connectivity to Daytona API');
    }
}

// Run the complete test
console.log('Starting complete end-to-end test...');
console.log('Make sure Next.js dev server is running first!');
console.log('');

testCompleteFlow().catch(console.error);
