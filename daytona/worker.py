# Followlytics Enterprise Worker Service
import asyncio
import json
import logging
import os
import time
from datetime import datetime
from typing import Dict, List, Optional, Any
from dataclasses import dataclass
import aiohttp
from playwright.async_api import async_playwright
from bs4 import BeautifulSoup
import random

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@dataclass
class FollowerData:
    """Represents a follower's data"""
    username: str
    display_name: str
    bio: str
    follower_count: int
    following_count: int
    verified: bool
    profile_image_url: str
    joined_date: Optional[str] = None

class FollowerWorker:
    """Worker service for scanning X followers"""
    
    def __init__(self, worker_id: str, coordinator_url: str, shared_volume: str):
        self.worker_id = worker_id
        self.coordinator_url = coordinator_url
        self.shared_volume = shared_volume
        self.current_job_id: Optional[str] = None
        self.session: Optional[aiohttp.ClientSession] = None
        self.playwright = None
        self.browser = None
        self.context = None
        
    async def initialize(self):
        """Initialize the worker"""
        logger.info(f"Initializing worker {self.worker_id}")
        
        # Initialize HTTP session for coordinator communication
        self.session = aiohttp.ClientSession()
        
        # Initialize Playwright
        self.playwright = await async_playwright().start()
        self.browser = await self.playwright.chromium.launch(
            headless=True,
            args=[
                '--no-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu',
                '--disable-web-security',
                '--disable-features=VizDisplayCompositor'
            ]
        )
        
        # Create browser context with realistic settings
        self.context = await self.browser.new_context(
            viewport={'width': 1920, 'height': 1080},
            user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        )
        
        logger.info(f"Worker {self.worker_id} initialized successfully")
    
    async def cleanup(self):
        """Cleanup resources"""
        if self.context:
            await self.context.close()
        if self.browser:
            await self.browser.close()
        if self.playwright:
            await self.playwright.stop()
        if self.session:
            await self.session.close()
    
    async def send_heartbeat(self, job_id: Optional[str] = None, progress: float = 0.0):
        """Send heartbeat to coordinator"""
        try:
            data = {
                "timestamp": datetime.utcnow().isoformat(),
                "status": "busy" if job_id else "idle"
            }
            
            if job_id:
                data["job_id"] = job_id
                data["progress"] = progress
            
            async with self.session.post(
                f"{self.coordinator_url}/worker/{self.worker_id}/heartbeat",
                json=data
            ) as response:
                if response.status != 200:
                    logger.warning(f"Heartbeat failed: {response.status}")
                    
        except Exception as e:
            logger.error(f"Failed to send heartbeat: {e}")
    
    async def report_job_completion(self, job_id: str, success: bool, error_message: Optional[str] = None):
        """Report job completion to coordinator"""
        try:
            data = {
                "job_id": job_id,
                "success": success,
                "completed_at": datetime.utcnow().isoformat()
            }
            
            if error_message:
                data["error_message"] = error_message
            
            async with self.session.post(
                f"{self.coordinator_url}/worker/{self.worker_id}/complete",
                json=data
            ) as response:
                if response.status == 200:
                    logger.info(f"Job completion reported: {job_id}")
                else:
                    logger.warning(f"Failed to report completion: {response.status}")
                    
        except Exception as e:
            logger.error(f"Failed to report job completion: {e}")
    
    async def process_job_file(self, job_file_path: str):
        """Process a job from file"""
        try:
            with open(job_file_path, 'r') as f:
                job_data = json.load(f)
            
            await self.process_job(job_data)
            
        except Exception as e:
            logger.error(f"Failed to process job file {job_file_path}: {e}")
    
    async def process_job(self, job_data: Dict[str, Any]):
        """Process a follower scanning job chunk"""
        job_id = job_data["job_id"]
        username = job_data["username"]
        start_offset = job_data["start_offset"]
        end_offset = job_data["end_offset"]
        chunk_id = job_data["chunk_id"]
        
        self.current_job_id = job_id
        
        logger.info(f"Processing job {job_id} chunk {chunk_id}: {username} followers {start_offset}-{end_offset}")
        
        try:
            # Navigate to followers page
            page = await self.context.new_page()
            
            # Set up request interception for rate limiting
            await page.route("**/*", self.handle_request)
            
            followers_url = f"https://x.com/{username}/followers"
            await page.goto(followers_url, wait_until="networkidle")
            
            # Wait for followers to load
            await page.wait_for_selector('[data-testid="UserCell"]', timeout=30000)
            
            # Scroll to start offset
            if start_offset > 0:
                await self.scroll_to_offset(page, start_offset)
            
            # Collect followers in this chunk
            followers = []
            current_count = start_offset
            
            while current_count < end_offset:
                # Send progress update
                progress = (current_count - start_offset) / (end_offset - start_offset)
                await self.send_heartbeat(job_id, progress)
                
                # Extract followers from current view
                new_followers = await self.extract_followers_from_page(page)
                
                for follower in new_followers:
                    if current_count >= end_offset:
                        break
                    
                    followers.append(follower)
                    current_count += 1
                
                # Scroll to load more
                if current_count < end_offset:
                    await self.scroll_and_wait(page)
                    await asyncio.sleep(random.uniform(1, 3))  # Random delay
            
            # Save chunk results
            await self.save_chunk_results(job_id, chunk_id, followers)
            
            # Report success
            await self.report_job_completion(job_id, True)
            
            logger.info(f"Completed job {job_id} chunk {chunk_id}: collected {len(followers)} followers")
            
        except Exception as e:
            logger.error(f"Job {job_id} chunk {chunk_id} failed: {e}")
            await self.report_job_completion(job_id, False, str(e))
        
        finally:
            if 'page' in locals():
                await page.close()
            self.current_job_id = None
    
    async def handle_request(self, route):
        """Handle requests for rate limiting and filtering"""
        request = route.request
        
        # Block unnecessary resources to speed up loading
        if request.resource_type in ["image", "media", "font"]:
            await route.abort()
        else:
            # Add random delay to avoid detection
            await asyncio.sleep(random.uniform(0.1, 0.5))
            await route.continue_()
    
    async def scroll_to_offset(self, page, offset: int):
        """Scroll to a specific follower offset"""
        logger.info(f"Scrolling to offset {offset}")
        
        # Estimate scroll distance (approximately 100px per follower)
        scroll_distance = offset * 100
        
        await page.evaluate(f"window.scrollTo(0, {scroll_distance})")
        await page.wait_for_timeout(2000)
        
        # Fine-tune by counting actual followers
        current_followers = await page.query_selector_all('[data-testid="UserCell"]')
        
        while len(current_followers) < offset:
            await self.scroll_and_wait(page)
            current_followers = await page.query_selector_all('[data-testid="UserCell"]')
            
            if len(current_followers) == 0:
                break  # No more followers to load
    
    async def scroll_and_wait(self, page):
        """Scroll down and wait for new content"""
        await page.evaluate("window.scrollBy(0, 1000)")
        await page.wait_for_timeout(random.uniform(1000, 2000))
        
        # Wait for new content to load
        try:
            await page.wait_for_function(
                "document.querySelectorAll('[data-testid=\"UserCell\"]').length > arguments[0]",
                timeout=5000
            )
        except:
            pass  # Timeout is okay, might be end of list
    
    async def extract_followers_from_page(self, page) -> List[FollowerData]:
        """Extract follower data from current page view"""
        followers = []
        
        try:
            # Get all user cells currently visible
            user_cells = await page.query_selector_all('[data-testid="UserCell"]')
            
            for cell in user_cells:
                try:
                    follower = await self.extract_follower_data(cell)
                    if follower:
                        followers.append(follower)
                except Exception as e:
                    logger.debug(f"Failed to extract follower data: {e}")
                    continue
            
        except Exception as e:
            logger.error(f"Failed to extract followers from page: {e}")
        
        return followers
    
    async def extract_follower_data(self, cell) -> Optional[FollowerData]:
        """Extract data from a single follower cell"""
        try:
            # Extract username
            username_element = await cell.query_selector('[data-testid="User-Name"] a')
            if not username_element:
                return None
            
            username_href = await username_element.get_attribute('href')
            username = username_href.split('/')[-1] if username_href else ""
            
            # Extract display name
            display_name_element = await cell.query_selector('[data-testid="User-Name"] span')
            display_name = await display_name_element.inner_text() if display_name_element else ""
            
            # Extract bio
            bio_element = await cell.query_selector('[data-testid="UserDescription"]')
            bio = await bio_element.inner_text() if bio_element else ""
            
            # Extract profile image
            img_element = await cell.query_selector('img')
            profile_image_url = await img_element.get_attribute('src') if img_element else ""
            
            # Check if verified
            verified_element = await cell.query_selector('[data-testid="Icon"][aria-label*="Verified"]')
            verified = verified_element is not None
            
            # Extract follower/following counts (if visible)
            follower_count = 0
            following_count = 0
            
            # These might not be visible in the followers list
            # Would need to visit profile for accurate counts
            
            return FollowerData(
                username=username,
                display_name=display_name,
                bio=bio,
                follower_count=follower_count,
                following_count=following_count,
                verified=verified,
                profile_image_url=profile_image_url
            )
            
        except Exception as e:
            logger.debug(f"Failed to extract follower data from cell: {e}")
            return None
    
    async def save_chunk_results(self, job_id: str, chunk_id: int, followers: List[FollowerData]):
        """Save chunk results to shared volume"""
        try:
            # Create results directory
            results_dir = f"{self.shared_volume}/results/{job_id}"
            os.makedirs(results_dir, exist_ok=True)
            
            # Save chunk data
            chunk_file = f"{results_dir}/chunk_{chunk_id}.json"
            
            chunk_data = {
                "job_id": job_id,
                "chunk_id": chunk_id,
                "worker_id": self.worker_id,
                "completed_at": datetime.utcnow().isoformat(),
                "follower_count": len(followers),
                "followers": [
                    {
                        "username": f.username,
                        "display_name": f.display_name,
                        "bio": f.bio,
                        "follower_count": f.follower_count,
                        "following_count": f.following_count,
                        "verified": f.verified,
                        "profile_image_url": f.profile_image_url,
                        "joined_date": f.joined_date
                    }
                    for f in followers
                ]
            }
            
            with open(chunk_file, 'w') as f:
                json.dump(chunk_data, f, indent=2)
            
            logger.info(f"Saved {len(followers)} followers to {chunk_file}")
            
        except Exception as e:
            logger.error(f"Failed to save chunk results: {e}")
            raise
    
    async def run(self):
        """Main worker loop"""
        await self.initialize()
        
        try:
            logger.info(f"Worker {self.worker_id} started, waiting for jobs...")
            
            # Main work loop
            while True:
                # Send heartbeat
                await self.send_heartbeat()
                
                # Check for new job files
                jobs_dir = f"{self.shared_volume}/jobs"
                if os.path.exists(jobs_dir):
                    job_files = [f for f in os.listdir(jobs_dir) if f.endswith('.json')]
                    
                    for job_file in job_files:
                        job_file_path = os.path.join(jobs_dir, job_file)
                        
                        # Process job
                        await self.process_job_file(job_file_path)
                        
                        # Remove processed job file
                        os.remove(job_file_path)
                
                # Wait before checking again
                await asyncio.sleep(10)
                
        except KeyboardInterrupt:
            logger.info("Worker shutting down...")
        except Exception as e:
            logger.error(f"Worker error: {e}")
        finally:
            await self.cleanup()

async def main():
    """Main entry point"""
    worker_id = os.getenv('WORKER_ID', 'worker-1')
    coordinator_url = os.getenv('COORDINATOR_URL', 'http://localhost:8000')
    shared_volume = os.getenv('SHARED_VOLUME', '/shared')
    
    worker = FollowerWorker(worker_id, coordinator_url, shared_volume)
    await worker.run()

if __name__ == "__main__":
    asyncio.run(main())
