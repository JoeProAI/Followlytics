#!/usr/bin/env node

const https = require('https');
const crypto = require('crypto');

async function debugOAuth500() {
  console.log('🔍 Debugging OAuth 500 Error...\n');

  // Test the exact same OAuth flow as the server
  const consumerKey = 'rR0QYeVEdOabCthwyQ2vxy7ra';
  const consumerSecret = 'yhgT1ayY84BrQ9jg4isLJxPt7GCXWd9lTnxjCleD7HcMyWciRi';
  const callbackUrl = 'https://followlytics.vercel.app/api/auth/twitter/callback';
  
  console.log(`🔑 Consumer Key: ${consumerKey}`);
  console.log(`🔒 Consumer Secret: ${consumerSecret.substring(0, 10)}...`);
  console.log(`🔗 Callback URL: ${callbackUrl}\n`);

  // OAuth 1.0a Request Token step
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
  
  // Create auth header
  const authHeader = `OAuth oauth_callback="${encodeURIComponent(callbackUrl)}", oauth_consumer_key="${consumerKey}", oauth_nonce="${oauthNonce}", oauth_signature="${encodeURIComponent(signature)}", oauth_signature_method="HMAC-SHA1", oauth_timestamp="${oauthTimestamp}", oauth_version="1.0"`;
  
  console.log('📝 OAuth Parameters:');
  console.log(`   Timestamp: ${oauthTimestamp}`);
  console.log(`   Nonce: ${oauthNonce.substring(0, 16)}...`);
  console.log(`   Signature: ${signature.substring(0, 20)}...`);
  console.log();

  try {
    console.log('🚀 Testing Twitter OAuth request token...');
    
    const response = await fetch('https://api.twitter.com/oauth/request_token', {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });
    
    console.log(`📊 Response Status: ${response.status}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.log('❌ Twitter API Error:');
      console.log(`   Status: ${response.status}`);
      console.log(`   Response: ${errorText}`);
      
      if (response.status === 401) {
        console.log('\n🔍 401 Unauthorized - Possible causes:');
        console.log('   • Invalid API credentials');
        console.log('   • Callback URL not approved in Twitter app');
        console.log('   • App permissions insufficient');
        console.log('   • OAuth signature mismatch');
      }
      
      return false;
    }
    
    const responseText = await response.text();
    console.log('✅ Twitter OAuth Success!');
    console.log(`   Response: ${responseText}`);
    
    const params = new URLSearchParams(responseText);
    const oauthToken = params.get('oauth_token');
    const oauthTokenSecret = params.get('oauth_token_secret');
    
    console.log(`   OAuth Token: ${oauthToken}`);
    console.log(`   Token Secret: ${oauthTokenSecret?.substring(0, 20)}...`);
    
    return true;
    
  } catch (error) {
    console.log('❌ Request Failed:');
    console.log(`   Error: ${error.message}`);
    return false;
  }
}

debugOAuth500().then(success => {
  console.log('\n' + '='.repeat(60));
  if (success) {
    console.log('🎉 OAuth credentials are working!');
    console.log('✅ The 500 error is likely a server-side issue');
  } else {
    console.log('❌ OAuth credentials need to be fixed');
    console.log('🔧 Check Twitter Developer Portal settings');
  }
});
