# Daytona Client for Followlytics Enterprise
import asyncio
import json
import logging
from typing import Dict, List, Optional, Any
from dataclasses import dataclass
import aiohttp
import time
from datetime import datetime, timedelta

from .config import config

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@dataclass
class SandboxInfo:
    """Information about a Daytona sandbox"""
    id: str
    name: str
    status: str
    created_at: str
    resources: Dict[str, Any]
    preview_url: Optional[str] = None
    ssh_url: Optional[str] = None

@dataclass
class VolumeInfo:
    """Information about a Daytona volume"""
    id: str
    name: str
    size_gb: int
    status: str
    created_at: str

class DaytonaClient:
    """Async Daytona API client for Followlytics Enterprise"""
    
    def __init__(self, config_override: Optional[Dict] = None):
        self.config = config
        if config_override:
            for key, value in config_override.items():
                setattr(self.config, key, value)
        
        self.session: Optional[aiohttp.ClientSession] = None
        self.base_headers = {
            'Authorization': f'Bearer {self.config.api_key}',
            'Content-Type': 'application/json',
            'User-Agent': 'Followlytics-Enterprise/1.0'
        }
    
    async def __aenter__(self):
        self.session = aiohttp.ClientSession(
            headers=self.base_headers,
            timeout=aiohttp.ClientTimeout(total=300)  # 5 minute timeout
        )
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self.session:
            await self.session.close()
    
    async def _request(self, method: str, endpoint: str, **kwargs) -> Dict[str, Any]:
        """Make authenticated request to Daytona API"""
        url = f"{self.config.api_url.rstrip('/')}/{endpoint.lstrip('/')}"
        
        try:
            async with self.session.request(method, url, **kwargs) as response:
                response_text = await response.text()
                
                if response.status >= 400:
                    logger.error(f"Daytona API error {response.status}: {response_text}")
                    raise Exception(f"Daytona API error {response.status}: {response_text}")
                
                if response_text:
                    return json.loads(response_text)
                return {}
                
        except aiohttp.ClientError as e:
            logger.error(f"Daytona client error: {e}")
            raise Exception(f"Daytona client error: {e}")
    
    async def list_sandboxes(self) -> List[SandboxInfo]:
        """List all sandboxes"""
        response = await self._request('GET', '/workspace')
        
        sandboxes = []
        # Response is a list of workspaces
        for workspace_data in response:
            sandboxes.append(SandboxInfo(
                id=workspace_data.get('id', ''),
                name=workspace_data.get('name', ''),
                status=workspace_data.get('status', 'unknown'),
                created_at=workspace_data.get('created_at', ''),
                resources=workspace_data.get('resources', {}),
                preview_url=workspace_data.get('preview_url'),
                ssh_url=workspace_data.get('ssh_url')
            ))
        
        return sandboxes
    
    async def create_sandbox(self, 
                           name: str,
                           image: str = "ubuntu:22.04",
                           resources: Optional[Dict] = None,
                           env_vars: Optional[Dict] = None,
                           volumes: Optional[List[Dict]] = None,
                           auto_stop_minutes: int = 30) -> SandboxInfo:
        """Create a new sandbox"""
        
        if resources is None:
            resources = {
                'cpu': self.config.max_cpu_per_worker,
                'memory': self.config.max_memory_per_worker,
                'disk': self.config.max_disk_per_worker
            }
        
        payload = {
            'name': name,
            'image': image,
            'resources': resources,
            'auto_stop_interval': auto_stop_minutes * 60,  # Convert to seconds
            'env_vars': env_vars or {},
            'volumes': volumes or []
        }
        
        logger.info(f"Creating sandbox: {name}")
        response = await self._request('POST', f'/orgs/{self.config.organization_id}/sandboxes', json=payload)
        
        sandbox_data = response['sandbox']
        return SandboxInfo(
            id=sandbox_data['id'],
            name=sandbox_data['name'],
            status=sandbox_data['status'],
            created_at=sandbox_data['created_at'],
            resources=sandbox_data.get('resources', {}),
            preview_url=sandbox_data.get('preview_url'),
            ssh_url=sandbox_data.get('ssh_url')
        )
    
    async def get_sandbox(self, sandbox_id: str) -> SandboxInfo:
        """Get sandbox information"""
        response = await self._request('GET', f'/orgs/{self.config.organization_id}/sandboxes/{sandbox_id}')
        
        sandbox_data = response['sandbox']
        return SandboxInfo(
            id=sandbox_data['id'],
            name=sandbox_data['name'],
            status=sandbox_data['status'],
            created_at=sandbox_data['created_at'],
            resources=sandbox_data.get('resources', {}),
            preview_url=sandbox_data.get('preview_url'),
            ssh_url=sandbox_data.get('ssh_url')
        )
    
    async def stop_sandbox(self, sandbox_id: str) -> bool:
        """Stop a sandbox"""
        logger.info(f"Stopping sandbox: {sandbox_id}")
        await self._request('POST', f'/orgs/{self.config.organization_id}/sandboxes/{sandbox_id}/stop')
        return True
    
    async def delete_sandbox(self, sandbox_id: str) -> bool:
        """Delete a sandbox"""
        logger.info(f"Deleting sandbox: {sandbox_id}")
        await self._request('DELETE', f'/orgs/{self.config.organization_id}/sandboxes/{sandbox_id}')
        return True
    
    async def execute_command(self, sandbox_id: str, command: str, timeout: int = 300) -> Dict[str, Any]:
        """Execute command in sandbox"""
        payload = {
            'command': command,
            'timeout': timeout
        }
        
        logger.info(f"Executing command in {sandbox_id}: {command}")
        response = await self._request('POST', f'/orgs/{self.config.organization_id}/sandboxes/{sandbox_id}/exec', json=payload)
        
        return {
            'stdout': response.get('stdout', ''),
            'stderr': response.get('stderr', ''),
            'exit_code': response.get('exit_code', 0),
            'execution_time': response.get('execution_time', 0)
        }
    
    async def upload_file(self, sandbox_id: str, local_path: str, remote_path: str) -> bool:
        """Upload file to sandbox"""
        logger.info(f"Uploading {local_path} to {sandbox_id}:{remote_path}")
        
        with open(local_path, 'rb') as f:
            files = {'file': f}
            data = {'path': remote_path}
            
            # Remove Content-Type header for file upload
            headers = {k: v for k, v in self.base_headers.items() if k != 'Content-Type'}
            
            async with self.session.post(
                f"{self.config.api_url}/orgs/{self.config.organization_id}/sandboxes/{sandbox_id}/files",
                headers=headers,
                data={'path': remote_path, 'file': f.read()}
            ) as response:
                return response.status == 200
    
    async def create_volume(self, name: str, size_gb: int) -> VolumeInfo:
        """Create a shared volume"""
        payload = {
            'name': name,
            'size_gb': size_gb
        }
        
        logger.info(f"Creating volume: {name} ({size_gb}GB)")
        response = await self._request('POST', f'/orgs/{self.config.organization_id}/volumes', json=payload)
        
        volume_data = response['volume']
        return VolumeInfo(
            id=volume_data['id'],
            name=volume_data['name'],
            size_gb=volume_data['size_gb'],
            status=volume_data['status'],
            created_at=volume_data['created_at']
        )
    
    async def list_volumes(self) -> List[VolumeInfo]:
        """List all volumes"""
        response = await self._request('GET', f'/orgs/{self.config.organization_id}/volumes')
        
        volumes = []
        for volume_data in response.get('volumes', []):
            volumes.append(VolumeInfo(
                id=volume_data['id'],
                name=volume_data['name'],
                size_gb=volume_data['size_gb'],
                status=volume_data['status'],
                created_at=volume_data['created_at']
            ))
        
        return volumes
    
    async def wait_for_sandbox_ready(self, sandbox_id: str, timeout: int = 600) -> bool:
        """Wait for sandbox to be ready"""
        start_time = time.time()
        
        while time.time() - start_time < timeout:
            sandbox = await self.get_sandbox(sandbox_id)
            
            if sandbox.status == 'running':
                logger.info(f"Sandbox {sandbox_id} is ready")
                return True
            elif sandbox.status == 'failed':
                logger.error(f"Sandbox {sandbox_id} failed to start")
                return False
            
            logger.info(f"Waiting for sandbox {sandbox_id} to be ready (status: {sandbox.status})")
            await asyncio.sleep(10)
        
        logger.error(f"Timeout waiting for sandbox {sandbox_id} to be ready")
        return False
    
    async def get_usage_stats(self) -> Dict[str, Any]:
        """Get current usage statistics"""
        response = await self._request('GET', f'/orgs/{self.config.organization_id}/usage')
        
        return {
            'active_sandboxes': response.get('active_sandboxes', 0),
            'total_cpu_hours': response.get('total_cpu_hours', 0),
            'total_memory_gb_hours': response.get('total_memory_gb_hours', 0),
            'current_hourly_cost': response.get('current_hourly_cost', 0),
            'credits_remaining': response.get('credits_remaining', 0)
        }

# Convenience functions
async def create_client() -> DaytonaClient:
    """Create and return a configured Daytona client"""
    client = DaytonaClient()
    await client.__aenter__()
    return client

async def test_connection() -> bool:
    """Test Daytona API connection"""
    try:
        async with DaytonaClient() as client:
            sandboxes = await client.list_sandboxes()
            logger.info(f"Successfully connected to Daytona. Found {len(sandboxes)} sandboxes.")
            return True
    except Exception as e:
        logger.error(f"Failed to connect to Daytona: {e}")
        return False
