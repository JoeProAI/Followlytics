# Followlytics Enterprise Coordinator Service
import asyncio
import json
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, asdict
from enum import Enum
import uuid
# import aioredis  # Commented out due to Python 3.11 compatibility issue
from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

from .client import DaytonaClient, SandboxInfo
from .config import config

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class JobStatus(Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"

@dataclass
class ScanJob:
    """Represents a follower scanning job"""
    id: str
    user_id: str
    username: str
    follower_count: int
    status: JobStatus
    created_at: datetime
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    progress: float = 0.0
    workers_assigned: List[str] = None
    error_message: Optional[str] = None
    estimated_cost: float = 0.0
    actual_cost: float = 0.0
    priority: str = "normal"  # normal, high, enterprise
    
    def __post_init__(self):
        if self.workers_assigned is None:
            self.workers_assigned = []

@dataclass
class WorkerInfo:
    """Information about a worker sandbox"""
    sandbox_id: str
    status: str  # idle, busy, starting, stopping
    current_job_id: Optional[str] = None
    jobs_completed: int = 0
    last_heartbeat: Optional[datetime] = None
    created_at: Optional[datetime] = None

class CoordinatorService:
    """Main coordinator service for distributed follower scanning"""
    
    def __init__(self):
        self.app = FastAPI(title="Followlytics Enterprise Coordinator")
        self.daytona_client: Optional[DaytonaClient] = None
        self.redis: Optional[aioredis.Redis] = None
        
        # In-memory state (should be Redis in production)
        self.jobs: Dict[str, ScanJob] = {}
        self.workers: Dict[str, WorkerInfo] = {}
        self.job_queue: List[str] = []  # Job IDs in queue
        
        # Configuration
        self.max_workers = config.max_concurrent_workers
        self.shared_volume_id: Optional[str] = None
        
        self.setup_routes()
        self.setup_middleware()
    
    def setup_middleware(self):
        """Setup FastAPI middleware"""
        self.app.add_middleware(
            CORSMiddleware,
            allow_origins=["*"],
            allow_credentials=True,
            allow_methods=["*"],
            allow_headers=["*"],
        )
    
    def setup_routes(self):
        """Setup API routes"""
        
        @self.app.post("/submit-job")
        async def submit_job(job_data: dict):
            """Submit a new scanning job"""
            try:
                job = await self.create_job(
                    user_id=job_data["user_id"],
                    username=job_data["username"],
                    follower_count=job_data["follower_count"],
                    priority=job_data.get("priority", "normal")
                )
                return {"success": True, "job_id": job.id, "estimated_cost": job.estimated_cost}
            except Exception as e:
                logger.error(f"Failed to submit job: {e}")
                raise HTTPException(status_code=500, detail=str(e))
        
        @self.app.get("/job/{job_id}")
        async def get_job_status(job_id: str):
            """Get job status and progress"""
            if job_id not in self.jobs:
                raise HTTPException(status_code=404, detail="Job not found")
            
            job = self.jobs[job_id]
            return {
                "id": job.id,
                "status": job.status.value,
                "progress": job.progress,
                "created_at": job.created_at.isoformat(),
                "started_at": job.started_at.isoformat() if job.started_at else None,
                "completed_at": job.completed_at.isoformat() if job.completed_at else None,
                "workers_assigned": len(job.workers_assigned),
                "estimated_cost": job.estimated_cost,
                "actual_cost": job.actual_cost,
                "error_message": job.error_message
            }
        
        @self.app.get("/jobs")
        async def list_jobs(status: Optional[str] = None, limit: int = 100):
            """List jobs with optional status filter"""
            jobs = list(self.jobs.values())
            
            if status:
                jobs = [j for j in jobs if j.status.value == status]
            
            jobs.sort(key=lambda x: x.created_at, reverse=True)
            jobs = jobs[:limit]
            
            return {
                "jobs": [
                    {
                        "id": job.id,
                        "username": job.username,
                        "status": job.status.value,
                        "progress": job.progress,
                        "created_at": job.created_at.isoformat(),
                        "follower_count": job.follower_count
                    }
                    for job in jobs
                ]
            }
        
        @self.app.get("/workers")
        async def list_workers():
            """List all workers and their status"""
            return {
                "workers": [
                    {
                        "sandbox_id": worker.sandbox_id,
                        "status": worker.status,
                        "current_job_id": worker.current_job_id,
                        "jobs_completed": worker.jobs_completed,
                        "last_heartbeat": worker.last_heartbeat.isoformat() if worker.last_heartbeat else None
                    }
                    for worker in self.workers.values()
                ]
            }
        
        @self.app.get("/system/status")
        async def system_status():
            """Get overall system status"""
            active_jobs = len([j for j in self.jobs.values() if j.status == JobStatus.RUNNING])
            pending_jobs = len([j for j in self.jobs.values() if j.status == JobStatus.PENDING])
            active_workers = len([w for w in self.workers.values() if w.status in ["idle", "busy"]])
            
            usage_stats = await self.daytona_client.get_usage_stats() if self.daytona_client else {}
            
            return {
                "active_jobs": active_jobs,
                "pending_jobs": pending_jobs,
                "active_workers": active_workers,
                "max_workers": self.max_workers,
                "queue_depth": len(self.job_queue),
                "usage_stats": usage_stats
            }
        
        @self.app.post("/worker/{worker_id}/heartbeat")
        async def worker_heartbeat(worker_id: str, data: dict):
            """Receive heartbeat from worker"""
            if worker_id in self.workers:
                self.workers[worker_id].last_heartbeat = datetime.utcnow()
                
                # Update job progress if provided
                if "job_id" in data and "progress" in data:
                    job_id = data["job_id"]
                    if job_id in self.jobs:
                        self.jobs[job_id].progress = data["progress"]
            
            return {"success": True}
        
        @self.app.post("/worker/{worker_id}/complete")
        async def worker_job_complete(worker_id: str, data: dict):
            """Worker reports job completion"""
            job_id = data.get("job_id")
            success = data.get("success", False)
            error_message = data.get("error_message")
            
            if job_id and job_id in self.jobs:
                job = self.jobs[job_id]
                
                if success:
                    job.status = JobStatus.COMPLETED
                    job.progress = 1.0
                    job.completed_at = datetime.utcnow()
                else:
                    job.status = JobStatus.FAILED
                    job.error_message = error_message
                
                # Free up worker
                if worker_id in self.workers:
                    worker = self.workers[worker_id]
                    worker.status = "idle"
                    worker.current_job_id = None
                    worker.jobs_completed += 1
                
                logger.info(f"Job {job_id} completed by worker {worker_id}: {'success' if success else 'failed'}")
            
            return {"success": True}
    
    async def initialize(self):
        """Initialize the coordinator service"""
        logger.info("Initializing Followlytics Enterprise Coordinator...")
        
        # Initialize Daytona client
        self.daytona_client = DaytonaClient()
        await self.daytona_client.__aenter__()
        
        # Initialize Redis (for production)
        # self.redis = await aioredis.from_url("redis://localhost:6379")
        
        # Create or find shared volume
        await self.setup_shared_volume()
        
        # Start background tasks
        asyncio.create_task(self.job_scheduler())
        asyncio.create_task(self.worker_monitor())
        asyncio.create_task(self.auto_scaler())
        
        logger.info("Coordinator initialized successfully")
    
    async def setup_shared_volume(self):
        """Create or find the shared volume for data persistence"""
        volumes = await self.daytona_client.list_volumes()
        
        # Look for existing shared volume
        for volume in volumes:
            if volume.name == "followlytics-shared-data":
                self.shared_volume_id = volume.id
                logger.info(f"Found existing shared volume: {volume.id}")
                return
        
        # Create new shared volume
        volume = await self.daytona_client.create_volume(
            name="followlytics-shared-data",
            size_gb=config.shared_volume_size_gb
        )
        self.shared_volume_id = volume.id
        logger.info(f"Created new shared volume: {volume.id}")
    
    async def create_job(self, user_id: str, username: str, follower_count: int, priority: str = "normal") -> ScanJob:
        """Create a new scanning job"""
        job_id = str(uuid.uuid4())
        
        # Calculate estimated cost and workers needed
        estimated_workers = max(1, follower_count // 20000)  # 1 worker per 20K followers
        estimated_time_hours = max(0.5, follower_count / 50000)  # 50K followers per hour
        estimated_cost = estimated_workers * estimated_time_hours * 2.0  # $2/hour per worker
        
        job = ScanJob(
            id=job_id,
            user_id=user_id,
            username=username,
            follower_count=follower_count,
            status=JobStatus.PENDING,
            created_at=datetime.utcnow(),
            estimated_cost=estimated_cost,
            priority=priority
        )
        
        self.jobs[job_id] = job
        self.job_queue.append(job_id)
        
        logger.info(f"Created job {job_id} for @{username} ({follower_count:,} followers)")
        return job
    
    async def job_scheduler(self):
        """Background task to schedule jobs to available workers"""
        while True:
            try:
                if self.job_queue:
                    # Get next job
                    job_id = self.job_queue[0]
                    job = self.jobs.get(job_id)
                    
                    if job and job.status == JobStatus.PENDING:
                        # Check if we have available workers or can create them
                        available_workers = [w for w in self.workers.values() if w.status == "idle"]
                        
                        workers_needed = max(1, job.follower_count // 20000)
                        workers_needed = min(workers_needed, self.max_workers - len(self.workers))
                        
                        if len(available_workers) >= workers_needed or len(self.workers) < self.max_workers:
                            # Start the job
                            await self.start_job(job_id)
                            self.job_queue.pop(0)
                
                await asyncio.sleep(5)  # Check every 5 seconds
                
            except Exception as e:
                logger.error(f"Error in job scheduler: {e}")
                await asyncio.sleep(10)
    
    async def start_job(self, job_id: str):
        """Start a scanning job"""
        job = self.jobs.get(job_id)
        if not job:
            return
        
        logger.info(f"Starting job {job_id} for @{job.username}")
        
        try:
            # Calculate workers needed
            workers_needed = max(1, job.follower_count // 20000)
            workers_needed = min(workers_needed, self.max_workers)
            
            # Get or create workers
            assigned_workers = []
            available_workers = [w for w in self.workers.values() if w.status == "idle"]
            
            # Use existing idle workers first
            for worker in available_workers[:workers_needed]:
                worker.status = "busy"
                worker.current_job_id = job_id
                assigned_workers.append(worker.sandbox_id)
            
            # Create additional workers if needed
            while len(assigned_workers) < workers_needed and len(self.workers) < self.max_workers:
                worker_sandbox = await self.create_worker()
                if worker_sandbox:
                    assigned_workers.append(worker_sandbox.id)
            
            # Update job status
            job.status = JobStatus.RUNNING
            job.started_at = datetime.utcnow()
            job.workers_assigned = assigned_workers
            
            # Send job to workers
            await self.distribute_job_to_workers(job)
            
            logger.info(f"Job {job_id} started with {len(assigned_workers)} workers")
            
        except Exception as e:
            logger.error(f"Failed to start job {job_id}: {e}")
            job.status = JobStatus.FAILED
            job.error_message = str(e)
    
    async def create_worker(self) -> Optional[SandboxInfo]:
        """Create a new worker sandbox"""
        try:
            worker_name = f"followlytics-worker-{len(self.workers) + 1}"
            
            # Worker environment variables
            env_vars = {
                "COORDINATOR_URL": "http://coordinator:8000",  # Internal network
                "SHARED_VOLUME": "/shared",
                "WORKER_ID": worker_name,
                "PYTHONPATH": "/worker"
            }
            
            # Volume mount for shared data
            volumes = []
            if self.shared_volume_id:
                volumes.append({
                    "volume_id": self.shared_volume_id,
                    "mount_path": "/shared"
                })
            
            sandbox = await self.daytona_client.create_sandbox(
                name=worker_name,
                image="python:3.11-slim",  # Will be replaced with custom snapshot
                env_vars=env_vars,
                volumes=volumes,
                auto_stop_minutes=config.auto_stop_interval_minutes
            )
            
            # Wait for sandbox to be ready
            if await self.daytona_client.wait_for_sandbox_ready(sandbox.id):
                # Install dependencies and start worker
                await self.setup_worker(sandbox.id)
                
                # Register worker
                self.workers[sandbox.id] = WorkerInfo(
                    sandbox_id=sandbox.id,
                    status="idle",
                    created_at=datetime.utcnow()
                )
                
                logger.info(f"Created worker: {sandbox.id}")
                return sandbox
            else:
                logger.error(f"Worker {sandbox.id} failed to start")
                return None
                
        except Exception as e:
            logger.error(f"Failed to create worker: {e}")
            return None
    
    async def setup_worker(self, sandbox_id: str):
        """Setup worker with dependencies and code"""
        commands = [
            "apt-get update && apt-get install -y curl wget",
            "pip install playwright selenium beautifulsoup4 requests aiohttp",
            "playwright install chromium",
            "mkdir -p /worker /shared/data /shared/logs"
        ]
        
        for command in commands:
            result = await self.daytona_client.execute_command(sandbox_id, command, timeout=300)
            if result["exit_code"] != 0:
                logger.error(f"Worker setup command failed: {command}")
                logger.error(f"Error: {result['stderr']}")
    
    async def distribute_job_to_workers(self, job: ScanJob):
        """Distribute job chunks to assigned workers"""
        chunk_size = max(1000, job.follower_count // len(job.workers_assigned))
        
        for i, worker_id in enumerate(job.workers_assigned):
            start_offset = i * chunk_size
            end_offset = min((i + 1) * chunk_size, job.follower_count)
            
            job_chunk = {
                "job_id": job.id,
                "username": job.username,
                "start_offset": start_offset,
                "end_offset": end_offset,
                "total_followers": job.follower_count,
                "chunk_id": i
            }
            
            # Send job to worker (would be via API call in production)
            await self.send_job_to_worker(worker_id, job_chunk)
    
    async def send_job_to_worker(self, worker_id: str, job_chunk: dict):
        """Send job chunk to specific worker"""
        try:
            # In production, this would be an HTTP call to the worker
            # For now, we'll simulate by writing to shared volume
            job_file = f"/shared/jobs/{job_chunk['job_id']}_chunk_{job_chunk['chunk_id']}.json"
            
            command = f"echo '{json.dumps(job_chunk)}' > {job_file}"
            await self.daytona_client.execute_command(worker_id, command)
            
            # Start worker processing
            worker_command = f"cd /worker && python worker.py {job_file}"
            await self.daytona_client.execute_command(worker_id, worker_command)
            
        except Exception as e:
            logger.error(f"Failed to send job to worker {worker_id}: {e}")
    
    async def worker_monitor(self):
        """Monitor worker health and handle failures"""
        while True:
            try:
                current_time = datetime.utcnow()
                
                for worker_id, worker in list(self.workers.items()):
                    # Check for stale workers (no heartbeat in 5 minutes)
                    if worker.last_heartbeat:
                        time_since_heartbeat = current_time - worker.last_heartbeat
                        if time_since_heartbeat > timedelta(minutes=5):
                            logger.warning(f"Worker {worker_id} appears stale, removing")
                            await self.remove_worker(worker_id)
                    
                    # Check sandbox status
                    try:
                        sandbox = await self.daytona_client.get_sandbox(worker_id)
                        if sandbox.status not in ["running", "starting"]:
                            logger.warning(f"Worker {worker_id} is not running, removing")
                            await self.remove_worker(worker_id)
                    except Exception:
                        # Sandbox might have been deleted
                        await self.remove_worker(worker_id)
                
                await asyncio.sleep(60)  # Check every minute
                
            except Exception as e:
                logger.error(f"Error in worker monitor: {e}")
                await asyncio.sleep(60)
    
    async def remove_worker(self, worker_id: str):
        """Remove a failed or stale worker"""
        if worker_id in self.workers:
            worker = self.workers[worker_id]
            
            # If worker was processing a job, mark it as failed
            if worker.current_job_id and worker.current_job_id in self.jobs:
                job = self.jobs[worker.current_job_id]
                if job.status == JobStatus.RUNNING:
                    job.status = JobStatus.FAILED
                    job.error_message = f"Worker {worker_id} failed"
            
            del self.workers[worker_id]
            logger.info(f"Removed worker: {worker_id}")
    
    async def auto_scaler(self):
        """Auto-scale workers based on queue depth and demand"""
        while True:
            try:
                queue_depth = len(self.job_queue)
                active_workers = len([w for w in self.workers.values() if w.status in ["idle", "busy"]])
                
                # Scale up if queue is building
                if queue_depth > 2 and active_workers < self.max_workers:
                    logger.info("Queue building, scaling up workers")
                    await self.create_worker()
                
                # Scale down idle workers after some time
                idle_workers = [w for w in self.workers.values() if w.status == "idle"]
                if len(idle_workers) > 2:  # Keep at least 2 idle workers
                    for worker in idle_workers[2:]:
                        if worker.last_heartbeat:
                            idle_time = datetime.utcnow() - worker.last_heartbeat
                            if idle_time > timedelta(minutes=config.max_idle_time_minutes):
                                await self.daytona_client.stop_sandbox(worker.sandbox_id)
                                await self.remove_worker(worker.sandbox_id)
                
                await asyncio.sleep(30)  # Check every 30 seconds
                
            except Exception as e:
                logger.error(f"Error in auto-scaler: {e}")
                await asyncio.sleep(60)

# Global coordinator instance
coordinator = CoordinatorService()

async def main():
    """Main entry point"""
    await coordinator.initialize()
    
    # Start the FastAPI server
    config_uvicorn = uvicorn.Config(
        coordinator.app,
        host="0.0.0.0",
        port=8000,
        log_level="info"
    )
    server = uvicorn.Server(config_uvicorn)
    await server.serve()

if __name__ == "__main__":
    asyncio.run(main())
