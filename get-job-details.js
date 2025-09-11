const fetch = require('node-fetch');

async function getJobDetails() {
    const jobId = 'daytona_1757552569195_d2af83ed';
    
    try {
        const response = await fetch(`http://localhost:3000/api/scan/daytona?job_id=${jobId}`);
        const data = await response.json();
        
        console.log('=== JOB DETAILS ===');
        console.log(JSON.stringify(data, null, 2));
        
    } catch (error) {
        console.error('Failed to get job details:', error.message);
    }
}

getJobDetails();
