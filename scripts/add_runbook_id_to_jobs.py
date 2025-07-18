import asyncio
from uuid import UUID
from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie

from app.models import ExecutionJob, Runbook

# This is a placeholder UUID. In a real scenario, you might want to
# associate old jobs with a specific "unknown" runbook.
UNKNOWN_RUNBOOK_ID = UUID("00000000-0000-0000-0000-000000000000")


async def run_migration():
    """
    Adds a default runbook_id to any execution jobs that are missing it.
    """
    client = AsyncIOMotorClient(
        "mongodb://runbook:secret@localhost:27017/runbook?authSource=runbook"
    )
    await init_beanie(database=client.runbook, document_models=[ExecutionJob, Runbook])

    print("Finding execution jobs missing a runbook_id...")
    jobs_to_update = await ExecutionJob.find(
        {"runbook_id": {"$exists": False}}
    ).to_list()

    if not jobs_to_update:
        print("No jobs to update. Database is already up to date.")
        return

    print(f"Found {len(jobs_to_update)} jobs to update.")

    for job in jobs_to_update:
        job.runbook_id = UNKNOWN_RUNBOOK_ID
        await job.save()
        print(f"Updated job {job.id}")

    print("Migration complete.")


if __name__ == "__main__":
    asyncio.run(run_migration())
