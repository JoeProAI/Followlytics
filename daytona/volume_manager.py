# Persistent Volume Data Management for Followlytics Enterprise
import asyncio
import json
import logging
import os
import shutil
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from dataclasses import dataclass
import aiofiles
from pathlib import Path

from .client import DaytonaClient, VolumeInfo
from .config import config

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@dataclass
class JobCheckpoint:
    """Represents a job checkpoint for resume capability"""
    job_id: str
    username: str
    total_followers: int
    processed_count: int
    last_processed_offset: int
    chunks_completed: List[int]
    created_at: datetime
    updated_at: datetime
    status: str

@dataclass
class DataBackup:
    """Represents a data backup"""
    backup_id: str
    job_id: str
    backup_type: str  # 'incremental', 'full', 'checkpoint'
    file_path: str
    size_bytes: int
    created_at: datetime

class VolumeManager:
    """Manages persistent volumes and data for Daytona sandboxes"""
    
    def __init__(self, daytona_client: DaytonaClient):
        self.client = daytona_client
        self.shared_volume_id: Optional[str] = None
        self.volume_mount_path = "/shared"
        
        # Directory structure on shared volume
        self.directories = {
            'jobs': f"{self.volume_mount_path}/jobs",
            'results': f"{self.volume_mount_path}/results", 
            'checkpoints': f"{self.volume_mount_path}/checkpoints",
            'backups': f"{self.volume_mount_path}/backups",
            'logs': f"{self.volume_mount_path}/logs",
            'temp': f"{self.volume_mount_path}/temp"
        }
    
    async def initialize(self):
        """Initialize volume manager and ensure shared volume exists"""
        logger.info("Initializing Volume Manager...")
        
        # Find or create shared volume
        await self.ensure_shared_volume()
        
        # Create directory structure
        await self.create_directory_structure()
        
        logger.info("Volume Manager initialized successfully")
    
    async def ensure_shared_volume(self):
        """Ensure shared volume exists, create if necessary"""
        volumes = await self.client.list_volumes()
        
        # Look for existing shared volume
        for volume in volumes:
            if volume.name == "followlytics-shared-data":
                self.shared_volume_id = volume.id
                logger.info(f"Found existing shared volume: {volume.id}")
                return
        
        # Create new shared volume
        logger.info("Creating new shared volume...")
        volume = await self.client.create_volume(
            name="followlytics-shared-data",
            size_gb=config.shared_volume_size_gb
        )
        self.shared_volume_id = volume.id
        logger.info(f"Created shared volume: {volume.id}")
    
    async def create_directory_structure(self):
        """Create required directory structure on shared volume"""
        if not self.shared_volume_id:
            raise Exception("Shared volume not initialized")
        
        # Create a temporary sandbox to set up directories
        setup_sandbox = await self.client.create_sandbox(
            name="volume-setup-temp",
            volumes=[{
                "volume_id": self.shared_volume_id,
                "mount_path": self.volume_mount_path
            }],
            auto_stop_minutes=10
        )
        
        try:
            # Wait for sandbox to be ready
            if await self.client.wait_for_sandbox_ready(setup_sandbox.id):
                # Create all required directories
                for dir_name, dir_path in self.directories.items():
                    await self.client.execute_command(
                        setup_sandbox.id,
                        f"mkdir -p {dir_path}",
                        timeout=30
                    )
                    logger.info(f"Created directory: {dir_path}")
                
                # Set permissions
                await self.client.execute_command(
                    setup_sandbox.id,
                    f"chmod -R 755 {self.volume_mount_path}",
                    timeout=30
                )
                
                logger.info("Directory structure created successfully")
            else:
                raise Exception("Setup sandbox failed to start")
                
        finally:
            # Clean up setup sandbox
            await self.client.delete_sandbox(setup_sandbox.id)
    
    async def save_job_checkpoint(self, checkpoint: JobCheckpoint, sandbox_id: str):
        """Save job checkpoint for resume capability"""
        checkpoint_file = f"{self.directories['checkpoints']}/{checkpoint.job_id}.json"
        
        checkpoint_data = {
            "job_id": checkpoint.job_id,
            "username": checkpoint.username,
            "total_followers": checkpoint.total_followers,
            "processed_count": checkpoint.processed_count,
            "last_processed_offset": checkpoint.last_processed_offset,
            "chunks_completed": checkpoint.chunks_completed,
            "created_at": checkpoint.created_at.isoformat(),
            "updated_at": checkpoint.updated_at.isoformat(),
            "status": checkpoint.status
        }
        
        # Write checkpoint to shared volume
        command = f"echo '{json.dumps(checkpoint_data)}' > {checkpoint_file}"
        await self.client.execute_command(sandbox_id, command, timeout=30)
        
        logger.info(f"Saved checkpoint for job {checkpoint.job_id}")
    
    async def load_job_checkpoint(self, job_id: str, sandbox_id: str) -> Optional[JobCheckpoint]:
        """Load job checkpoint for resume"""
        checkpoint_file = f"{self.directories['checkpoints']}/{job_id}.json"
        
        # Check if checkpoint exists
        result = await self.client.execute_command(
            sandbox_id,
            f"test -f {checkpoint_file} && echo 'exists' || echo 'not_found'",
            timeout=30
        )
        
        if 'not_found' in result['stdout']:
            return None
        
        # Read checkpoint data
        result = await self.client.execute_command(
            sandbox_id,
            f"cat {checkpoint_file}",
            timeout=30
        )
        
        if result['exit_code'] != 0:
            logger.error(f"Failed to read checkpoint {job_id}: {result['stderr']}")
            return None
        
        try:
            checkpoint_data = json.loads(result['stdout'])
            
            return JobCheckpoint(
                job_id=checkpoint_data['job_id'],
                username=checkpoint_data['username'],
                total_followers=checkpoint_data['total_followers'],
                processed_count=checkpoint_data['processed_count'],
                last_processed_offset=checkpoint_data['last_processed_offset'],
                chunks_completed=checkpoint_data['chunks_completed'],
                created_at=datetime.fromisoformat(checkpoint_data['created_at']),
                updated_at=datetime.fromisoformat(checkpoint_data['updated_at']),
                status=checkpoint_data['status']
            )
            
        except (json.JSONDecodeError, KeyError) as e:
            logger.error(f"Failed to parse checkpoint {job_id}: {e}")
            return None
    
    async def consolidate_job_results(self, job_id: str, sandbox_id: str) -> Dict[str, Any]:
        """Consolidate all chunk results for a job"""
        results_dir = f"{self.directories['results']}/{job_id}"
        
        # List all chunk files
        result = await self.client.execute_command(
            sandbox_id,
            f"find {results_dir} -name 'chunk_*.json' -type f | sort",
            timeout=60
        )
        
        if result['exit_code'] != 0:
            logger.error(f"Failed to list chunk files for job {job_id}")
            return {}
        
        chunk_files = result['stdout'].strip().split('\n')
        if not chunk_files or chunk_files == ['']:
            logger.warning(f"No chunk files found for job {job_id}")
            return {}
        
        # Read and consolidate all chunks
        all_followers = []
        total_processed = 0
        chunks_info = []
        
        for chunk_file in chunk_files:
            if not chunk_file.strip():
                continue
                
            # Read chunk data
            result = await self.client.execute_command(
                sandbox_id,
                f"cat {chunk_file}",
                timeout=30
            )
            
            if result['exit_code'] == 0:
                try:
                    chunk_data = json.loads(result['stdout'])
                    followers = chunk_data.get('followers', [])
                    all_followers.extend(followers)
                    total_processed += len(followers)
                    
                    chunks_info.append({
                        'chunk_id': chunk_data.get('chunk_id'),
                        'worker_id': chunk_data.get('worker_id'),
                        'follower_count': len(followers),
                        'completed_at': chunk_data.get('completed_at')
                    })
                    
                except json.JSONDecodeError as e:
                    logger.error(f"Failed to parse chunk file {chunk_file}: {e}")
        
        # Create consolidated result
        consolidated_result = {
            'job_id': job_id,
            'total_followers': total_processed,
            'chunks_processed': len(chunks_info),
            'chunks_info': chunks_info,
            'followers': all_followers,
            'consolidated_at': datetime.utcnow().isoformat()
        }
        
        # Save consolidated result
        consolidated_file = f"{results_dir}/consolidated.json"
        command = f"echo '{json.dumps(consolidated_result)}' > {consolidated_file}"
        await self.client.execute_command(sandbox_id, command, timeout=60)
        
        logger.info(f"Consolidated {total_processed} followers from {len(chunks_info)} chunks for job {job_id}")
        
        return consolidated_result
    
    async def create_backup(self, job_id: str, backup_type: str, sandbox_id: str) -> DataBackup:
        """Create backup of job data"""
        timestamp = datetime.utcnow().strftime('%Y%m%d_%H%M%S')
        backup_id = f"{job_id}_{backup_type}_{timestamp}"
        backup_file = f"{self.directories['backups']}/{backup_id}.tar.gz"
        
        if backup_type == 'full':
            # Backup entire job directory
            source_path = f"{self.directories['results']}/{job_id}"
            command = f"tar -czf {backup_file} -C {self.directories['results']} {job_id}"
        elif backup_type == 'incremental':
            # Backup only new/changed files (simplified - backup checkpoints)
            source_path = f"{self.directories['checkpoints']}/{job_id}.json"
            command = f"tar -czf {backup_file} -C {self.directories['checkpoints']} {job_id}.json"
        else:
            raise ValueError(f"Unknown backup type: {backup_type}")
        
        # Create backup
        result = await self.client.execute_command(sandbox_id, command, timeout=300)
        
        if result['exit_code'] != 0:
            raise Exception(f"Backup creation failed: {result['stderr']}")
        
        # Get backup file size
        size_result = await self.client.execute_command(
            sandbox_id,
            f"stat -c%s {backup_file}",
            timeout=30
        )
        
        size_bytes = int(size_result['stdout'].strip()) if size_result['exit_code'] == 0 else 0
        
        backup = DataBackup(
            backup_id=backup_id,
            job_id=job_id,
            backup_type=backup_type,
            file_path=backup_file,
            size_bytes=size_bytes,
            created_at=datetime.utcnow()
        )
        
        # Save backup metadata
        backup_meta_file = f"{self.directories['backups']}/{backup_id}.meta.json"
        backup_meta = {
            "backup_id": backup.backup_id,
            "job_id": backup.job_id,
            "backup_type": backup.backup_type,
            "file_path": backup.file_path,
            "size_bytes": backup.size_bytes,
            "created_at": backup.created_at.isoformat()
        }
        
        command = f"echo '{json.dumps(backup_meta)}' > {backup_meta_file}"
        await self.client.execute_command(sandbox_id, command, timeout=30)
        
        logger.info(f"Created {backup_type} backup {backup_id} ({size_bytes} bytes)")
        
        return backup
    
    async def restore_from_backup(self, backup_id: str, sandbox_id: str) -> bool:
        """Restore job data from backup"""
        backup_file = f"{self.directories['backups']}/{backup_id}.tar.gz"
        
        # Check if backup exists
        result = await self.client.execute_command(
            sandbox_id,
            f"test -f {backup_file} && echo 'exists' || echo 'not_found'",
            timeout=30
        )
        
        if 'not_found' in result['stdout']:
            logger.error(f"Backup {backup_id} not found")
            return False
        
        # Extract backup
        command = f"tar -xzf {backup_file} -C {self.directories['results']}"
        result = await self.client.execute_command(sandbox_id, command, timeout=300)
        
        if result['exit_code'] != 0:
            logger.error(f"Failed to restore backup {backup_id}: {result['stderr']}")
            return False
        
        logger.info(f"Successfully restored backup {backup_id}")
        return True
    
    async def cleanup_old_data(self, sandbox_id: str, retention_days: int = 30):
        """Clean up old job data and backups"""
        cutoff_date = datetime.utcnow() - timedelta(days=retention_days)
        cutoff_timestamp = cutoff_date.strftime('%Y%m%d')
        
        # Clean up old results
        command = f"find {self.directories['results']} -type d -name '*' -exec basename {{}} \\; | while read job_id; do if [[ $job_id < {cutoff_timestamp} ]]; then rm -rf {self.directories['results']}/$job_id; fi; done"
        await self.client.execute_command(sandbox_id, command, timeout=300)
        
        # Clean up old backups
        command = f"find {self.directories['backups']} -name '*.tar.gz' -mtime +{retention_days} -delete"
        await self.client.execute_command(sandbox_id, command, timeout=300)
        
        # Clean up old checkpoints
        command = f"find {self.directories['checkpoints']} -name '*.json' -mtime +{retention_days} -delete"
        await self.client.execute_command(sandbox_id, command, timeout=300)
        
        logger.info(f"Cleaned up data older than {retention_days} days")
    
    async def get_volume_usage(self, sandbox_id: str) -> Dict[str, Any]:
        """Get volume usage statistics"""
        usage_info = {}
        
        for dir_name, dir_path in self.directories.items():
            # Get directory size
            result = await self.client.execute_command(
                sandbox_id,
                f"du -sh {dir_path} 2>/dev/null || echo '0K {dir_path}'",
                timeout=60
            )
            
            if result['exit_code'] == 0:
                size_str = result['stdout'].strip().split()[0]
                usage_info[dir_name] = {
                    'size': size_str,
                    'path': dir_path
                }
        
        # Get total volume usage
        result = await self.client.execute_command(
            sandbox_id,
            f"df -h {self.volume_mount_path}",
            timeout=30
        )
        
        if result['exit_code'] == 0:
            df_lines = result['stdout'].strip().split('\n')
            if len(df_lines) > 1:
                df_parts = df_lines[1].split()
                usage_info['total'] = {
                    'size': df_parts[1] if len(df_parts) > 1 else 'Unknown',
                    'used': df_parts[2] if len(df_parts) > 2 else 'Unknown',
                    'available': df_parts[3] if len(df_parts) > 3 else 'Unknown',
                    'use_percent': df_parts[4] if len(df_parts) > 4 else 'Unknown'
                }
        
        return usage_info
    
    async def list_job_checkpoints(self, sandbox_id: str) -> List[Dict[str, Any]]:
        """List all available job checkpoints"""
        result = await self.client.execute_command(
            sandbox_id,
            f"find {self.directories['checkpoints']} -name '*.json' -type f",
            timeout=60
        )
        
        if result['exit_code'] != 0:
            return []
        
        checkpoint_files = result['stdout'].strip().split('\n')
        checkpoints = []
        
        for checkpoint_file in checkpoint_files:
            if not checkpoint_file.strip():
                continue
            
            # Read checkpoint metadata
            result = await self.client.execute_command(
                sandbox_id,
                f"cat {checkpoint_file}",
                timeout=30
            )
            
            if result['exit_code'] == 0:
                try:
                    checkpoint_data = json.loads(result['stdout'])
                    checkpoints.append({
                        'job_id': checkpoint_data.get('job_id'),
                        'username': checkpoint_data.get('username'),
                        'processed_count': checkpoint_data.get('processed_count'),
                        'total_followers': checkpoint_data.get('total_followers'),
                        'progress': checkpoint_data.get('processed_count', 0) / max(checkpoint_data.get('total_followers', 1), 1),
                        'updated_at': checkpoint_data.get('updated_at'),
                        'status': checkpoint_data.get('status')
                    })
                except json.JSONDecodeError:
                    continue
        
        return sorted(checkpoints, key=lambda x: x.get('updated_at', ''), reverse=True)
