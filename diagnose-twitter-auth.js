#!/usr/bin/env node

/**
 * Diagnose Twitter Authentication Issues
 * Tests Twitter OAuth 1.0a credentials and callback URL configuration
 */

const crypto = require('crypto');
const https = require('https');

// Load environment variables from .env.local
const fs = require('fs');
const path = require('path');

function loadEnvFile() {
  const envPath = path.join(__dirname, '.env.local');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const lines = envContent.split('\n');
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=');
        if (key && valueParts.length > 0) {
          const value = valueParts.join('=');
          process.env[key] = value;
        }
      }
    }
  }
}

loadEnvFile();

async function makeRequest(url, options) {
  return new Promise((resolve, reject) => {
    const req = https.request(url, options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          headers: res.headers,
          body: body
        });
      });
    });

    req.on('error', reject);
    
    if (options.body) {
      req.write(options.body);
    }
    
    req.end();
  });
}

async function testTwitterAuth() {
  console.log('🔍 Diagnosing Twitter Authentication Issues...\n');

  // Step 1: Check environment variables
  console.log('📋 Step 1: Checking Twitter credentials...');
  
  const consumerKey = process.env.TWITTER_API_KEY || process.env.TWITTER_CLIENT_ID;
  const consumerSecret = process.env.TWITTER_API_SECRET || process.env.TWITTER_CLIENT_SECRET;
  const accessToken = process.env.TWITTER_ACCESS_TOKEN;
  const accessTokenSecret = process.env.TWITTER_ACCESS_TOKEN_SECRET;
  const bearerToken = process.env.TWITTER_BEARER_TOKEN;

  console.log(`   Consumer Key: ${consumerKey ? `${consumerKey.substring(0, 10)}...` : 'MISSING'}`);
  console.log(`   Consumer Secret: ${consumerSecret ? `${consumerSecret.substring(0, 10)}...` : 'MISSING'}`);
  console.log(`   Access Token: ${accessToken ? `${accessToken.substring(0, 10)}...` : 'MISSING'}`);
  console.log(`   Access Token Secret: ${accessTokenSecret ? `${accessTokenSecret.substring(0, 10)}...` : 'MISSING'}`);
  console.log(`   Bearer Token: ${bearerToken ? `${bearerToken.substring(0, 20)}...` : 'MISSING'}`);

  if (!consumerKey || !consumerSecret) {
    console.log('❌ Missing required OAuth 1.0a credentials');
    return false;
  }

  // Step 2: Test OAuth 1.0a Request Token
  console.log('\n🔐 Step 2: Testing OAuth 1.0a Request Token...');
  
  const callbackUrl = 'https://followlytics.vercel.app/api/auth/twitter/callback';
  const oauthTimestamp = Math.floor(Date.now() / 1000).toString();
  const oauthNonce = crypto.randomBytes(32).toString('hex');
  
  const oauthParams = {
    oauth_callback: callbackUrl,
    oauth_consumer_key: consumerKey,
    oauth_nonce: oauthNonce,
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: oauthTimestamp,
    oauth_version: '1.0'
  };
  
  // Create parameter string for signature
  const paramString = Object.keys(oauthParams)
    .sort()
    .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(oauthParams[key])}`)
    .join('&');
  
  // Create signature base string
  const signatureBaseString = `POST&${encodeURIComponent('https://api.twitter.com/oauth/request_token')}&${encodeURIComponent(paramString)}`;
  
  // Create signing key
  const signingKey = `${encodeURIComponent(consumerSecret)}&`;
  
  // Generate signature
  const signature = crypto.createHmac('sha1', signingKey).update(signatureBaseString).digest('base64');
  
  // Create authorization header
  const authHeader = `OAuth oauth_callback="${encodeURIComponent(callbackUrl)}", oauth_consumer_key="${consumerKey}", oauth_nonce="${oauthNonce}", oauth_signature="${encodeURIComponent(signature)}", oauth_signature_method="HMAC-SHA1", oauth_timestamp="${oauthTimestamp}", oauth_version="1.0"`;

  console.log(`   Callback URL: ${callbackUrl}`);
  console.log(`   OAuth Signature: ${signature.substring(0, 20)}...`);

  try {
    const response = await makeRequest('https://api.twitter.com/oauth/request_token', {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    console.log(`   Response Status: ${response.status}`);
    console.log(`   Response Body: ${response.body}`);

    if (response.status === 200) {
      console.log('   ✅ OAuth 1.0a Request Token: SUCCESS');
      
      const params = new URLSearchParams(response.body);
      const oauthToken = params.get('oauth_token');
      const oauthTokenSecret = params.get('oauth_token_secret');
      
      if (oauthToken && oauthTokenSecret) {
        console.log(`   OAuth Token: ${oauthToken.substring(0, 20)}...`);
        console.log(`   OAuth Token Secret: ${oauthTokenSecret.substring(0, 20)}...`);
      }
    } else {
      console.log('   ❌ OAuth 1.0a Request Token: FAILED');
      
      // Parse error response
      try {
        const errorData = JSON.parse(response.body);
        console.log(`   Error Details:`, errorData);
      } catch {
        console.log(`   Raw Error: ${response.body}`);
      }
      
      // Common error analysis
      if (response.status === 401) {
        console.log('\n🔍 Error Analysis:');
        console.log('   - 401 Unauthorized typically means:');
        console.log('     • Invalid Consumer Key/Secret combination');
        console.log('     • Callback URL not approved in Twitter app settings');
        console.log('     • App permissions insufficient');
        console.log('     • App not properly configured for OAuth 1.0a');
      }
      
      return false;
    }
  } catch (error) {
    console.log(`   ❌ Request failed: ${error.message}`);
    return false;
  }

  // Step 3: Test existing access tokens (if available)
  if (accessToken && accessTokenSecret) {
    console.log('\n🔑 Step 3: Testing existing access tokens...');
    
    const userTimestamp = Math.floor(Date.now() / 1000).toString();
    const userNonce = crypto.randomBytes(32).toString('hex');
    
    const userParams = {
      oauth_consumer_key: consumerKey,
      oauth_nonce: userNonce,
      oauth_signature_method: 'HMAC-SHA1',
      oauth_timestamp: userTimestamp,
      oauth_token: accessToken,
      oauth_version: '1.0'
    };
    
    const userParamString = Object.keys(userParams)
      .sort()
      .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(userParams[key])}`)
      .join('&');
    
    const userSignatureBase = `GET&${encodeURIComponent('https://api.twitter.com/1.1/account/verify_credentials.json')}&${encodeURIComponent(userParamString)}`;
    const userSigningKey = `${encodeURIComponent(consumerSecret)}&${encodeURIComponent(accessTokenSecret)}`;
    const userSignature = crypto.createHmac('sha1', userSigningKey).update(userSignatureBase).digest('base64');
    
    const userAuthHeader = `OAuth oauth_consumer_key="${consumerKey}", oauth_nonce="${userNonce}", oauth_signature="${encodeURIComponent(userSignature)}", oauth_signature_method="HMAC-SHA1", oauth_timestamp="${userTimestamp}", oauth_token="${accessToken}", oauth_version="1.0"`;

    try {
      const userResponse = await makeRequest('https://api.twitter.com/1.1/account/verify_credentials.json', {
        method: 'GET',
        headers: {
          'Authorization': userAuthHeader
        }
      });

      console.log(`   Response Status: ${userResponse.status}`);
      
      if (userResponse.status === 200) {
        const userData = JSON.parse(userResponse.body);
        console.log('   ✅ Access Token Verification: SUCCESS');
        console.log(`   Authenticated as: @${userData.screen_name} (${userData.name})`);
        console.log(`   User ID: ${userData.id_str}`);
        console.log(`   Followers: ${userData.followers_count.toLocaleString()}`);
      } else {
        console.log('   ❌ Access Token Verification: FAILED');
        console.log(`   Response: ${userResponse.body}`);
      }
    } catch (error) {
      console.log(`   ❌ Access token test failed: ${error.message}`);
    }
  }

  // Step 4: Check Twitter app configuration recommendations
  console.log('\n📝 Step 4: Twitter App Configuration Checklist:');
  console.log('   □ App Type: Web App, Automated App or Bot');
  console.log('   □ App Permissions: Read and Write');
  console.log('   □ Callback URL: https://followlytics.vercel.app/api/auth/twitter/callback');
  console.log('   □ Website URL: https://followlytics.vercel.app');
  console.log('   □ Terms of Service URL: https://followlytics.vercel.app/terms');
  console.log('   □ Privacy Policy URL: https://followlytics.vercel.app/privacy');
  console.log('   □ App attached to a Project (for API v2 access)');

  return true;
}

// Run the diagnostic
testTwitterAuth().then(success => {
  console.log('\n' + '='.repeat(60));
  console.log('🏁 TWITTER AUTHENTICATION DIAGNOSTIC COMPLETE');
  console.log('='.repeat(60));
  
  if (success) {
    console.log('✅ Basic OAuth 1.0a flow is working');
    console.log('🔧 If authentication still fails, check:');
    console.log('   • Twitter app callback URL configuration');
    console.log('   • App permissions and project attachment');
    console.log('   • Production environment variables in Vercel');
  } else {
    console.log('❌ OAuth 1.0a authentication has issues');
    console.log('🔧 Fix the identified issues and run diagnostic again');
  }
  
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('💥 Diagnostic failed:', error);
  process.exit(1);
});
