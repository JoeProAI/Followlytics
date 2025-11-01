/**
 * Test the CURRENT Apify actor to see what verified fields it returns
 */

const APIFY_API_TOKEN = process.env.APIFY_API_TOKEN;

if (!APIFY_API_TOKEN) {
  console.error('❌ ERROR: APIFY_API_TOKEN not set');
  console.log('Run: $env:APIFY_API_TOKEN="your_token"');
  process.exit(1);
}

console.log('🧪 Testing Current Apify Actor: premium-x-follower-scraper-following-data\n');

const TEST_USERNAME = 'elonmusk'; // Known verified account

try {
  // Start the actor run
  console.log(`🚀 Starting actor for @${TEST_USERNAME}...`);
  
  const runInput = {
    user_names: [TEST_USERNAME],
    user_ids: [],
    maxFollowers: 200, // Minimum required
    maxFollowings: 200, // Minimum required
    getFollowers: true,
    getFollowing: false,
  };

  const startResponse = await fetch(
    `https://api.apify.com/v2/acts/kaitoeasyapi~premium-x-follower-scraper-following-data/runs?token=${APIFY_API_TOKEN}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(runInput)
    }
  );

  if (!startResponse.ok) {
    throw new Error(`Apify API error: ${startResponse.status}`);
  }

  const runData = await startResponse.json();
  const runId = runData.data.id;
  const defaultDatasetId = runData.data.defaultDatasetId;

  console.log(`✅ Run started: ${runId}`);
  console.log(`⏳ Waiting for completion...\n`);

  // Poll for completion
  let status = 'RUNNING';
  let attempts = 0;

  while (status === 'RUNNING' && attempts < 60) {
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    const statusResponse = await fetch(
      `https://api.apify.com/v2/acts/kaitoeasyapi~premium-x-follower-scraper-following-data/runs/${runId}?token=${APIFY_API_TOKEN}`
    );

    const statusData = await statusResponse.json();
    status = statusData.data.status;
    attempts++;

    if (attempts % 3 === 0) {
      console.log(`   Status check ${attempts}: ${status}`);
    }
  }

  if (status !== 'SUCCEEDED') {
    throw new Error(`Actor failed or timed out. Status: ${status}`);
  }

  console.log(`\n✅ Actor completed successfully!\n`);

  // Fetch results
  console.log('📥 Fetching follower data...');
  const datasetResponse = await fetch(
    `https://api.apify.com/v2/datasets/${defaultDatasetId}/items?token=${APIFY_API_TOKEN}`
  );

  const followers = await datasetResponse.json();
  console.log(`✅ Retrieved ${followers.length} followers\n`);

  if (followers.length === 0) {
    console.log('⚠️  No followers returned!');
    process.exit(1);
  }

  // Analyze verification fields
  console.log('═'.repeat(80));
  console.log('🔍 VERIFICATION FIELD ANALYSIS\n');

  // Check first 5 followers for verification fields
  const sampleSize = Math.min(5, followers.length);
  console.log(`Analyzing first ${sampleSize} followers:\n`);

  let verifiedCount = 0;
  let blueVerifiedCount = 0;
  const verificationTypes = new Set();
  const allFields = new Set();

  followers.slice(0, sampleSize).forEach((follower, index) => {
    console.log(`${index + 1}. @${follower.screen_name || follower.username}`);
    console.log('   Name:', follower.name);
    
    // List ALL fields in this follower object
    Object.keys(follower).forEach(key => allFields.add(key));
    
    // Check verification fields
    console.log('   Verification Fields:');
    console.log('   - verified:', follower.verified);
    console.log('   - is_blue_verified:', follower.is_blue_verified);
    console.log('   - verified_type:', follower.verified_type);
    console.log('   - ext_verified_type:', follower.ext_verified_type);
    console.log('   - legacy_verified:', follower.legacy_verified);
    console.log('');

    if (follower.verified) verifiedCount++;
    if (follower.is_blue_verified) blueVerifiedCount++;
    if (follower.verified_type) verificationTypes.add(follower.verified_type);
  });

  console.log('═'.repeat(80));
  console.log('\n📊 SUMMARY:\n');
  console.log(`Total Followers: ${followers.length}`);
  console.log(`Verified (${sampleSize} sample): ${verifiedCount}`);
  console.log(`Blue Verified (${sampleSize} sample): ${blueVerifiedCount}`);
  console.log(`Verification Types Found: ${Array.from(verificationTypes).join(', ') || 'none'}`);
  console.log('');

  console.log('📋 ALL AVAILABLE FIELDS IN FOLLOWER DATA:');
  console.log(Array.from(allFields).sort().join(', '));
  console.log('');

  // Full check across all followers
  const fullStats = {
    hasVerified: followers.filter(f => f.verified === true).length,
    hasBlueVerified: followers.filter(f => f.is_blue_verified === true).length,
    hasVerifiedType: followers.filter(f => f.verified_type).length,
    hasLegacyVerified: followers.filter(f => f.legacy_verified === true).length,
  };

  console.log('📈 FULL DATASET STATS (all followers):');
  console.log(`   - Has 'verified' field: ${fullStats.hasVerified}/${followers.length}`);
  console.log(`   - Has 'is_blue_verified' field: ${fullStats.hasBlueVerified}/${followers.length}`);
  console.log(`   - Has 'verified_type' field: ${fullStats.hasVerifiedType}/${followers.length}`);
  console.log(`   - Has 'legacy_verified' field: ${fullStats.hasLegacyVerified}/${followers.length}`);
  console.log('');

  if (fullStats.hasVerified === 0 && fullStats.hasBlueVerified === 0) {
    console.log('⚠️  WARNING: NO VERIFIED FOLLOWERS FOUND!');
    console.log('   This actor may not be returning verification data.');
    console.log('   Consider using the Premium X User Scraper instead.');
  } else {
    console.log('✅ Verification data IS available from this actor!');
  }

  console.log('\n' + '═'.repeat(80));

} catch (error) {
  console.error('\n❌ ERROR:', error.message);
  process.exit(1);
}
