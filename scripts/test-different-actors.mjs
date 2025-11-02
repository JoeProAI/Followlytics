/**
 * Test different Apify actors to find one that returns followers WITH verified status
 */

const APIFY_API_TOKEN = process.env.APIFY_API_TOKEN;

if (!APIFY_API_TOKEN) {
  console.error('❌ ERROR: APIFY_API_TOKEN not set');
  process.exit(1);
}

console.log('🧪 Testing Apify Actors for Verified Status Support\n');

const TEST_USERNAME = 'elonmusk';

// Actor to test - this gets user details including followers WITH verified status
const actor = 'apify/twitter-scraper';

console.log(`Testing: ${actor}`);
console.log(`Target: @${TEST_USERNAME}\n`);

try {
  const runInput = {
    handles: [TEST_USERNAME],
    tweetsDesired: 0,
    proxyConfig: { useApifyProxy: true }
  };

  const startResponse = await fetch(
    `https://api.apify.com/v2/acts/${actor}/runs?token=${APIFY_API_TOKEN}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(runInput)
    }
  );

  if (!startResponse.ok) {
    console.log(`❌ ${actor}: API error ${startResponse.status}`);
    process.exit(1);
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
      `https://api.apify.com/v2/acts/${actor}/runs/${runId}?token=${APIFY_API_TOKEN}`
    );

    const statusData = await statusResponse.json();
    status = statusData.data.status;
    attempts++;

    if (attempts % 3 === 0) {
      console.log(`   Status: ${status}`);
    }
  }

  if (status !== 'SUCCEEDED') {
    console.log(`❌ Failed with status: ${status}`);
    process.exit(1);
  }

  const datasetResponse = await fetch(
    `https://api.apify.com/v2/datasets/${defaultDatasetId}/items?token=${APIFY_API_TOKEN}`
  );

  const results = await datasetResponse.json();
  
  console.log(`\n✅ Got ${results.length} results\n`);
  
  if (results.length > 0) {
    console.log('Sample result structure:');
    console.log(JSON.stringify(results[0], null, 2).substring(0, 1000));
  }

} catch (error) {
  console.error('\n❌ ERROR:', error.message);
  process.exit(1);
}
