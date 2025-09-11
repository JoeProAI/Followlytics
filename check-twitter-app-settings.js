#!/usr/bin/env node
/**
 * Check Twitter App Settings and Suggest Callback URLs
 */

console.log('🔍 Twitter App Callback URL Analysis');
console.log('');

console.log('📋 Current Production URLs:');
console.log('   - https://followlytics.vercel.app');
console.log('   - https://followlytics-git-main-joeproais-projects.vercel.app');
console.log('');

console.log('🔧 Required Callback URLs in Twitter Developer Portal:');
console.log('   1. https://followlytics.vercel.app/api/auth/twitter/callback');
console.log('   2. https://followlytics-git-main-joeproais-projects.vercel.app/api/auth/twitter/callback');
console.log('   3. http://localhost:3000/api/auth/twitter/callback (for development)');
console.log('');

console.log('📝 Steps to fix:');
console.log('   1. Go to https://developer.twitter.com/en/portal/dashboard');
console.log('   2. Select your Followlytics app');
console.log('   3. Go to "App settings" → "Authentication settings"');
console.log('   4. Click "Edit" next to "Callback URLs"');
console.log('   5. Add the URLs listed above');
console.log('   6. Save changes');
console.log('');

console.log('🎯 Alternative: Check what URLs might already be approved');
const possibleUrls = [
    'https://followlytics.vercel.app/api/auth/twitter/callback',
    'https://followlytics-git-main-joeproais-projects.vercel.app/api/auth/twitter/callback',
    'https://followlytics.netlify.app/api/auth/twitter/callback',
    'https://followlytics-production.vercel.app/api/auth/twitter/callback',
    'http://localhost:3000/api/auth/twitter/callback',
    'https://localhost:3000/api/auth/twitter/callback'
];

console.log('   Possible approved URLs to try:');
possibleUrls.forEach((url, i) => {
    console.log(`   ${i + 1}. ${url}`);
});

console.log('');
console.log('💡 If you know which URL is approved, I can update the code temporarily.');
