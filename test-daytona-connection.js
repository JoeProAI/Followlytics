#!/usr/bin/env node
/**
 * Test Daytona SDK Connection for Followlytics
 */

import { Daytona } from '@daytonaio/sdk';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

async function testConnection() {
    console.log('🔧 Testing Daytona SDK Connection for Followlytics...');
    console.log('');
    
    try {
        if (!process.env.DAYTONA_API_KEY) {
            console.error('❌ DAYTONA_API_KEY is required');
            return;
        }
        
        console.log('🔧 Configuration:');
        console.log(`   API Key: ${process.env.DAYTONA_API_KEY?.substring(0, 20)}...`);
        console.log(`   API URL: ${process.env.DAYTONA_API_URL || 'https://app.daytona.io/api'}`);
        console.log('   Note: NOT using DAYTONA_ORG_ID (causes runner errors)');
        console.log('');
        
        // Initialize SDK (without target parameter to avoid runner errors)
        const daytona = new Daytona({
            apiKey: process.env.DAYTONA_API_KEY,
            apiUrl: process.env.DAYTONA_API_URL || 'https://app.daytona.io/api'
        });
        
        console.log('✅ Daytona SDK initialized');
        console.log('');
        
        // Test connection by listing sandboxes
        console.log('📋 Listing existing sandboxes...');
        
        try {
            const sandboxes = await daytona.list();
            console.log(`✅ Found ${sandboxes.length} sandboxes:`);
            
            if (sandboxes.length === 0) {
                console.log('   No existing sandboxes found');
                console.log('   This explains the "No available runners" error');
                console.log('');
                console.log('💡 Solutions:');
                console.log('   1. Check if your Daytona organization has compute resources');
                console.log('   2. Verify billing/subscription status');
                console.log('   3. Contact Daytona support for runner availability');
            } else {
                sandboxes.forEach(sandbox => {
                    console.log(`   - ${sandbox.id} (${sandbox.state})`);
                });
                
                // Test accessing the first sandbox
                const testSandbox = sandboxes[0];
                console.log('');
                console.log(`🔍 Testing sandbox access: ${testSandbox.id}`);
                
                try {
                    const sandbox = await daytona.findOne(testSandbox.id);
                    console.log(`✅ Successfully accessed sandbox: ${sandbox.id}`);
                    console.log(`   State: ${sandbox.state}`);
                    
                    if (sandbox.state === 'started') {
                        console.log('');
                        console.log('🎯 This sandbox can be used for follower scanning!');
                        console.log(`   Update API route with: const SANDBOX_ID = '${sandbox.id}'`);
                    }
                } catch (findError) {
                    console.log(`❌ Could not access sandbox: ${findError.message}`);
                }
            }
        } catch (listError) {
            console.error('❌ Failed to list sandboxes:', listError.message);
            
            if (listError.message.includes('No available runners')) {
                console.log('');
                console.log('🚨 Root Cause: No Available Runners');
                console.log('   Your Daytona organization has no compute resources available');
                console.log('   This could be due to:');
                console.log('   - Billing/subscription issues');
                console.log('   - Resource limits reached');
                console.log('   - Organization configuration problems');
                console.log('');
                console.log('📞 Next Steps:');
                console.log('   1. Check Daytona dashboard for billing status');
                console.log('   2. Verify organization has active compute resources');
                console.log('   3. Contact Daytona support if needed');
            }
        }
        
        console.log('');
        console.log('🎉 Connection test completed!');
        
    } catch (error) {
        console.error('❌ Connection test failed:', error.message);
        console.error('   Full error:', error);
    }
}

// Run the test
testConnection().catch(console.error);
