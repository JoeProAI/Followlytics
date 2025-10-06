// Apollo.io API Test Script
const APOLLO_API_KEY = 'Ju7zjxG8DYRXDUJt9F9img';
const APOLLO_BASE_URL = 'https://api.apollo.io/v1';

async function testApolloAPI() {
  console.log('🔍 Testing Apollo.io API...\n');

  // Test 1: Health Check
  console.log('1. Health Check');
  try {
    const healthResponse = await fetch(`${APOLLO_BASE_URL}/auth/health`, {
      headers: {
        'X-Api-Key': APOLLO_API_KEY,
        'Content-Type': 'application/json'
      }
    });
    const healthData = await healthResponse.json();
    console.log('✅ API Key Valid:', JSON.stringify(healthData, null, 2));
    console.log('');
  } catch (error) {
    console.log('❌ Health check failed:', error.message);
    console.log('');
  }

  // Test 2: Get Account Info
  console.log('2. Account Information');
  try {
    const accountResponse = await fetch(`${APOLLO_BASE_URL}/users/api_key_details`, {
      headers: {
        'X-Api-Key': APOLLO_API_KEY,
        'Content-Type': 'application/json'
      }
    });
    const accountData = await accountResponse.json();
    console.log('Account Details:', JSON.stringify(accountData, null, 2));
    console.log('');
  } catch (error) {
    console.log('❌ Account check failed:', error.message);
    console.log('');
  }

  // Test 3: Check Credits
  console.log('3. Credit Usage');
  try {
    const creditsResponse = await fetch(`${APOLLO_BASE_URL}/credits`, {
      headers: {
        'X-Api-Key': APOLLO_API_KEY,
        'Content-Type': 'application/json'
      }
    });
    const creditsData = await creditsResponse.json();
    console.log('Credits:', JSON.stringify(creditsData, null, 2));
    console.log('');
  } catch (error) {
    console.log('❌ Credits check failed:', error.message);
    console.log('');
  }

  // Test 4: People Match (Test with known Twitter user)
  console.log('4. People Match Test (Elon Musk)');
  try {
    const matchResponse = await fetch(`${APOLLO_BASE_URL}/people/match`, {
      method: 'POST',
      headers: {
        'X-Api-Key': APOLLO_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        first_name: 'Elon',
        last_name: 'Musk',
        organization_name: 'Tesla'
      })
    });
    const matchData = await matchResponse.json();
    console.log('Match Result:', JSON.stringify(matchData, null, 2));
    console.log('');
  } catch (error) {
    console.log('❌ People match failed:', error.message);
    console.log('');
  }

  // Test 5: People Search by Twitter
  console.log('5. People Search by Twitter Handle');
  try {
    const searchResponse = await fetch(`${APOLLO_BASE_URL}/people/search`, {
      method: 'POST',
      headers: {
        'X-Api-Key': APOLLO_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        q_twitter_handle: 'elonmusk',
        page: 1,
        per_page: 1
      })
    });
    const searchData = await searchResponse.json();
    console.log('Search Result:', JSON.stringify(searchData, null, 2));
    console.log('');
  } catch (error) {
    console.log('❌ People search failed:', error.message);
    console.log('');
  }

  // Test 6: Organization Search
  console.log('6. Organization Search Test');
  try {
    const orgResponse = await fetch(`${APOLLO_BASE_URL}/organizations/search`, {
      method: 'POST',
      headers: {
        'X-Api-Key': APOLLO_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        q_organization_name: 'Tesla',
        page: 1,
        per_page: 1
      })
    });
    const orgData = await orgResponse.json();
    console.log('Organization Result:', JSON.stringify(orgData, null, 2));
    console.log('');
  } catch (error) {
    console.log('❌ Organization search failed:', error.message);
    console.log('');
  }

  console.log('\n✅ API Analysis Complete!');
}

// Run the tests
testApolloAPI().catch(error => {
  console.error('Fatal error:', error);
});
