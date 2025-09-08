# Daytona Snapshot Creation for Followlytics Enterprise
import asyncio
import logging
from typing import Dict, List, Optional
from dataclasses import dataclass

from .client import DaytonaClient
from .config import config

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@dataclass
class SnapshotSpec:
    """Specification for creating a snapshot"""
    name: str
    base_image: str
    packages: List[str]
    system_packages: List[str]
    commands: List[str]
    env_vars: Dict[str, str]
    resources: Dict[str, int]

class SnapshotManager:
    """Manages creation and deployment of Daytona snapshots"""
    
    def __init__(self):
        self.client: Optional[DaytonaClient] = None
    
    async def initialize(self):
        """Initialize the snapshot manager"""
        self.client = DaytonaClient()
        await self.client.__aenter__()
    
    async def cleanup(self):
        """Cleanup resources"""
        if self.client:
            await self.client.__aexit__(None, None, None)
    
    def get_coordinator_spec(self) -> SnapshotSpec:
        """Get coordinator snapshot specification"""
        return SnapshotSpec(
            name="followlytics-coordinator-v1",
            base_image="python:3.11-slim",
            packages=[
                "fastapi==0.104.1",
                "uvicorn[standard]==0.24.0",
                "aioredis==2.0.1",
                "aiohttp==3.9.1",
                "pydantic==2.5.0",
                "python-multipart==0.0.6"
            ],
            system_packages=[
                "curl",
                "wget",
                "redis-server",
                "supervisor"
            ],
            commands=[
                "mkdir -p /app /shared /logs",
                "pip install --no-cache-dir fastapi uvicorn aioredis aiohttp pydantic python-multipart",
                "apt-get update && apt-get install -y curl wget redis-server supervisor",
                "apt-get clean && rm -rf /var/lib/apt/lists/*"
            ],
            env_vars={
                "PYTHONPATH": "/app",
                "REDIS_URL": "redis://localhost:6379",
                "COORDINATOR_PORT": "8000",
                "LOG_LEVEL": "INFO"
            },
            resources={
                "cpu": 2,
                "memory": 4,
                "disk": 20
            }
        )
    
    def get_worker_spec(self) -> SnapshotSpec:
        """Get worker snapshot specification"""
        return SnapshotSpec(
            name="followlytics-worker-v1",
            base_image="python:3.11-slim",
            packages=[
                "playwright==1.40.0",
                "selenium==4.15.2",
                "beautifulsoup4==4.12.2",
                "aiohttp==3.9.1",
                "lxml==4.9.3",
                "requests==2.31.0"
            ],
            system_packages=[
                "curl",
                "wget",
                "chromium",
                "chromium-driver",
                "fonts-liberation",
                "libasound2",
                "libatk-bridge2.0-0",
                "libdrm2",
                "libgtk-3-0",
                "libnspr4",
                "libnss3",
                "libxcomposite1",
                "libxdamage1",
                "libxrandr2",
                "xvfb"
            ],
            commands=[
                "mkdir -p /worker /shared /logs",
                "pip install --no-cache-dir playwright selenium beautifulsoup4 aiohttp lxml requests",
                "apt-get update && apt-get install -y curl wget chromium chromium-driver",
                "apt-get install -y fonts-liberation libasound2 libatk-bridge2.0-0 libdrm2 libgtk-3-0 libnspr4 libnss3 libxcomposite1 libxdamage1 libxrandr2 xvfb",
                "playwright install chromium",
                "playwright install-deps",
                "apt-get clean && rm -rf /var/lib/apt/lists/*",
                "chmod +x /usr/bin/chromium"
            ],
            env_vars={
                "PYTHONPATH": "/worker",
                "DISPLAY": ":99",
                "PLAYWRIGHT_BROWSERS_PATH": "/ms-playwright",
                "CHROME_BIN": "/usr/bin/chromium",
                "CHROME_PATH": "/usr/bin/chromium"
            },
            resources={
                "cpu": 4,
                "memory": 8,
                "disk": 50
            }
        )
    
    async def create_snapshot_from_spec(self, spec: SnapshotSpec) -> str:
        """Create a snapshot from specification"""
        logger.info(f"Creating snapshot: {spec.name}")
        
        try:
            # Create a temporary sandbox to build the snapshot
            build_sandbox = await self.client.create_sandbox(
                name=f"{spec.name}-build",
                image=spec.base_image,
                resources=spec.resources,
                env_vars=spec.env_vars,
                auto_stop_minutes=60  # Auto-stop after 1 hour
            )
            
            # Wait for sandbox to be ready
            if not await self.client.wait_for_sandbox_ready(build_sandbox.id):
                raise Exception(f"Build sandbox {build_sandbox.id} failed to start")
            
            # Execute setup commands
            for i, command in enumerate(spec.commands):
                logger.info(f"Executing setup command {i+1}/{len(spec.commands)}: {command}")
                
                result = await self.client.execute_command(
                    build_sandbox.id, 
                    command, 
                    timeout=600  # 10 minute timeout per command
                )
                
                if result["exit_code"] != 0:
                    logger.error(f"Setup command failed: {command}")
                    logger.error(f"Error output: {result['stderr']}")
                    raise Exception(f"Setup command failed: {command}")
                
                logger.info(f"Command completed successfully")
            
            # Create snapshot from the built sandbox
            logger.info(f"Creating snapshot from sandbox {build_sandbox.id}")
            
            # Note: This is a placeholder - actual Daytona snapshot creation API may differ
            snapshot_result = await self.client._request(
                'POST',
                f'/orgs/{config.organization_id}/snapshots',
                json={
                    "name": spec.name,
                    "source_sandbox_id": build_sandbox.id,
                    "description": f"Followlytics Enterprise {spec.name.split('-')[1]} snapshot"
                }
            )
            
            snapshot_id = snapshot_result.get("snapshot", {}).get("id")
            
            # Clean up build sandbox
            await self.client.delete_sandbox(build_sandbox.id)
            
            logger.info(f"Successfully created snapshot: {spec.name} (ID: {snapshot_id})")
            return snapshot_id
            
        except Exception as e:
            logger.error(f"Failed to create snapshot {spec.name}: {e}")
            
            # Clean up on failure
            try:
                if 'build_sandbox' in locals():
                    await self.client.delete_sandbox(build_sandbox.id)
            except:
                pass
            
            raise
    
    async def create_all_snapshots(self) -> Dict[str, str]:
        """Create all required snapshots"""
        snapshots = {}
        
        # Create coordinator snapshot
        coordinator_spec = self.get_coordinator_spec()
        coordinator_id = await self.create_snapshot_from_spec(coordinator_spec)
        snapshots["coordinator"] = coordinator_id
        
        # Create worker snapshot
        worker_spec = self.get_worker_spec()
        worker_id = await self.create_snapshot_from_spec(worker_spec)
        snapshots["worker"] = worker_id
        
        return snapshots
    
    async def list_snapshots(self) -> List[Dict]:
        """List all available snapshots"""
        try:
            response = await self.client._request('GET', f'/orgs/{config.organization_id}/snapshots')
            return response.get("snapshots", [])
        except Exception as e:
            logger.error(f"Failed to list snapshots: {e}")
            return []
    
    async def delete_snapshot(self, snapshot_id: str) -> bool:
        """Delete a snapshot"""
        try:
            await self.client._request('DELETE', f'/orgs/{config.organization_id}/snapshots/{snapshot_id}')
            logger.info(f"Deleted snapshot: {snapshot_id}")
            return True
        except Exception as e:
            logger.error(f"Failed to delete snapshot {snapshot_id}: {e}")
            return False

async def create_snapshots():
    """Main function to create all snapshots"""
    manager = SnapshotManager()
    
    try:
        await manager.initialize()
        
        logger.info("Starting snapshot creation process...")
        snapshots = await manager.create_all_snapshots()
        
        logger.info("Snapshot creation completed!")
        for name, snapshot_id in snapshots.items():
            logger.info(f"  {name}: {snapshot_id}")
        
        return snapshots
        
    finally:
        await manager.cleanup()

if __name__ == "__main__":
    asyncio.run(create_snapshots())
