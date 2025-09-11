const fetch = require('node-fetch');

async function testDaytonaAPIConsent() {
    console.log('🧪 Testing Twitter App Consent via Daytona API...');
    
    const username = 'JoeProAI';
    const maxFollowers = 100;
    
    try {
        // Test the actual API endpoint
        const apiUrl = 'http://localhost:3000/api/scan/daytona';
        
        console.log('🚀 Calling Daytona scan API...');
        console.log(`   Target: @${username}`);
        console.log(`   Max followers: ${maxFollowers}`);
        
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                username: username,
                maxFollowers: maxFollowers
            })
        });
        
        console.log(`📡 Response status: ${response.status}`);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.log(`❌ API Error: ${errorText}`);
            return {
                success: false,
                error: `HTTP ${response.status}: ${errorText}`
            };
        }
        
        const result = await response.json();
        console.log('✅ API Response received');
        
        if (result.job_id) {
            console.log(`🆔 Job ID: ${result.job_id}`);
            console.log(`📦 Sandbox ID: ${result.sandbox_id}`);
            console.log(`👤 Username: ${result.username}`);
            console.log(`📊 Account size: ${result.account_size}`);
            console.log(`⏱️ Estimated duration: ${result.estimated_duration}`);
            console.log('⏳ Monitoring job progress...');
            
            // Monitor job progress
            let attempts = 0;
            const maxAttempts = 60; // 5 minutes max
            
            while (attempts < maxAttempts) {
                await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
                
                try {
                    const statusResponse = await fetch(`${apiUrl}?job_id=${result.job_id}`);
                    
                    if (statusResponse.ok) {
                        const status = await statusResponse.json();
                        
                        console.log(`📊 Progress: ${status.progress}% - ${status.phase}`);
                        
                        if (status.status === 'completed') {
                            console.log('🎉 Job completed successfully!');
                            console.log(`👥 Followers found: ${status.followers_found || 0}`);
                            
                            if (status.followers && status.followers.length > 0) {
                                console.log('📝 Sample followers:');
                                status.followers.slice(0, 10).forEach((follower, index) => {
                                    console.log(`   ${index + 1}. @${follower.username}`);
                                });
                            }
                            
                            return {
                                success: true,
                                jobId: result.job_id,
                                followers_found: status.followers_found || 0,
                                followers: status.followers || [],
                                method: status.method || 'twitter_app_consent',
                                status: 'completed'
                            };
                            
                        } else if (status.status === 'failed') {
                            console.log('❌ Job failed');
                            console.log(`Error: ${status.error || 'Unknown error'}`);
                            
                            return {
                                success: false,
                                jobId: result.job_id,
                                error: status.error || 'Job failed',
                                status: 'failed'
                            };
                            
                        } else {
                            console.log(`   Status: ${status.status} - ${status.phase || 'processing'}`);
                        }
                    } else {
                        console.log(`⚠️ Status check failed: ${statusResponse.status}`);
                    }
                    
                } catch (statusError) {
                    console.log(`⚠️ Status check error: ${statusError.message}`);
                }
                
                attempts++;
            }
            
            console.log('⏰ Job monitoring timeout reached');
            return {
                success: false,
                jobId: result.job_id,
                error: 'Job monitoring timeout',
                status: 'timeout'
            };
            
        } else {
            console.log('❌ No job ID returned from API');
            return {
                success: false,
                error: 'No job ID returned',
                result: result
            };
        }
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        return {
            success: false,
            error: error.message
        };
    }
}

// Run the test
testDaytonaAPIConsent()
    .then(results => {
        console.log('\n=== DAYTONA API CONSENT TEST RESULTS ===');
        console.log(`Success: ${results.success}`);
        
        if (results.success) {
            console.log(`Job ID: ${results.jobId}`);
            console.log(`Followers found: ${results.followers_found}`);
            console.log(`Method: ${results.method}`);
            console.log(`Status: ${results.status}`);
        } else {
            console.log(`Error: ${results.error}`);
        }
        
        console.log('\n🎉 Test completed!');
    })
    .catch(error => {
        console.error('💥 Test failed:', error);
    });
