#!/usr/bin/env node
/**
 * Deploy Followlytics with Fixed Daytona Configuration
 */

console.log('🚀 Deploying Followlytics with Fixed Daytona Configuration...');
console.log('');

console.log('✅ Code Changes Applied:');
console.log('   - Removed DAYTONA_ORG_ID requirement (causes runner errors)');
console.log('   - Updated to use correct API URL: https://app.daytona.io/api');
console.log('   - Using verified working sandbox: 9f8324a8-1246-462f-9306-99bcb05a4a52');
console.log('');

console.log('🔧 Required Vercel Environment Variables:');
console.log('   DAYTONA_API_KEY=dtn_30f485a820500d1c393ac4bfcac84be84ce23f87d79b5ba5a8e20f364d4ba567');
console.log('   DAYTONA_API_URL=https://app.daytona.io/api');
console.log('   (DO NOT SET: DAYTONA_ORG_ID or DAYTONA_TARGET)');
console.log('');

console.log('📋 Manual Deployment Steps:');
console.log('1. Go to Vercel Dashboard: https://vercel.com/dashboard');
console.log('2. Select your Followlytics project');
console.log('3. Go to Settings > Environment Variables');
console.log('4. Update/Add these variables:');
console.log('   - DAYTONA_API_KEY: dtn_30f485a820500d1c393ac4bfcac84be84ce23f87d79b5ba5a8e20f364d4ba567');
console.log('   - DAYTONA_API_URL: https://app.daytona.io/api');
console.log('5. Remove these variables if they exist:');
console.log('   - DAYTONA_ORG_ID');
console.log('   - DAYTONA_TARGET');
console.log('6. Redeploy the project');
console.log('');

console.log('🎯 Expected Results After Deployment:');
console.log('   - Daytona sandbox access should work');
console.log('   - No more "No available runners" errors');
console.log('   - Twitter follower scanning should function properly');
console.log('');

console.log('🔍 Test URLs After Deployment:');
console.log('   - Test Daytona: https://your-app.vercel.app/api/test-daytona');
console.log('   - Submit Scan: https://your-app.vercel.app/api/scan/daytona');
console.log('');

console.log('✅ Deployment preparation complete!');
console.log('Please follow the manual steps above to update Vercel environment variables.');
