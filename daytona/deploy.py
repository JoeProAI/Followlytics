# Deployment Script for Followlytics Enterprise Daytona System
import asyncio
import json
import logging
import os
import sys
from datetime import datetime
from typing import Dict, List, Optional, Any
from pathlib import Path

from .client import DaytonaClient
from .coordinator import CoordinatorService
from .snapshots import SnapshotManager
from .volume_manager import VolumeManager
from .auto_scaler import AutoScaler
from .cost_optimizer import CostOptimizer
from .test_suite import MassiveScaleTestSuite
from .config import config

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class DeploymentManager:
    """Manages the complete deployment of Followlytics Enterprise Daytona system"""
    
    def __init__(self):
        self.client: Optional[DaytonaClient] = None
        self.deployment_id = f"followlytics-enterprise-{int(datetime.utcnow().timestamp())}"
        self.deployment_log: List[Dict[str, Any]] = []
        
    async def initialize(self):
        """Initialize deployment manager"""
        logger.info("Initializing Deployment Manager...")
        
        # Validate environment variables
        required_vars = [
            'DAYTONA_ORG_ID',
            'DAYTONA_API_KEY', 
            'DAYTONA_API_URL'
        ]
        
        missing_vars = [var for var in required_vars if not os.getenv(var)]
        if missing_vars:
            raise ValueError(f"Missing required environment variables: {missing_vars}")
        
        self.client = DaytonaClient()
        await self.client.__aenter__()
        
        logger.info("Deployment Manager initialized successfully")
    
    async def cleanup(self):
        """Cleanup deployment resources"""
        if self.client:
            await self.client.__aexit__(None, None, None)
    
    def log_step(self, step: str, status: str, details: Optional[Dict] = None):
        """Log deployment step"""
        entry = {
            "timestamp": datetime.utcnow().isoformat(),
            "step": step,
            "status": status,
            "details": details or {}
        }
        self.deployment_log.append(entry)
        
        status_emoji = "✅" if status == "success" else "❌" if status == "failed" else "🔄"
        logger.info(f"{status_emoji} {step}: {status}")
    
    async def validate_prerequisites(self) -> bool:
        """Validate deployment prerequisites"""
        logger.info("Validating deployment prerequisites...")
        
        try:
            # Test Daytona API connectivity
            usage_stats = await self.client.get_usage_stats()
            self.log_step("API Connectivity", "success", {"credits_remaining": usage_stats.get('credits_remaining', 0)})
            
            # Check available credits
            credits = usage_stats.get('credits_remaining', 0)
            if credits < 100:  # Minimum $100 for deployment
                self.log_step("Credit Check", "failed", {"credits": credits, "minimum_required": 100})
                return False
            
            self.log_step("Credit Check", "success", {"credits": credits})
            
            # Validate configuration
            if not config.org_id or not config.api_key:
                self.log_step("Configuration Check", "failed", {"message": "Missing Daytona credentials"})
                return False
            
            self.log_step("Configuration Check", "success")
            
            # Check for existing resources
            existing_sandboxes = await self.client.list_sandboxes()
            existing_volumes = await self.client.list_volumes()
            
            self.log_step("Resource Check", "success", {
                "existing_sandboxes": len(existing_sandboxes),
                "existing_volumes": len(existing_volumes)
            })
            
            return True
            
        except Exception as e:
            self.log_step("Prerequisites Validation", "failed", {"error": str(e)})
            return False
    
    async def create_shared_volumes(self) -> bool:
        """Create shared volumes for data persistence"""
        logger.info("Creating shared volumes...")
        
        try:
            volume_manager = VolumeManager(self.client)
            await volume_manager.initialize()
            
            # Create main shared volume
            shared_volume = await self.client.create_volume(
                name="followlytics-shared-data",
                size_gb=100,  # 100GB for results and checkpoints
                description="Shared volume for Followlytics Enterprise data"
            )
            
            if shared_volume:
                self.log_step("Shared Volume Creation", "success", {"volume_id": shared_volume.id})
                
                # Setup directory structure
                setup_success = await volume_manager.setup_volume_directories()
                if setup_success:
                    self.log_step("Volume Directory Setup", "success")
                    return True
                else:
                    self.log_step("Volume Directory Setup", "failed")
                    return False
            else:
                self.log_step("Shared Volume Creation", "failed")
                return False
                
        except Exception as e:
            self.log_step("Shared Volume Creation", "failed", {"error": str(e)})
            return False
    
    async def create_snapshots(self) -> bool:
        """Create Daytona snapshots for coordinator and workers"""
        logger.info("Creating Daytona snapshots...")
        
        try:
            snapshot_manager = SnapshotManager(self.client)
            
            # Create coordinator snapshot
            coordinator_snapshot = await snapshot_manager.create_coordinator_snapshot()
            if coordinator_snapshot:
                self.log_step("Coordinator Snapshot", "success", {"snapshot_id": coordinator_snapshot.id})
            else:
                self.log_step("Coordinator Snapshot", "failed")
                return False
            
            # Create worker snapshot
            worker_snapshot = await snapshot_manager.create_worker_snapshot()
            if worker_snapshot:
                self.log_step("Worker Snapshot", "success", {"snapshot_id": worker_snapshot.id})
            else:
                self.log_step("Worker Snapshot", "failed")
                return False
            
            return True
            
        except Exception as e:
            self.log_step("Snapshot Creation", "failed", {"error": str(e)})
            return False
    
    async def deploy_coordinator(self) -> Optional[str]:
        """Deploy the coordinator service"""
        logger.info("Deploying coordinator service...")
        
        try:
            # Create coordinator sandbox
            coordinator_sandbox = await self.client.create_sandbox(
                name="followlytics-coordinator",
                auto_stop_minutes=0,  # Don't auto-stop coordinator
                resources={
                    "cpu": 4,
                    "memory": 8,
                    "disk": 50
                }
            )
            
            if not coordinator_sandbox:
                self.log_step("Coordinator Deployment", "failed", {"error": "Failed to create sandbox"})
                return None
            
            # Upload coordinator code
            coordinator_files = [
                "coordinator.py",
                "client.py", 
                "config.py",
                "volume_manager.py",
                "auto_scaler.py",
                "cost_optimizer.py",
                "__init__.py"
            ]
            
            for file_name in coordinator_files:
                file_path = Path(__file__).parent / file_name
                if file_path.exists():
                    await self.client.upload_file(
                        coordinator_sandbox.id,
                        str(file_path),
                        f"/app/{file_name}"
                    )
            
            # Install dependencies and start coordinator
            setup_commands = [
                "cd /app",
                "pip install fastapi uvicorn aiohttp aiofiles playwright",
                "python -m playwright install chromium",
                "nohup python -m uvicorn coordinator:app --host 0.0.0.0 --port 8000 > coordinator.log 2>&1 &"
            ]
            
            for cmd in setup_commands:
                result = await self.client.execute_command(
                    coordinator_sandbox.id,
                    cmd,
                    timeout=300  # 5 minutes timeout
                )
                
                if not result or result.exit_code != 0:
                    self.log_step("Coordinator Setup", "failed", {"command": cmd, "result": result})
                    return None
            
            # Wait for coordinator to start
            await asyncio.sleep(30)
            
            # Test coordinator health
            health_result = await self.client.execute_command(
                coordinator_sandbox.id,
                "curl -f http://localhost:8000/health",
                timeout=30
            )
            
            if health_result and health_result.exit_code == 0:
                self.log_step("Coordinator Deployment", "success", {"sandbox_id": coordinator_sandbox.id})
                return coordinator_sandbox.id
            else:
                self.log_step("Coordinator Health Check", "failed")
                return None
                
        except Exception as e:
            self.log_step("Coordinator Deployment", "failed", {"error": str(e)})
            return None
    
    async def deploy_initial_workers(self, coordinator_id: str, count: int = 2) -> List[str]:
        """Deploy initial worker fleet"""
        logger.info(f"Deploying {count} initial workers...")
        
        worker_ids = []
        
        for i in range(count):
            try:
                # Create worker sandbox
                worker_sandbox = await self.client.create_sandbox(
                    name=f"followlytics-worker-{i+1}",
                    auto_stop_minutes=60,  # Auto-stop after 1 hour of inactivity
                    resources={
                        "cpu": 2,
                        "memory": 4,
                        "disk": 20
                    }
                )
                
                if not worker_sandbox:
                    self.log_step(f"Worker {i+1} Deployment", "failed", {"error": "Failed to create sandbox"})
                    continue
                
                # Upload worker code
                worker_files = [
                    "worker.py",
                    "client.py",
                    "config.py",
                    "__init__.py"
                ]
                
                for file_name in worker_files:
                    file_path = Path(__file__).parent / file_name
                    if file_path.exists():
                        await self.client.upload_file(
                            worker_sandbox.id,
                            str(file_path),
                            f"/app/{file_name}"
                        )
                
                # Setup worker
                setup_commands = [
                    "cd /app",
                    "pip install aiohttp aiofiles playwright",
                    "python -m playwright install chromium",
                    f"nohup python worker.py --coordinator-url http://{coordinator_id}:8000 > worker.log 2>&1 &"
                ]
                
                setup_success = True
                for cmd in setup_commands:
                    result = await self.client.execute_command(
                        worker_sandbox.id,
                        cmd,
                        timeout=300
                    )
                    
                    if not result or result.exit_code != 0:
                        setup_success = False
                        break
                
                if setup_success:
                    worker_ids.append(worker_sandbox.id)
                    self.log_step(f"Worker {i+1} Deployment", "success", {"sandbox_id": worker_sandbox.id})
                else:
                    self.log_step(f"Worker {i+1} Deployment", "failed", {"error": "Setup failed"})
                
                # Brief delay between worker deployments
                await asyncio.sleep(10)
                
            except Exception as e:
                self.log_step(f"Worker {i+1} Deployment", "failed", {"error": str(e)})
        
        logger.info(f"Deployed {len(worker_ids)}/{count} workers successfully")
        return worker_ids
    
    async def configure_auto_scaling(self, coordinator_id: str) -> bool:
        """Configure auto-scaling for the deployment"""
        logger.info("Configuring auto-scaling...")
        
        try:
            # Auto-scaling will be managed by the coordinator
            # Just verify it's configured properly
            
            config_result = await self.client.execute_command(
                coordinator_id,
                "curl -f http://localhost:8000/system/status",
                timeout=30
            )
            
            if config_result and config_result.exit_code == 0:
                self.log_step("Auto-scaling Configuration", "success")
                return True
            else:
                self.log_step("Auto-scaling Configuration", "failed")
                return False
                
        except Exception as e:
            self.log_step("Auto-scaling Configuration", "failed", {"error": str(e)})
            return False
    
    async def run_deployment_tests(self) -> bool:
        """Run basic deployment validation tests"""
        logger.info("Running deployment validation tests...")
        
        try:
            test_suite = MassiveScaleTestSuite()
            await test_suite.initialize()
            
            # Run only the baseline test for deployment validation
            scenarios = test_suite.get_test_scenarios()
            baseline_scenario = next((s for s in scenarios if s.name == "small_scale_baseline"), None)
            
            if baseline_scenario:
                result = await test_suite.run_test_scenario(baseline_scenario)
                
                if result.passed:
                    self.log_step("Deployment Tests", "success", {
                        "scenario": result.scenario_name,
                        "success_rate": result.success_rate,
                        "performance_score": result.performance_score
                    })
                    return True
                else:
                    self.log_step("Deployment Tests", "failed", {
                        "scenario": result.scenario_name,
                        "issues": result.issues
                    })
                    return False
            else:
                self.log_step("Deployment Tests", "failed", {"error": "Baseline scenario not found"})
                return False
                
        except Exception as e:
            self.log_step("Deployment Tests", "failed", {"error": str(e)})
            return False
        finally:
            if 'test_suite' in locals():
                await test_suite.cleanup()
    
    async def generate_deployment_report(self, coordinator_id: Optional[str], worker_ids: List[str]) -> Dict[str, Any]:
        """Generate comprehensive deployment report"""
        
        successful_steps = len([log for log in self.deployment_log if log["status"] == "success"])
        total_steps = len(self.deployment_log)
        
        # Get current system status
        system_status = {}
        if coordinator_id:
            try:
                usage_stats = await self.client.get_usage_stats()
                system_status = {
                    "coordinator_id": coordinator_id,
                    "active_workers": len(worker_ids),
                    "credits_remaining": usage_stats.get('credits_remaining', 0),
                    "deployment_cost_estimate": len(worker_ids) * 2.0 * 24  # $2/hour * 24 hours
                }
            except Exception:
                system_status = {"error": "Failed to get system status"}
        
        report = {
            "deployment_id": self.deployment_id,
            "timestamp": datetime.utcnow().isoformat(),
            "success": successful_steps == total_steps and coordinator_id is not None,
            "summary": {
                "successful_steps": successful_steps,
                "total_steps": total_steps,
                "success_rate": successful_steps / max(total_steps, 1)
            },
            "system_status": system_status,
            "deployment_log": self.deployment_log,
            "next_steps": self._generate_next_steps(coordinator_id, worker_ids)
        }
        
        return report
    
    def _generate_next_steps(self, coordinator_id: Optional[str], worker_ids: List[str]) -> List[str]:
        """Generate next steps based on deployment results"""
        
        next_steps = []
        
        if coordinator_id and worker_ids:
            next_steps.extend([
                "✅ Deployment successful! System is ready for production use.",
                f"🔗 Coordinator URL: Access your coordinator at sandbox {coordinator_id}:8000",
                f"👥 Active Workers: {len(worker_ids)} workers deployed and ready",
                "📊 Monitor system health via the Enterprise dashboard",
                "🧪 Run full test suite to validate massive scale capabilities",
                "💰 Monitor costs and optimize resource usage",
                "📈 Scale up workers as needed for larger jobs"
            ])
        else:
            next_steps.extend([
                "❌ Deployment encountered issues. Review the deployment log.",
                "🔧 Fix any failed steps and retry deployment",
                "📞 Contact support if issues persist",
                "💡 Consider running deployment in test mode first"
            ])
        
        return next_steps
    
    async def full_deployment(self) -> Dict[str, Any]:
        """Execute complete deployment process"""
        logger.info(f"Starting Followlytics Enterprise Daytona deployment: {self.deployment_id}")
        
        coordinator_id = None
        worker_ids = []
        
        try:
            # Step 1: Validate prerequisites
            if not await self.validate_prerequisites():
                return await self.generate_deployment_report(None, [])
            
            # Step 2: Create shared volumes
            if not await self.create_shared_volumes():
                return await self.generate_deployment_report(None, [])
            
            # Step 3: Create snapshots
            if not await self.create_snapshots():
                return await self.generate_deployment_report(None, [])
            
            # Step 4: Deploy coordinator
            coordinator_id = await self.deploy_coordinator()
            if not coordinator_id:
                return await self.generate_deployment_report(None, [])
            
            # Step 5: Deploy initial workers
            worker_ids = await self.deploy_initial_workers(coordinator_id, count=2)
            if not worker_ids:
                return await self.generate_deployment_report(coordinator_id, [])
            
            # Step 6: Configure auto-scaling
            if not await self.configure_auto_scaling(coordinator_id):
                logger.warning("Auto-scaling configuration failed, but deployment can continue")
            
            # Step 7: Run deployment tests
            if not await self.run_deployment_tests():
                logger.warning("Deployment tests failed, but system may still be functional")
            
            # Generate final report
            report = await self.generate_deployment_report(coordinator_id, worker_ids)
            
            logger.info(f"Deployment completed: {'SUCCESS' if report['success'] else 'PARTIAL/FAILED'}")
            return report
            
        except Exception as e:
            logger.error(f"Deployment failed with exception: {e}")
            self.log_step("Deployment", "failed", {"error": str(e)})
            return await self.generate_deployment_report(coordinator_id, worker_ids)

async def deploy_followlytics_enterprise():
    """Main deployment function"""
    
    deployment_manager = DeploymentManager()
    
    try:
        await deployment_manager.initialize()
        report = await deployment_manager.full_deployment()
        
        # Print deployment report
        print("\n" + "="*80)
        print("FOLLOWLYTICS ENTERPRISE DAYTONA DEPLOYMENT REPORT")
        print("="*80)
        print(f"Deployment ID: {report['deployment_id']}")
        print(f"Status: {'✅ SUCCESS' if report['success'] else '❌ FAILED/PARTIAL'}")
        print(f"Success Rate: {report['summary']['successful_steps']}/{report['summary']['total_steps']} steps")
        
        if report.get('system_status'):
            status = report['system_status']
            if 'coordinator_id' in status:
                print(f"Coordinator: {status['coordinator_id']}")
                print(f"Workers: {status['active_workers']}")
                print(f"Credits: ${status.get('credits_remaining', 0):.2f}")
        
        print("\nNext Steps:")
        for step in report['next_steps']:
            print(f"  {step}")
        
        # Save detailed report
        report_file = f"deployment_report_{report['deployment_id']}.json"
        with open(report_file, 'w') as f:
            json.dump(report, f, indent=2)
        
        print(f"\nDetailed report saved to: {report_file}")
        
        return report
        
    finally:
        await deployment_manager.cleanup()

if __name__ == "__main__":
    asyncio.run(deploy_followlytics_enterprise())
