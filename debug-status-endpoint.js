const fetch = require('node-fetch');

async function debugStatusEndpoint() {
    console.log('🔍 Debugging Status Endpoint...');
    
    const jobId = 'daytona_1757552569195_d2af83ed'; // Use the job ID from previous test
    
    try {
        // Test different parameter formats
        const testUrls = [
            `http://localhost:3000/api/scan/daytona?job_id=${jobId}`,
            `http://localhost:3000/api/scan/daytona?jobId=${jobId}`,
            `http://localhost:3000/api/scan/daytona/${jobId}`
        ];
        
        for (const url of testUrls) {
            console.log(`\n🧪 Testing: ${url}`);
            
            try {
                const response = await fetch(url);
                console.log(`   Status: ${response.status}`);
                
                const responseText = await response.text();
                console.log(`   Response: ${responseText.slice(0, 200)}...`);
                
                if (response.ok) {
                    try {
                        const parsed = JSON.parse(responseText);
                        console.log(`   ✅ Success! Progress: ${parsed.progress}%, Phase: ${parsed.phase}`);
                    } catch (parseError) {
                        console.log(`   ⚠️ JSON parse error: ${parseError.message}`);
                    }
                }
                
            } catch (requestError) {
                console.log(`   ❌ Request failed: ${requestError.message}`);
            }
        }
        
    } catch (error) {
        console.error('Debug failed:', error.message);
    }
}

debugStatusEndpoint();
