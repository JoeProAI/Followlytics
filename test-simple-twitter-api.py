#!/usr/bin/env python3
import json
import os
import requests
import hmac
import hashlib
import base64
import urllib.parse
import time
import secrets
from datetime import datetime

def generate_oauth_signature(method, url, params, consumer_secret, token_secret=""):
    """Generate OAuth 1.0a signature"""
    # Sort parameters
    sorted_params = sorted(params.items())
    
    # Create parameter string
    param_string = "&".join([f"{k}={v}" for k, v in sorted_params])
    
    # Create signature base string
    base_string = f"{method}&{urllib.parse.quote(url, safe='')}&{urllib.parse.quote(param_string, safe='')}"
    
    # Create signing key
    signing_key = f"{urllib.parse.quote(consumer_secret, safe='')}&{urllib.parse.quote(token_secret, safe='')}"
    
    # Generate signature
    signature = base64.b64encode(
        hmac.new(signing_key.encode(), base_string.encode(), hashlib.sha1).digest()
    ).decode()
    
    return signature

def extract_real_followers():
    """Extract real followers using Twitter API OAuth 1.0a"""
    
    # Get environment variables
    username = os.environ.get('TARGET_USERNAME', 'JoeProAI')
    max_followers = int(os.environ.get('MAX_FOLLOWERS', '100'))
    
    # OAuth credentials
    consumer_key = os.environ.get('TWITTER_API_KEY')
    consumer_secret = os.environ.get('TWITTER_API_SECRET')
    access_token = os.environ.get('TWITTER_ACCESS_TOKEN')
    access_token_secret = os.environ.get('TWITTER_ACCESS_TOKEN_SECRET')
    
    print(f"🎯 Starting Twitter API follower extraction for @{username}")
    print(f"📊 Max followers to extract: {max_followers}")
    
    if not all([consumer_key, consumer_secret, access_token, access_token_secret]):
        print("❌ Missing OAuth credentials")
        return {"followers": [], "followers_found": 0, "error": "Missing OAuth credentials"}
    
    try:
        # Step 1: Get user info first
        print("\n🔍 Step 1: Getting user information...")
        
        user_url = "https://api.twitter.com/1.1/users/show.json"
        user_params = {
            'screen_name': username,
            'oauth_consumer_key': consumer_key,
            'oauth_nonce': secrets.token_hex(16),
            'oauth_signature_method': 'HMAC-SHA1',
            'oauth_timestamp': str(int(time.time())),
            'oauth_token': access_token,
            'oauth_version': '1.0'
        }
        
        # Generate signature for user info request
        user_signature = generate_oauth_signature('GET', user_url, user_params, consumer_secret, access_token_secret)
        user_params['oauth_signature'] = user_signature
        
        # Create authorization header
        auth_header = 'OAuth ' + ', '.join([f'{k}="{urllib.parse.quote(str(v))}"' for k, v in user_params.items() if k.startswith('oauth_')])
        
        # Make user info request
        user_response = requests.get(user_url, params={'screen_name': username}, headers={'Authorization': auth_header})
        
        print(f"   User API Status: {user_response.status_code}")
        
        if user_response.status_code != 200:
            print(f"   ❌ User API Error: {user_response.text}")
            return {"followers": [], "followers_found": 0, "error": f"User API error: {user_response.status_code}"}
        
        user_data = user_response.json()
        user_id = user_data['id_str']
        followers_count = user_data['followers_count']
        
        print(f"   ✅ User ID: {user_id}")
        print(f"   👥 Total followers: {followers_count:,}")
        
        # Step 2: Get followers
        print("\n👥 Step 2: Extracting followers...")
        
        followers_url = "https://api.twitter.com/1.1/followers/list.json"
        followers_params = {
            'user_id': user_id,
            'count': min(200, max_followers),  # Twitter API max is 200 per request
            'skip_status': 'true',
            'include_user_entities': 'false',
            'oauth_consumer_key': consumer_key,
            'oauth_nonce': secrets.token_hex(16),
            'oauth_signature_method': 'HMAC-SHA1',
            'oauth_timestamp': str(int(time.time())),
            'oauth_token': access_token,
            'oauth_version': '1.0'
        }
        
        # Generate signature for followers request
        followers_signature = generate_oauth_signature('GET', followers_url, followers_params, consumer_secret, access_token_secret)
        followers_params['oauth_signature'] = followers_signature
        
        # Create authorization header
        auth_header = 'OAuth ' + ', '.join([f'{k}="{urllib.parse.quote(str(v))}"' for k, v in followers_params.items() if k.startswith('oauth_')])
        
        # Prepare query parameters (non-OAuth params)
        query_params = {
            'user_id': user_id,
            'count': min(200, max_followers),
            'skip_status': 'true',
            'include_user_entities': 'false'
        }
        
        # Make followers request
        followers_response = requests.get(followers_url, params=query_params, headers={'Authorization': auth_header})
        
        print(f"   Followers API Status: {followers_response.status_code}")
        
        if followers_response.status_code != 200:
            print(f"   ❌ Followers API Error: {followers_response.text}")
            return {"followers": [], "followers_found": 0, "error": f"Followers API error: {followers_response.status_code}"}
        
        followers_data = followers_response.json()
        followers_list = followers_data.get('users', [])
        
        print(f"   ✅ Retrieved {len(followers_list)} followers from API")
        
        # Format followers data
        formatted_followers = []
        for i, follower in enumerate(followers_list[:max_followers]):
            formatted_followers.append({
                'username': follower['screen_name'],
                'display_name': follower['name'],
                'user_id': follower['id_str'],
                'followers_count': follower['followers_count'],
                'following_count': follower['friends_count'],
                'verified': follower.get('verified', False),
                'profile_image_url': follower.get('profile_image_url_https', ''),
                'description': follower.get('description', ''),
                'location': follower.get('location', ''),
                'created_at': follower.get('created_at', ''),
                'extracted_at': datetime.now().isoformat(),
                'source': 'twitter_api_v1.1',
                'method': 'oauth_1.0a'
            })
        
        print(f"   📋 Formatted {len(formatted_followers)} followers")
        
        # Sample of extracted usernames
        sample_usernames = [f['username'] for f in formatted_followers[:5]]
        print(f"   📝 Sample usernames: {sample_usernames}")
        
        return {
            "target_username": username,
            "target_user_id": user_id,
            "total_followers_count": followers_count,
            "followers_found": len(formatted_followers),
            "followers": formatted_followers,
            "scan_completed_at": datetime.now().isoformat(),
            "status": "completed",
            "method": "twitter_api_oauth_1.0a"
        }
        
    except Exception as e:
        print(f"❌ Extraction failed: {e}")
        return {"followers": [], "followers_found": 0, "error": str(e)}

if __name__ == "__main__":
    result = extract_real_followers()
    
    # Save results
    with open('/tmp/scan_results.json', 'w') as f:
        json.dump(result, f, indent=2)
    
    print(f"\n=== EXTRACTION COMPLETE ===")
    print(f"Followers extracted: {result['followers_found']}")
    print(f"Results saved to: /tmp/scan_results.json")
