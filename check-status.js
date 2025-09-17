// Quick status checker for the extraction
const sandboxId = '52917708-d2f8-44dc-9995-24b4e3b12663';

async function checkStatus() {
  try {
    const response = await fetch(`https://followlytics-git-main-joeproais-projects.vercel.app/api/scan/status?sandboxId=${sandboxId}`);
    const data = await response.json();
    
    console.log('🔍 Extraction Status:');
    console.log('Status:', data.status);
    console.log('Message:', data.message);
    
    if (data.status === 'completed') {
      console.log('🎉 EXTRACTION COMPLETE!');
      console.log('Followers found:', data.result.followerCount);
      console.log('Strategy:', data.result.strategy);
    } else if (data.status === 'in_progress') {
      console.log('⏳ Still running...');
      if (data.lastLogLines && data.lastLogLines.length > 0) {
        console.log('Recent activity:');
        data.lastLogLines.forEach(line => console.log('  ', line));
      }
    } else {
      console.log('❌ Status:', data.status);
      console.log('Error:', data.error);
    }
    
  } catch (error) {
    console.error('❌ Failed to check status:', error.message);
  }
}

checkStatus();
