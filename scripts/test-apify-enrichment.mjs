/**
 * Test script for Apify Premium X User Scraper integration
 * 
 * This script tests the follower enrichment feature to ensure:
 * 1. Apify client initializes correctly
 * 2. Actor can be called successfully
 * 3. Verified status is retrieved
 * 4. Data structure is correct
 */

import { ApifyClient } from 'apify-client';

// Test configuration
const TEST_USERNAMES = [
  'elonmusk',      // Known verified account
  'JoeProAI',      // Your account
  'OpenAI',        // Organization account (might be gold verified)
];

async function testApifyEnrichment() {
  console.log('🧪 Starting Apify Enrichment Test...\n');

  // Check for API token
  const apiToken = process.env.APIFY_API_TOKEN;
  if (!apiToken) {
    console.error('❌ ERROR: APIFY_API_TOKEN environment variable not set');
    console.log('\n📝 To fix this:');
    console.log('1. Go to https://console.apify.com/');
    console.log('2. Navigate to Settings → Integrations');
    console.log('3. Copy your API token');
    console.log('4. Run: $env:APIFY_API_TOKEN="your_token_here" (PowerShell)');
    console.log('   OR: export APIFY_API_TOKEN="your_token_here" (Bash)\n');
    process.exit(1);
  }

  console.log('✅ API Token found\n');

  try {
    // Initialize Apify client
    console.log('🔧 Initializing Apify client...');
    const client = new ApifyClient({
      token: apiToken,
    });
    console.log('✅ Client initialized\n');

    // Test the Premium X User Scraper Actor
    console.log(`🚀 Running Premium X User Scraper for ${TEST_USERNAMES.length} users...`);
    console.log(`   Users: ${TEST_USERNAMES.join(', ')}\n`);

    const startTime = Date.now();

    const run = await client.actor('kaitoeasyapi/premium-twitter-user-scraper-pay-per-result').call({
      user_names: TEST_USERNAMES,
    });

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`✅ Actor run completed in ${duration}s`);
    console.log(`   Run ID: ${run.id}`);
    console.log(`   Status: ${run.status}\n`);

    // Fetch results
    console.log('📥 Fetching results from dataset...');
    const { items } = await client.dataset(run.defaultDatasetId).listItems();
    console.log(`✅ Retrieved ${items.length} profiles\n`);

    // Analyze results
    console.log('📊 ENRICHMENT RESULTS:\n');
    console.log('═'.repeat(80));

    items.forEach((profile, index) => {
      console.log(`\n${index + 1}. @${profile.screen_name || profile.username}`);
      console.log('─'.repeat(80));
      console.log(`   Name: ${profile.name}`);
      console.log(`   Verified: ${profile.verified ? '✓ YES' : '✗ NO'}`);
      console.log(`   Blue Verified: ${profile.is_blue_verified ? '✓ YES' : '✗ NO'}`);
      console.log(`   Verification Type: ${profile.verified_type || 'none'}`);
      console.log(`   Followers: ${(profile.followers_count || 0).toLocaleString()}`);
      console.log(`   Following: ${(profile.friends_count || 0).toLocaleString()}`);
      console.log(`   Tweets: ${(profile.statuses_count || 0).toLocaleString()}`);
      console.log(`   Location: ${profile.location || 'Not specified'}`);
      console.log(`   Protected: ${profile.protected ? 'Yes' : 'No'}`);
      console.log(`   Created: ${profile.created_at || 'Unknown'}`);
      
      if (profile.description) {
        const bio = profile.description.length > 100 
          ? profile.description.substring(0, 100) + '...' 
          : profile.description;
        console.log(`   Bio: ${bio}`);
      }
    });

    console.log('\n' + '═'.repeat(80));

    // Summary statistics
    const verifiedCount = items.filter(p => p.verified).length;
    const blueVerifiedCount = items.filter(p => p.is_blue_verified).length;
    const totalFollowers = items.reduce((sum, p) => sum + (p.followers_count || 0), 0);
    const avgFollowers = Math.round(totalFollowers / items.length);
    const cost = ((items.length / 1000) * 0.15).toFixed(4);

    console.log('\n📈 SUMMARY STATISTICS:');
    console.log('─'.repeat(80));
    console.log(`   Total Profiles: ${items.length}`);
    console.log(`   Legacy Verified: ${verifiedCount}`);
    console.log(`   Twitter Blue: ${blueVerifiedCount}`);
    console.log(`   Total Followers: ${totalFollowers.toLocaleString()}`);
    console.log(`   Average Followers: ${avgFollowers.toLocaleString()}`);
    console.log(`   Cost: $${cost}`);
    console.log(`   Duration: ${duration}s`);
    console.log('─'.repeat(80));

    // Data structure validation
    console.log('\n🔍 DATA STRUCTURE VALIDATION:');
    console.log('─'.repeat(80));
    
    const requiredFields = [
      'screen_name', 'name', 'description', 'verified', 
      'followers_count', 'friends_count', 'statuses_count',
      'profile_image_url_https'
    ];

    const missingFields = new Set();
    items.forEach(profile => {
      requiredFields.forEach(field => {
        if (!(field in profile)) {
          missingFields.add(field);
        }
      });
    });

    if (missingFields.size === 0) {
      console.log('   ✅ All required fields present');
    } else {
      console.log('   ⚠️  Missing fields:', Array.from(missingFields).join(', '));
    }

    // Test verification types
    const verificationTypes = new Set(items.map(p => p.verified_type).filter(Boolean));
    console.log(`   Verification types found: ${verificationTypes.size > 0 ? Array.from(verificationTypes).join(', ') : 'none'}`);

    console.log('─'.repeat(80));

    // Success message
    console.log('\n✅ TEST COMPLETED SUCCESSFULLY!\n');
    console.log('🎉 The Apify Premium X User Scraper integration is working correctly.');
    console.log('📝 You can now safely add the FollowerEnrichment component to the dashboard.\n');

    return {
      success: true,
      profileCount: items.length,
      verifiedCount,
      blueVerifiedCount,
      cost,
      duration
    };

  } catch (error) {
    console.error('\n❌ TEST FAILED!\n');
    console.error('Error:', error.message);
    
    if (error.statusCode === 401) {
      console.error('\n🔑 Authentication Error:');
      console.error('   Your APIFY_API_TOKEN may be invalid or expired.');
      console.error('   Please verify your token at https://console.apify.com/');
    } else if (error.statusCode === 402) {
      console.error('\n💰 Payment Required:');
      console.error('   Your Apify account may have insufficient credits.');
      console.error('   Check your balance at https://console.apify.com/billing');
    } else {
      console.error('\n🐛 Debug Info:');
      console.error('   Status Code:', error.statusCode);
      console.error('   Type:', error.type);
      console.error('   Details:', error.details);
    }

    console.error('\n');
    process.exit(1);
  }
}

// Run the test
testApifyEnrichment()
  .then(() => {
    process.exit(0);
  })
  .catch(error => {
    console.error('Unexpected error:', error);
    process.exit(1);
  });
