# Test Daytona API endpoints to understand the structure
import asyncio
import aiohttp
import json
from .config import config

async def test_daytona_endpoints():
    """Test various Daytona API endpoints to find the correct structure"""
    
    headers = {
        'Authorization': f'Bearer {config.api_key}',
        'Content-Type': 'application/json'
    }
    
    # Common endpoint patterns to try
    endpoints_to_test = [
        '/workspaces',
        '/workspace',
        '/projects', 
        '/project',
        '/sandboxes',
        '/sandbox',
        f'/org/{config.organization_id}/workspaces',
        f'/organizations/{config.organization_id}/workspaces',
        '/user/workspaces',
        '/api/workspaces',
        '/v1/workspaces',
        '/health',
        '/status',
        '/'
    ]
    
    async with aiohttp.ClientSession(headers=headers) as session:
        print(f"Testing Daytona API at: {config.api_url}")
        print(f"Organization ID: {config.organization_id}")
        print("=" * 60)
        
        for endpoint in endpoints_to_test:
            try:
                url = f"{config.api_url.rstrip('/')}{endpoint}"
                print(f"Testing: {endpoint}")
                
                async with session.get(url) as response:
                    status = response.status
                    content_type = response.headers.get('content-type', '')
                    
                    if status == 200:
                        if 'json' in content_type:
                            data = await response.json()
                            print(f"  SUCCESS (200) - JSON response with {len(data)} keys")
                            if isinstance(data, dict):
                                print(f"     Keys: {list(data.keys())}")
                            elif isinstance(data, list):
                                print(f"     List with {len(data)} items")
                        else:
                            text = await response.text()
                            print(f"  SUCCESS (200) - Text response ({len(text)} chars)")
                    elif status == 401:
                        print(f"  UNAUTHORIZED (401) - Check API key")
                    elif status == 403:
                        print(f"  FORBIDDEN (403) - Check permissions")
                    elif status == 404:
                        print(f"  NOT FOUND (404)")
                    else:
                        print(f"  STATUS {status}")
                        
            except Exception as e:
                print(f"  ERROR: {e}")
        
        print("=" * 60)
        print("API exploration complete")

if __name__ == "__main__":
    asyncio.run(test_daytona_endpoints())
