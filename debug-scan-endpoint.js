// Debug which scan endpoint is being called
console.log('🔍 Checking which scan endpoints exist...');

const fs = require('fs');
const path = require('path');

function findFiles(dir, pattern, results = []) {
  const files = fs.readdirSync(dir);
  
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      findFiles(fullPath, pattern, results);
    } else if (file.match(pattern)) {
      results.push(fullPath);
    }
  }
  
  return results;
}

// Find all scan API routes
const scanRoutes = findFiles('./src/app/api/scan', /route\.ts$/);

console.log('\n📊 Found scan API endpoints:');
scanRoutes.forEach(route => {
  const relativePath = route.replace('./src/app/api/', '');
  const endpoint = '/' + relativePath.replace('/route.ts', '').replace(/\\/g, '/');
  console.log(`  ${endpoint}`);
});

// Check if the dashboard is using the correct endpoint
const dashboardFile = './src/app/dashboard/page.tsx';
if (fs.existsSync(dashboardFile)) {
  const dashboardContent = fs.readFileSync(dashboardFile, 'utf8');
  
  console.log('\n🔍 Dashboard scan endpoint usage:');
  
  if (dashboardContent.includes('/api/scan/auto')) {
    console.log('  ✅ Uses /api/scan/auto (CORRECT - OAuth tokens)');
  }
  
  if (dashboardContent.includes('/api/scan/transfer-session')) {
    console.log('  ❌ Uses /api/scan/transfer-session (OLD - authentication signal)');
  }
  
  if (dashboardContent.includes('twitter-auth')) {
    console.log('  ⚠️ References twitter-auth page (OLD FLOW)');
  }
  
  if (dashboardContent.includes('checkTwitterAuthStatus')) {
    console.log('  ✅ Has Twitter auth status check (NEW FLOW)');
  }
}

// Check FollowerScanner component
const followerScannerFile = './src/components/dashboard/FollowerScanner.tsx';
if (fs.existsSync(followerScannerFile)) {
  const scannerContent = fs.readFileSync(followerScannerFile, 'utf8');
  
  console.log('\n🔍 FollowerScanner endpoint usage:');
  
  if (scannerContent.includes('/api/scan/auto')) {
    console.log('  ✅ Uses /api/scan/auto (CORRECT)');
  }
  
  if (scannerContent.includes('/api/scan/transfer-session')) {
    console.log('  ❌ Uses /api/scan/transfer-session (OLD)');
  }
  
  if (scannerContent.includes('twitter-auth')) {
    console.log('  ⚠️ References twitter-auth page');
  }
}

console.log('\n🎯 DIAGNOSIS:');
console.log('If you see "Uses /api/scan/auto" above, the code is correct.');
console.log('If you still see transfer-session logs, it means:');
console.log('1. Vercel is serving cached version (redeploy needed)');
console.log('2. User is accessing old URL/bookmark');
console.log('3. Browser cache needs clearing');
