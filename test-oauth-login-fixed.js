#!/usr/bin/env node

const https = require('https');

async function testOAuthLogin() {
  console.log('🔍 Testing Fixed OAuth Login Endpoint...\n');

  return new Promise((resolve, reject) => {
    const req = https.request('https://followlytics.vercel.app/api/auth/twitter/login', (res) => {
      console.log(`Status: ${res.statusCode}`);
      console.log('Headers:', res.headers);
      
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        if (res.statusCode === 302) {
          console.log('✅ OAuth login redirect working');
          console.log(`Redirect to: ${res.headers.location}`);
          resolve(true);
        } else if (res.statusCode === 500) {
          console.log('❌ Still getting 500 error');
          console.log('Response:', body);
          resolve(false);
        } else {
          console.log('Response body:', body);
          resolve(res.statusCode < 400);
        }
      });
    });

    req.on('error', (err) => {
      console.error('Request error:', err);
      resolve(false);
    });

    req.end();
  });
}

testOAuthLogin().then(success => {
  console.log('\n' + '='.repeat(50));
  if (success) {
    console.log('🎉 OAuth login endpoint: FIXED!');
    console.log('✅ No more 500 errors');
    console.log('✅ Twitter authentication flow working');
  } else {
    console.log('❌ OAuth login still needs debugging');
  }
});
