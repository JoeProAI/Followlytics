const fetch = require('node-fetch');

async function debugAPIResponse() {
    console.log('🔍 Debugging Daytona API Response...');
    
    try {
        const response = await fetch('http://localhost:3000/api/scan/daytona', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                username: 'JoeProAI',
                maxFollowers: 100
            })
        });
        
        console.log(`Status: ${response.status}`);
        console.log(`Headers:`, Object.fromEntries(response.headers.entries()));
        
        const responseText = await response.text();
        console.log(`Raw response:`, responseText);
        
        try {
            const parsed = JSON.parse(responseText);
            console.log(`Parsed JSON:`, JSON.stringify(parsed, null, 2));
        } catch (parseError) {
            console.log(`JSON parse error:`, parseError.message);
        }
        
    } catch (error) {
        console.error('Request failed:', error.message);
    }
}

debugAPIResponse();
