# Resume Capability for Interrupted Scans - Followlytics Enterprise
import asyncio
import json
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass
from enum import Enum

from .client import DaytonaClient
from .volume_manager import VolumeManager, JobCheckpoint
from .config import config

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class ResumeStrategy(Enum):
    """Resume strategies for different failure scenarios"""
    CONTINUE_FROM_CHECKPOINT = "continue_from_checkpoint"
    RESTART_FAILED_CHUNKS = "restart_failed_chunks"
    FULL_RESTART = "full_restart"
    MERGE_PARTIAL_RESULTS = "merge_partial_results"

@dataclass
class ResumeContext:
    """Context information for resuming a job"""
    job_id: str
    original_username: str
    total_followers: int
    checkpoint: Optional[JobCheckpoint]
    completed_chunks: List[int]
    failed_chunks: List[int]
    partial_results: Dict[str, Any]
    recommended_strategy: ResumeStrategy
    estimated_remaining_time: float
    estimated_remaining_cost: float

class ResumeManager:
    """Manages resume capability for interrupted follower scans"""
    
    def __init__(self, daytona_client: DaytonaClient, volume_manager: VolumeManager):
        self.client = daytona_client
        self.volume_manager = volume_manager
        
    async def analyze_interrupted_job(self, job_id: str, sandbox_id: str) -> ResumeContext:
        """Analyze an interrupted job and determine resume strategy"""
        logger.info(f"Analyzing interrupted job: {job_id}")
        
        # Load checkpoint if available
        checkpoint = await self.volume_manager.load_job_checkpoint(job_id, sandbox_id)
        
        # Analyze completed chunks
        completed_chunks, failed_chunks = await self._analyze_chunk_status(job_id, sandbox_id)
        
        # Load partial results
        partial_results = await self._load_partial_results(job_id, sandbox_id)
        
        # Determine recommended strategy
        strategy = await self._determine_resume_strategy(
            checkpoint, completed_chunks, failed_chunks, partial_results
        )
        
        # Calculate estimates
        if checkpoint:
            remaining_followers = checkpoint.total_followers - checkpoint.processed_count
            estimated_time = max(0.5, remaining_followers / 50000)  # 50K followers per hour
            estimated_cost = max(1, remaining_followers / 20000) * estimated_time * 2.0  # $2/hour per worker
        else:
            estimated_time = 1.0
            estimated_cost = 10.0
        
        resume_context = ResumeContext(
            job_id=job_id,
            original_username=checkpoint.username if checkpoint else "unknown",
            total_followers=checkpoint.total_followers if checkpoint else 0,
            checkpoint=checkpoint,
            completed_chunks=completed_chunks,
            failed_chunks=failed_chunks,
            partial_results=partial_results,
            recommended_strategy=strategy,
            estimated_remaining_time=estimated_time,
            estimated_remaining_cost=estimated_cost
        )
        
        logger.info(f"Resume analysis complete: {len(completed_chunks)} completed, {len(failed_chunks)} failed chunks")
        return resume_context
    
    async def resume_job(self, resume_context: ResumeContext, sandbox_id: str) -> bool:
        """Resume a job based on the resume context"""
        logger.info(f"Resuming job {resume_context.job_id} using strategy: {resume_context.recommended_strategy.value}")
        
        try:
            if resume_context.recommended_strategy == ResumeStrategy.CONTINUE_FROM_CHECKPOINT:
                return await self._resume_from_checkpoint(resume_context, sandbox_id)
            
            elif resume_context.recommended_strategy == ResumeStrategy.RESTART_FAILED_CHUNKS:
                return await self._restart_failed_chunks(resume_context, sandbox_id)
            
            elif resume_context.recommended_strategy == ResumeStrategy.MERGE_PARTIAL_RESULTS:
                return await self._merge_partial_results(resume_context, sandbox_id)
            
            elif resume_context.recommended_strategy == ResumeStrategy.FULL_RESTART:
                return await self._full_restart(resume_context, sandbox_id)
            
            else:
                logger.error(f"Unknown resume strategy: {resume_context.recommended_strategy}")
                return False
                
        except Exception as e:
            logger.error(f"Failed to resume job {resume_context.job_id}: {e}")
            return False
    
    async def _analyze_chunk_status(self, job_id: str, sandbox_id: str) -> Tuple[List[int], List[int]]:
        """Analyze which chunks completed successfully and which failed"""
        results_dir = f"{self.volume_manager.directories['results']}/{job_id}"
        
        # List all chunk files
        result = await self.client.execute_command(
            sandbox_id,
            f"find {results_dir} -name 'chunk_*.json' -type f 2>/dev/null || true",
            timeout=60
        )
        
        completed_chunks = []
        failed_chunks = []
        
        if result['exit_code'] == 0 and result['stdout'].strip():
            chunk_files = result['stdout'].strip().split('\n')
            
            for chunk_file in chunk_files:
                if not chunk_file.strip():
                    continue
                
                # Extract chunk ID from filename
                try:
                    chunk_id = int(chunk_file.split('chunk_')[1].split('.json')[0])
                    
                    # Check if chunk is complete and valid
                    check_result = await self.client.execute_command(
                        sandbox_id,
                        f"cat {chunk_file}",
                        timeout=30
                    )
                    
                    if check_result['exit_code'] == 0:
                        try:
                            chunk_data = json.loads(check_result['stdout'])
                            if chunk_data.get('followers') and len(chunk_data['followers']) > 0:
                                completed_chunks.append(chunk_id)
                            else:
                                failed_chunks.append(chunk_id)
                        except json.JSONDecodeError:
                            failed_chunks.append(chunk_id)
                    else:
                        failed_chunks.append(chunk_id)
                        
                except (ValueError, IndexError):
                    continue
        
        return sorted(completed_chunks), sorted(failed_chunks)
    
    async def _load_partial_results(self, job_id: str, sandbox_id: str) -> Dict[str, Any]:
        """Load any partial results from the job"""
        results_dir = f"{self.volume_manager.directories['results']}/{job_id}"
        
        # Check for consolidated results
        consolidated_file = f"{results_dir}/consolidated.json"
        result = await self.client.execute_command(
            sandbox_id,
            f"test -f {consolidated_file} && cat {consolidated_file} || echo '{{}}'",
            timeout=60
        )
        
        if result['exit_code'] == 0:
            try:
                return json.loads(result['stdout'])
            except json.JSONDecodeError:
                pass
        
        return {}
    
    async def _determine_resume_strategy(self, 
                                       checkpoint: Optional[JobCheckpoint],
                                       completed_chunks: List[int],
                                       failed_chunks: List[int],
                                       partial_results: Dict[str, Any]) -> ResumeStrategy:
        """Determine the best resume strategy based on job state"""
        
        # If no checkpoint and no completed chunks, full restart
        if not checkpoint and not completed_chunks:
            return ResumeStrategy.FULL_RESTART
        
        # If we have a recent checkpoint and some progress, continue from checkpoint
        if checkpoint and checkpoint.processed_count > 0:
            time_since_update = datetime.utcnow() - checkpoint.updated_at
            if time_since_update < timedelta(hours=2):  # Recent checkpoint
                return ResumeStrategy.CONTINUE_FROM_CHECKPOINT
        
        # If we have completed chunks but some failed, restart failed chunks
        if completed_chunks and failed_chunks:
            completion_rate = len(completed_chunks) / (len(completed_chunks) + len(failed_chunks))
            if completion_rate > 0.7:  # 70% completion rate
                return ResumeStrategy.RESTART_FAILED_CHUNKS
        
        # If we have substantial partial results, try to merge them
        if partial_results and partial_results.get('total_followers', 0) > 1000:
            return ResumeStrategy.MERGE_PARTIAL_RESULTS
        
        # Default to full restart if nothing else works
        return ResumeStrategy.FULL_RESTART
    
    async def _resume_from_checkpoint(self, resume_context: ResumeContext, sandbox_id: str) -> bool:
        """Resume job from the last checkpoint"""
        if not resume_context.checkpoint:
            return False
        
        checkpoint = resume_context.checkpoint
        
        # Create resume job configuration
        resume_job_config = {
            "job_id": checkpoint.job_id,
            "username": checkpoint.username,
            "start_offset": checkpoint.last_processed_offset,
            "total_followers": checkpoint.total_followers,
            "resume_mode": True,
            "completed_chunks": resume_context.completed_chunks
        }
        
        # Write resume configuration
        resume_config_file = f"{self.volume_manager.directories['jobs']}/{checkpoint.job_id}_resume.json"
        command = f"echo '{json.dumps(resume_job_config)}' > {resume_config_file}"
        
        result = await self.client.execute_command(sandbox_id, command, timeout=30)
        
        if result['exit_code'] == 0:
            logger.info(f"Created resume configuration for job {checkpoint.job_id}")
            
            # Update checkpoint status
            checkpoint.status = "resuming"
            checkpoint.updated_at = datetime.utcnow()
            await self.volume_manager.save_job_checkpoint(checkpoint, sandbox_id)
            
            return True
        
        return False
    
    async def _restart_failed_chunks(self, resume_context: ResumeContext, sandbox_id: str) -> bool:
        """Restart only the failed chunks"""
        if not resume_context.failed_chunks:
            logger.info("No failed chunks to restart")
            return True
        
        # Create job configurations for failed chunks only
        for chunk_id in resume_context.failed_chunks:
            chunk_config = {
                "job_id": resume_context.job_id,
                "username": resume_context.original_username,
                "chunk_id": chunk_id,
                "retry_mode": True,
                "original_total_followers": resume_context.total_followers
            }
            
            chunk_config_file = f"{self.volume_manager.directories['jobs']}/{resume_context.job_id}_retry_chunk_{chunk_id}.json"
            command = f"echo '{json.dumps(chunk_config)}' > {chunk_config_file}"
            
            result = await self.client.execute_command(sandbox_id, command, timeout=30)
            
            if result['exit_code'] != 0:
                logger.error(f"Failed to create retry config for chunk {chunk_id}")
                return False
        
        logger.info(f"Created retry configurations for {len(resume_context.failed_chunks)} failed chunks")
        return True
    
    async def _merge_partial_results(self, resume_context: ResumeContext, sandbox_id: str) -> bool:
        """Merge partial results and mark job as completed"""
        if not resume_context.partial_results:
            return False
        
        # Consolidate all available results
        consolidated_result = await self.volume_manager.consolidate_job_results(
            resume_context.job_id, 
            sandbox_id
        )
        
        if consolidated_result and consolidated_result.get('total_followers', 0) > 0:
            # Create completion marker
            completion_marker = {
                "job_id": resume_context.job_id,
                "status": "completed_partial",
                "total_followers": consolidated_result['total_followers'],
                "completion_method": "merge_partial_results",
                "completed_at": datetime.utcnow().isoformat()
            }
            
            completion_file = f"{self.volume_manager.directories['results']}/{resume_context.job_id}/completion.json"
            command = f"echo '{json.dumps(completion_marker)}' > {completion_file}"
            
            result = await self.client.execute_command(sandbox_id, command, timeout=30)
            
            if result['exit_code'] == 0:
                logger.info(f"Merged partial results for job {resume_context.job_id}: {consolidated_result['total_followers']} followers")
                return True
        
        return False
    
    async def _full_restart(self, resume_context: ResumeContext, sandbox_id: str) -> bool:
        """Perform a full restart of the job"""
        # Clean up any existing partial data
        cleanup_commands = [
            f"rm -rf {self.volume_manager.directories['results']}/{resume_context.job_id}/*",
            f"rm -f {self.volume_manager.directories['checkpoints']}/{resume_context.job_id}.json",
            f"rm -f {self.volume_manager.directories['jobs']}/{resume_context.job_id}_*.json"
        ]
        
        for command in cleanup_commands:
            await self.client.execute_command(sandbox_id, command, timeout=30)
        
        # Create fresh job configuration
        fresh_job_config = {
            "job_id": resume_context.job_id,
            "username": resume_context.original_username,
            "total_followers": resume_context.total_followers,
            "restart_mode": True,
            "original_job_id": resume_context.job_id
        }
        
        fresh_config_file = f"{self.volume_manager.directories['jobs']}/{resume_context.job_id}_restart.json"
        command = f"echo '{json.dumps(fresh_job_config)}' > {fresh_config_file}"
        
        result = await self.client.execute_command(sandbox_id, command, timeout=30)
        
        if result['exit_code'] == 0:
            logger.info(f"Created fresh restart configuration for job {resume_context.job_id}")
            return True
        
        return False
    
    async def list_resumable_jobs(self, sandbox_id: str) -> List[Dict[str, Any]]:
        """List all jobs that can be resumed"""
        checkpoints = await self.volume_manager.list_job_checkpoints(sandbox_id)
        resumable_jobs = []
        
        for checkpoint_info in checkpoints:
            if checkpoint_info.get('status') in ['failed', 'interrupted', 'partial']:
                # Analyze this job for resume capability
                try:
                    resume_context = await self.analyze_interrupted_job(
                        checkpoint_info['job_id'], 
                        sandbox_id
                    )
                    
                    resumable_jobs.append({
                        'job_id': resume_context.job_id,
                        'username': resume_context.original_username,
                        'progress': checkpoint_info.get('progress', 0),
                        'total_followers': resume_context.total_followers,
                        'recommended_strategy': resume_context.recommended_strategy.value,
                        'estimated_remaining_time': resume_context.estimated_remaining_time,
                        'estimated_remaining_cost': resume_context.estimated_remaining_cost,
                        'last_updated': checkpoint_info.get('updated_at'),
                        'completed_chunks': len(resume_context.completed_chunks),
                        'failed_chunks': len(resume_context.failed_chunks)
                    })
                    
                except Exception as e:
                    logger.error(f"Failed to analyze job {checkpoint_info['job_id']}: {e}")
                    continue
        
        return sorted(resumable_jobs, key=lambda x: x.get('last_updated', ''), reverse=True)
    
    async def create_resume_report(self, job_id: str, sandbox_id: str) -> Dict[str, Any]:
        """Create a detailed resume report for a job"""
        resume_context = await self.analyze_interrupted_job(job_id, sandbox_id)
        
        report = {
            "job_id": job_id,
            "analysis_timestamp": datetime.utcnow().isoformat(),
            "job_info": {
                "username": resume_context.original_username,
                "total_followers": resume_context.total_followers,
                "progress_percentage": (resume_context.checkpoint.processed_count / max(resume_context.total_followers, 1)) * 100 if resume_context.checkpoint else 0
            },
            "checkpoint_info": {
                "exists": resume_context.checkpoint is not None,
                "last_updated": resume_context.checkpoint.updated_at.isoformat() if resume_context.checkpoint else None,
                "processed_count": resume_context.checkpoint.processed_count if resume_context.checkpoint else 0,
                "status": resume_context.checkpoint.status if resume_context.checkpoint else "unknown"
            },
            "chunk_analysis": {
                "completed_chunks": len(resume_context.completed_chunks),
                "failed_chunks": len(resume_context.failed_chunks),
                "completion_rate": len(resume_context.completed_chunks) / max(len(resume_context.completed_chunks) + len(resume_context.failed_chunks), 1)
            },
            "partial_results": {
                "available": bool(resume_context.partial_results),
                "follower_count": resume_context.partial_results.get('total_followers', 0)
            },
            "resume_recommendation": {
                "strategy": resume_context.recommended_strategy.value,
                "estimated_remaining_time_hours": resume_context.estimated_remaining_time,
                "estimated_remaining_cost_usd": resume_context.estimated_remaining_cost,
                "confidence": self._calculate_resume_confidence(resume_context)
            }
        }
        
        return report
    
    def _calculate_resume_confidence(self, resume_context: ResumeContext) -> str:
        """Calculate confidence level for resume success"""
        score = 0
        
        # Checkpoint recency
        if resume_context.checkpoint:
            time_since_update = datetime.utcnow() - resume_context.checkpoint.updated_at
            if time_since_update < timedelta(hours=1):
                score += 30
            elif time_since_update < timedelta(hours=6):
                score += 20
            elif time_since_update < timedelta(days=1):
                score += 10
        
        # Completion rate
        if resume_context.completed_chunks:
            total_chunks = len(resume_context.completed_chunks) + len(resume_context.failed_chunks)
            completion_rate = len(resume_context.completed_chunks) / max(total_chunks, 1)
            score += int(completion_rate * 40)
        
        # Partial results availability
        if resume_context.partial_results and resume_context.partial_results.get('total_followers', 0) > 0:
            score += 20
        
        # Strategy-based confidence
        if resume_context.recommended_strategy == ResumeStrategy.CONTINUE_FROM_CHECKPOINT:
            score += 10
        elif resume_context.recommended_strategy == ResumeStrategy.RESTART_FAILED_CHUNKS:
            score += 5
        
        if score >= 80:
            return "high"
        elif score >= 50:
            return "medium"
        else:
            return "low"
