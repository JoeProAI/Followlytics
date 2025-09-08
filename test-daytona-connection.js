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
        // Check environment variables
        console.log('📋 Environment Variables:');
        console.log(`   DAYTONA_API_KEY: ${process.env.DAYTONA_API_KEY ? 'Set ✅' : 'Missing ❌'}`);
        console.log(`   DAYTONA_API_URL: ${process.env.DAYTONA_API_URL || 'Using default'}`);
        console.log(`   DAYTONA_ORG_ID: ${process.env.DAYTONA_ORG_ID ? 'Set ✅' : 'Missing ❌'}`);
        console.log(`   DAYTONA_TARGET: ${process.env.DAYTONA_TARGET || 'Using default'}`);
        console.log('');
        
        if (!process.env.DAYTONA_API_KEY) {
            console.error('❌ DAYTONA_API_KEY is required');
            return;
        }
        
        // Initialize SDK exactly like in the API route
        console.log('🚀 Initializing Daytona SDK...');
        const daytona = new Daytona({
            apiKey: process.env.DAYTONA_API_KEY,
            apiUrl: process.env.DAYTONA_API_URL || 'https://app.daytona.io/api'
        });
        
        console.log('✅ SDK initialized successfully');
        console.log('');
        
        // Test connection by listing sandboxes
        console.log('🔍 Testing connection by listing sandboxes...');
        
        try {
            const sandboxes = await daytona.sandbox.list();
            console.log('✅ Connection successful!');
            console.log(`📦 Found ${sandboxes.length} sandboxes`);
            
            if (sandboxes.length > 0) {
                console.log('📋 Existing sandboxes:');
                sandboxes.slice(0, 3).forEach(sb => {
                    console.log(`   - ${sb.id} (${sb.state})`);
                });
            }
            
        } catch (listError) {
            console.log('⚠️  Sandbox listing failed, trying to create test sandbox...');
            console.log(`   List error: ${listError.message}`);
        }
        
        // List available snapshots first
        console.log('');
        console.log('📋 Checking available snapshots...');
        
        try {
            const snapshots = await daytona.snapshot.list();
            console.log(`✅ Found ${snapshots.length} snapshots:`);
            snapshots.slice(0, 5).forEach(snap => {
                console.log(`   - ${snap.name} (${snap.state})`);
            });
        } catch (snapError) {
            console.log('⚠️  Could not list snapshots:', snapError.message);
        }
        
        // Test sandbox creation with default
        console.log('');
        console.log('🧪 Testing sandbox creation...');
        
        try {
            const testSandbox = await daytona.create({
                labels: {
                    'test': 'followlytics-connection-test'
                }
            });
            
            console.log('✅ Sandbox creation successful!');
            console.log(`📦 Created test sandbox: ${testSandbox.id}`);
            console.log(`📊 State: ${testSandbox.state}`);
            
            // Clean up test sandbox
            console.log('🧹 Cleaning up test sandbox...');
            await testSandbox.delete();
            console.log('✅ Test sandbox cleaned up');
            
        } catch (createError) {
            console.error('❌ Sandbox creation failed:', createError.message);
            console.error('   Full error:', createError);
            
            // Check if it's an authentication issue
            if (createError.message.includes('401') || createError.message.includes('Unauthorized')) {
                console.error('');
                console.error('🔧 Authentication Issue:');
                console.error('   1. Verify DAYTONA_API_KEY is correct');
                console.error('   2. Check if API key has expired');
                console.error('   3. Verify organization access');
            }
            
            // Check if it's a quota issue
            if (createError.message.includes('quota') || createError.message.includes('limit')) {
                console.error('');
                console.error('🔧 Quota Issue:');
                console.error('   1. Check Daytona dashboard for usage limits');
                console.error('   2. Verify organization tier and resources');
            }
            
            return;
        }
        
        console.log('');
        console.log('🎉 All tests passed - Daytona SDK is working correctly!');
        
    } catch (error) {
        console.error('❌ Connection test failed:', error.message);
        console.error('   Full error:', error);
        console.error('');
        console.error('🔧 Troubleshooting:');
        console.error('   1. Verify all environment variables are set');
        console.error('   2. Check internet connectivity');
        console.error('   3. Verify Daytona API status');
        console.error('   4. Check API key permissions');
    }
}

testConnection();
