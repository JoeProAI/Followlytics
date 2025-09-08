# Unified Daytona Coordinator for All Follower Scanning (Small to Massive Scale)
import asyncio
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass
from enum import Enum
import json

from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from .client import DaytonaClient
from .auto_scaler import AutoScaler, ScalingMetrics
from .cost_optimizer import CostOptimizer
from .volume_manager import VolumeManager
from .config import config

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class AccountSize(Enum):
    """Account size categories for optimized processing"""
    MICRO = "micro"      # 0-10K followers
    SMALL = "small"      # 10K-100K followers  
    MEDIUM = "medium"    # 100K-1M followers
    LARGE = "large"      # 1M-10M followers
    MEGA = "mega"        # 10M+ followers

class JobPriority(Enum):
    """Job priority levels"""
    LOW = "low"
    NORMAL = "normal"
    HIGH = "high"
    URGENT = "urgent"

@dataclass
class OptimizedWorkerConfig:
    """Optimized worker configuration for different account sizes"""
    account_size: AccountSize
    cpu_cores: int
    memory_gb: int
    disk_gb: int
    concurrent_pages: int
    batch_size: int
    expected_duration_minutes: int
    cost_per_hour: float

class UnifiedScanRequest(BaseModel):
    """Unified scan request for all account sizes"""
    username: str
    priority: JobPriority = JobPriority.NORMAL
    estimated_followers: Optional[int] = None
    force_account_size: Optional[AccountSize] = None
    webhook_url: Optional[str] = None
    user_id: Optional[str] = None

class FastScanJob:
    """Fast scan job with optimized routing"""
    
    def __init__(self, request: UnifiedScanRequest):
        self.id = f"scan_{int(datetime.utcnow().timestamp())}_{request.username}"
        self.username = request.username
        self.priority = request.priority
        self.estimated_followers = request.estimated_followers
        self.account_size = self._determine_account_size(request)
        self.worker_config = self._get_worker_config()
        self.status = "queued"
        self.created_at = datetime.utcnow()
        self.started_at: Optional[datetime] = None
        self.completed_at: Optional[datetime] = None
        self.worker_id: Optional[str] = None
        self.results: Dict[str, Any] = {}
        self.error: Optional[str] = None
        self.webhook_url = request.webhook_url
        self.user_id = request.user_id
        
    def _determine_account_size(self, request: UnifiedScanRequest) -> AccountSize:
        """Intelligently determine account size for optimal processing"""
        
        if request.force_account_size:
            return request.force_account_size
            
        if request.estimated_followers:
            followers = request.estimated_followers
            if followers < 10000:
                return AccountSize.MICRO
            elif followers < 100000:
                return AccountSize.SMALL
            elif followers < 1000000:
                return AccountSize.MEDIUM
            elif followers < 10000000:
                return AccountSize.LARGE
            else:
                return AccountSize.MEGA
        
        # Default to small for unknown accounts
        return AccountSize.SMALL
    
    def _get_worker_config(self) -> OptimizedWorkerConfig:
        """Get optimized worker configuration"""
        
        configs = {
            AccountSize.MICRO: OptimizedWorkerConfig(
                account_size=AccountSize.MICRO,
                cpu_cores=1,
                memory_gb=2,
                disk_gb=10,
                concurrent_pages=2,
                batch_size=500,
                expected_duration_minutes=2,
                cost_per_hour=1.0
            ),
            AccountSize.SMALL: OptimizedWorkerConfig(
                account_size=AccountSize.SMALL,
                cpu_cores=2,
                memory_gb=4,
                disk_gb=20,
                concurrent_pages=4,
                batch_size=1000,
                expected_duration_minutes=5,
                cost_per_hour=2.0
            ),
            AccountSize.MEDIUM: OptimizedWorkerConfig(
                account_size=AccountSize.MEDIUM,
                cpu_cores=4,
                memory_gb=8,
                disk_gb=30,
                concurrent_pages=6,
                batch_size=2000,
                expected_duration_minutes=15,
                cost_per_hour=4.0
            ),
            AccountSize.LARGE: OptimizedWorkerConfig(
                account_size=AccountSize.LARGE,
                cpu_cores=8,
                memory_gb=16,
                disk_gb=50,
                concurrent_pages=8,
                batch_size=5000,
                expected_duration_minutes=45,
                cost_per_hour=8.0
            ),
            AccountSize.MEGA: OptimizedWorkerConfig(
                account_size=AccountSize.MEGA,
                cpu_cores=16,
                memory_gb=32,
                disk_gb=100,
                concurrent_pages=12,
                batch_size=10000,
                expected_duration_minutes=120,
                cost_per_hour=16.0
            )
        }
        
        return configs[self.account_size]

class UnifiedCoordinator:
    """Unified coordinator for all follower scanning using Daytona"""
    
    def __init__(self):
        self.client: Optional[DaytonaClient] = None
        self.auto_scaler: Optional[AutoScaler] = None
        self.cost_optimizer: Optional[CostOptimizer] = None
        self.volume_manager: Optional[VolumeManager] = None
        
        # Job management
        self.active_jobs: Dict[str, FastScanJob] = {}
        self.job_queue: List[FastScanJob] = []
        self.worker_pools: Dict[AccountSize, List[str]] = {
            size: [] for size in AccountSize
        }
        
        # Performance tracking
        self.processing_stats = {
            "total_jobs": 0,
            "completed_jobs": 0,
            "failed_jobs": 0,
            "average_processing_time": {},
            "cost_per_follower": {}
        }
        
    async def initialize(self):
        """Initialize unified coordinator"""
        logger.info("Initializing Unified Daytona Coordinator...")
        
        self.client = DaytonaClient()
        await self.client.__aenter__()
        
        self.volume_manager = VolumeManager(self.client)
        await self.volume_manager.initialize()
        
        self.auto_scaler = AutoScaler(self.client)
        self.cost_optimizer = CostOptimizer(self.client)
        
        # Start background tasks
        asyncio.create_task(self._job_processor())
        asyncio.create_task(self._worker_manager())
        asyncio.create_task(self._performance_monitor())
        
        logger.info("Unified Coordinator initialized successfully")
    
    async def submit_scan(self, request: UnifiedScanRequest) -> Dict[str, Any]:
        """Submit a follower scan job (unified entry point)"""
        
        job = FastScanJob(request)
        
        # Add to queue with priority ordering
        if request.priority in [JobPriority.HIGH, JobPriority.URGENT]:
            self.job_queue.insert(0, job)  # High priority to front
        else:
            self.job_queue.append(job)  # Normal/low priority to back
        
        self.active_jobs[job.id] = job
        self.processing_stats["total_jobs"] += 1
        
        logger.info(f"Submitted {job.account_size.value} scan job: {job.username} ({job.id})")
        
        return {
            "job_id": job.id,
            "username": job.username,
            "account_size": job.account_size.value,
            "estimated_duration": job.worker_config.expected_duration_minutes,
            "estimated_cost": job.worker_config.cost_per_hour * (job.worker_config.expected_duration_minutes / 60),
            "queue_position": len(self.job_queue),
            "status": "queued"
        }
    
    async def get_job_status(self, job_id: str) -> Dict[str, Any]:
        """Get detailed job status"""
        
        if job_id not in self.active_jobs:
            raise HTTPException(status_code=404, detail="Job not found")
        
        job = self.active_jobs[job_id]
        
        # Calculate progress
        progress = 0
        if job.status == "running" and job.results.get("followers_processed"):
            estimated_total = job.estimated_followers or 50000
            progress = min(95, (job.results["followers_processed"] / estimated_total) * 100)
        elif job.status == "completed":
            progress = 100
        
        return {
            "job_id": job.id,
            "username": job.username,
            "status": job.status,
            "account_size": job.account_size.value,
            "progress": progress,
            "created_at": job.created_at.isoformat(),
            "started_at": job.started_at.isoformat() if job.started_at else None,
            "completed_at": job.completed_at.isoformat() if job.completed_at else None,
            "worker_id": job.worker_id,
            "results": job.results,
            "error": job.error,
            "estimated_completion": self._estimate_completion_time(job)
        }
    
    async def _job_processor(self):
        """Background job processor"""
        
        while True:
            try:
                if self.job_queue:
                    job = self.job_queue.pop(0)
                    
                    # Get or create optimized worker
                    worker_id = await self._get_optimized_worker(job.account_size)
                    
                    if worker_id:
                        await self._execute_job(job, worker_id)
                    else:
                        # No worker available, put job back in queue
                        self.job_queue.insert(0, job)
                        logger.warning(f"No worker available for {job.account_size.value} job, requeueing")
                
                await asyncio.sleep(5)  # Check every 5 seconds
                
            except Exception as e:
                logger.error(f"Job processor error: {e}")
                await asyncio.sleep(10)
    
    async def _get_optimized_worker(self, account_size: AccountSize) -> Optional[str]:
        """Get or create optimized worker for account size"""
        
        # Check if we have available workers for this size
        available_workers = self.worker_pools[account_size]
        
        if available_workers:
            return available_workers[0]  # Return first available worker
        
        # Create new optimized worker
        worker_config = OptimizedWorkerConfig(
            account_size=account_size,
            cpu_cores=2 if account_size == AccountSize.MICRO else 4 if account_size == AccountSize.SMALL else 8,
            memory_gb=2 if account_size == AccountSize.MICRO else 4 if account_size == AccountSize.SMALL else 16,
            disk_gb=10 if account_size == AccountSize.MICRO else 20 if account_size == AccountSize.SMALL else 50,
            concurrent_pages=2 if account_size == AccountSize.MICRO else 4 if account_size == AccountSize.SMALL else 8,
            batch_size=500 if account_size == AccountSize.MICRO else 1000 if account_size == AccountSize.SMALL else 5000,
            expected_duration_minutes=2 if account_size == AccountSize.MICRO else 5 if account_size == AccountSize.SMALL else 30,
            cost_per_hour=1.0 if account_size == AccountSize.MICRO else 2.0 if account_size == AccountSize.SMALL else 8.0
        )
        
        worker_sandbox = await self.client.create_sandbox(
            name=f"followlytics-{account_size.value}-worker",
            auto_stop_minutes=30,  # Aggressive auto-stop for cost optimization
            resources={
                "cpu": worker_config.cpu_cores,
                "memory": worker_config.memory_gb,
                "disk": worker_config.disk_gb
            }
        )
        
        if worker_sandbox:
            # Setup optimized worker
            await self._setup_optimized_worker(worker_sandbox.id, worker_config)
            self.worker_pools[account_size].append(worker_sandbox.id)
            return worker_sandbox.id
        
        return None
    
    async def _setup_optimized_worker(self, worker_id: str, config: OptimizedWorkerConfig):
        """Setup optimized worker with size-specific configuration"""
        
        # Upload optimized worker script
        setup_commands = [
            "cd /app",
            "pip install playwright aiohttp aiofiles",
            "python -m playwright install chromium --with-deps",
            
            # Create optimized scraping script
            f"""cat > optimized_worker.py << 'EOF'
import asyncio
import json
from playwright.async_api import async_playwright
from datetime import datetime

class OptimizedFollowerScraper:
    def __init__(self):
        self.concurrent_pages = {config.concurrent_pages}
        self.batch_size = {config.batch_size}
        self.account_size = "{config.account_size.value}"
    
    async def scrape_followers(self, username):
        followers = []
        
        async with async_playwright() as p:
            # Launch multiple browser contexts for speed
            browser = await p.chromium.launch(headless=True)
            
            tasks = []
            for i in range(self.concurrent_pages):
                context = await browser.new_context()
                page = await context.new_page()
                tasks.append(self._scrape_page(page, username, i))
            
            # Run concurrent scraping
            results = await asyncio.gather(*tasks, return_exceptions=True)
            
            for result in results:
                if isinstance(result, list):
                    followers.extend(result)
            
            await browser.close()
        
        return followers
    
    async def _scrape_page(self, page, username, page_num):
        try:
            # Navigate to followers page
            await page.goto(f"https://twitter.com/{username}/followers")
            await page.wait_for_selector('[data-testid="primaryColumn"]', timeout=10000)
            
            followers = []
            scroll_count = 0
            max_scrolls = 50 if self.account_size == "micro" else 200 if self.account_size == "small" else 1000
            
            while scroll_count < max_scrolls:
                # Extract followers from current view
                follower_elements = await page.query_selector_all('[data-testid="UserCell"]')
                
                for element in follower_elements:
                    try:
                        username_elem = await element.query_selector('[data-testid="User-Name"] a')
                        if username_elem:
                            href = await username_elem.get_attribute('href')
                            if href and href.startswith('/'):
                                follower_username = href[1:]  # Remove leading /
                                if follower_username not in [f.get('username') for f in followers]:
                                    followers.append({{
                                        'username': follower_username,
                                        'scraped_at': datetime.utcnow().isoformat(),
                                        'page_num': page_num
                                    }})
                    except Exception as e:
                        continue
                
                # Scroll for more followers
                await page.evaluate('window.scrollTo(0, document.body.scrollHeight)')
                await asyncio.sleep(1)  # Fast scrolling
                scroll_count += 1
                
                # Break if we've collected enough for this page
                if len(followers) >= self.batch_size:
                    break
            
            return followers
            
        except Exception as e:
            print(f"Scraping error on page {page_num}: {e}")
            return []

if __name__ == "__main__":
    import sys
    if len(sys.argv) > 1:
        username = sys.argv[1]
        scraper = OptimizedFollowerScraper()
        followers = asyncio.run(scraper.scrape_followers(username))
        
        # Save results
        with open(f"/shared/results/{username}_followers.json", "w") as f:
            json.dump(followers, f)
        
        print(f"Scraped {len(followers)} followers for {username}")
EOF""",
            
            "chmod +x optimized_worker.py"
        ]
        
        for cmd in setup_commands:
            await self.client.execute_command(worker_id, cmd, timeout=300)
    
    async def _execute_job(self, job: FastScanJob, worker_id: str):
        """Execute job on optimized worker"""
        
        job.status = "running"
        job.started_at = datetime.utcnow()
        job.worker_id = worker_id
        
        try:
            # Execute optimized scraping
            result = await self.client.execute_command(
                worker_id,
                f"cd /app && python optimized_worker.py {job.username}",
                timeout=job.worker_config.expected_duration_minutes * 60 + 300  # Add 5 min buffer
            )
            
            if result and result.exit_code == 0:
                # Get results
                followers_file = f"/shared/results/{job.username}_followers.json"
                followers_data = await self.client.execute_command(
                    worker_id,
                    f"cat {followers_file}",
                    timeout=60
                )
                
                if followers_data and followers_data.stdout:
                    followers = json.loads(followers_data.stdout)
                    job.results = {
                        "followers": followers,
                        "total_followers": len(followers),
                        "followers_processed": len(followers),
                        "processing_time_minutes": (datetime.utcnow() - job.started_at).total_seconds() / 60,
                        "account_size": job.account_size.value,
                        "worker_config": job.worker_config.__dict__
                    }
                    job.status = "completed"
                    job.completed_at = datetime.utcnow()
                    
                    # Update stats
                    self.processing_stats["completed_jobs"] += 1
                    self._update_performance_stats(job)
                    
                    logger.info(f"Completed {job.account_size.value} scan: {job.username} ({len(followers)} followers)")
                else:
                    job.status = "failed"
                    job.error = "No results found"
            else:
                job.status = "failed"
                job.error = f"Worker execution failed: {result.stderr if result else 'Unknown error'}"
                
        except Exception as e:
            job.status = "failed"
            job.error = str(e)
            self.processing_stats["failed_jobs"] += 1
            logger.error(f"Job execution failed: {e}")
        
        finally:
            # Return worker to pool
            if worker_id in self.worker_pools[job.account_size]:
                # Worker is still available for reuse
                pass
            else:
                # Add worker back to pool
                self.worker_pools[job.account_size].append(worker_id)
    
    async def _worker_manager(self):
        """Background worker pool management"""
        
        while True:
            try:
                # Optimize worker pools based on demand
                for account_size in AccountSize:
                    pool = self.worker_pools[account_size]
                    
                    # Remove idle workers to save costs
                    active_workers = []
                    for worker_id in pool:
                        try:
                            # Check if worker is still active
                            sandboxes = await self.client.list_sandboxes()
                            worker_exists = any(s.id == worker_id and s.status == 'running' for s in sandboxes)
                            
                            if worker_exists:
                                active_workers.append(worker_id)
                            else:
                                logger.info(f"Removed inactive {account_size.value} worker: {worker_id}")
                        except Exception:
                            continue
                    
                    self.worker_pools[account_size] = active_workers
                
                await asyncio.sleep(60)  # Check every minute
                
            except Exception as e:
                logger.error(f"Worker manager error: {e}")
                await asyncio.sleep(60)
    
    async def _performance_monitor(self):
        """Background performance monitoring"""
        
        while True:
            try:
                # Log performance stats
                stats = self.processing_stats
                total_workers = sum(len(pool) for pool in self.worker_pools.values())
                
                logger.info(f"Performance Stats - Jobs: {stats['completed_jobs']}/{stats['total_jobs']}, "
                          f"Workers: {total_workers}, Failed: {stats['failed_jobs']}")
                
                await asyncio.sleep(300)  # Every 5 minutes
                
            except Exception as e:
                logger.error(f"Performance monitor error: {e}")
                await asyncio.sleep(300)
    
    def _update_performance_stats(self, job: FastScanJob):
        """Update performance statistics"""
        
        if job.completed_at and job.started_at:
            processing_time = (job.completed_at - job.started_at).total_seconds() / 60
            
            # Update average processing time
            size_key = job.account_size.value
            if size_key not in self.processing_stats["average_processing_time"]:
                self.processing_stats["average_processing_time"][size_key] = []
            
            self.processing_stats["average_processing_time"][size_key].append(processing_time)
            
            # Keep only last 100 measurements
            if len(self.processing_stats["average_processing_time"][size_key]) > 100:
                self.processing_stats["average_processing_time"][size_key].pop(0)
            
            # Update cost per follower
            if job.results.get("total_followers", 0) > 0:
                cost = job.worker_config.cost_per_hour * (processing_time / 60)
                cost_per_follower = cost / job.results["total_followers"]
                
                if size_key not in self.processing_stats["cost_per_follower"]:
                    self.processing_stats["cost_per_follower"][size_key] = []
                
                self.processing_stats["cost_per_follower"][size_key].append(cost_per_follower)
                
                if len(self.processing_stats["cost_per_follower"][size_key]) > 100:
                    self.processing_stats["cost_per_follower"][size_key].pop(0)
    
    def _estimate_completion_time(self, job: FastScanJob) -> Optional[str]:
        """Estimate job completion time"""
        
        if job.status == "completed":
            return None
        
        if job.status == "running" and job.started_at:
            elapsed = (datetime.utcnow() - job.started_at).total_seconds() / 60
            remaining = max(0, job.worker_config.expected_duration_minutes - elapsed)
            completion_time = datetime.utcnow() + timedelta(minutes=remaining)
            return completion_time.isoformat()
        
        if job.status == "queued":
            # Estimate based on queue position and average processing time
            queue_position = len([j for j in self.job_queue if j.created_at < job.created_at])
            avg_time = job.worker_config.expected_duration_minutes
            estimated_start = datetime.utcnow() + timedelta(minutes=queue_position * avg_time)
            completion_time = estimated_start + timedelta(minutes=avg_time)
            return completion_time.isoformat()
        
        return None
    
    async def get_system_stats(self) -> Dict[str, Any]:
        """Get comprehensive system statistics"""
        
        total_workers = sum(len(pool) for pool in self.worker_pools.values())
        active_jobs_count = len([j for j in self.active_jobs.values() if j.status == "running"])
        queued_jobs_count = len(self.job_queue)
        
        # Calculate average processing times
        avg_times = {}
        for size, times in self.processing_stats["average_processing_time"].items():
            if times:
                avg_times[size] = sum(times) / len(times)
        
        # Calculate average costs
        avg_costs = {}
        for size, costs in self.processing_stats["cost_per_follower"].items():
            if costs:
                avg_costs[size] = sum(costs) / len(costs)
        
        return {
            "system_status": "operational",
            "total_workers": total_workers,
            "worker_pools": {size.value: len(pool) for size, pool in self.worker_pools.items()},
            "active_jobs": active_jobs_count,
            "queued_jobs": queued_jobs_count,
            "completed_jobs": self.processing_stats["completed_jobs"],
            "failed_jobs": self.processing_stats["failed_jobs"],
            "success_rate": (self.processing_stats["completed_jobs"] / max(self.processing_stats["total_jobs"], 1)) * 100,
            "average_processing_times": avg_times,
            "average_cost_per_follower": avg_costs,
            "uptime": "operational"
        }

# FastAPI app
app = FastAPI(title="Followlytics Unified Daytona API", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

coordinator = UnifiedCoordinator()

@app.on_event("startup")
async def startup_event():
    await coordinator.initialize()

@app.post("/scan/submit")
async def submit_scan(request: UnifiedScanRequest):
    """Submit follower scan job (unified endpoint for all sizes)"""
    return await coordinator.submit_scan(request)

@app.get("/scan/{job_id}/status")
async def get_job_status(job_id: str):
    """Get job status and progress"""
    return await coordinator.get_job_status(job_id)

@app.get("/system/stats")
async def get_system_stats():
    """Get system statistics and performance metrics"""
    return await coordinator.get_system_stats()

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "timestamp": datetime.utcnow().isoformat()}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
