import io
from typing import List
from uuid import UUID

import docker
from fastapi import APIRouter, Depends, HTTPException, status
from loguru import logger
from pydantic import BaseModel

from app.models import User
from app.models.environment import ExecutionEnvironment
from app.security import get_current_user, require_roles
from app.services.audit import log_action

router = APIRouter()


class EnvironmentCreate(BaseModel):
    name: str
    description: str
    dockerfile: str


class EnvironmentUpdate(BaseModel):
    name: str
    description: str
    dockerfile: str


class EnvironmentRead(BaseModel):
    id: UUID
    name: str
    description: str
    image_tag: str | None


auth = require_roles("sre")


def get_docker_client():
    try:
        client = docker.from_env()
        client.ping()
        return client
    except Exception:
        raise HTTPException(
            status_code=500, detail="Could not connect to Docker daemon."
        )


@router.post(
    "",
    response_model=EnvironmentRead,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new execution environment",
)
async def create_environment(
    data: EnvironmentCreate,
    current_user: User = Depends(get_current_user),
    _=auth,
    docker_client: docker.DockerClient = Depends(get_docker_client),
):
    """
    Create a new execution environment. This will trigger a Docker image build.
    """
    environment = ExecutionEnvironment(
        name=data.name,
        description=data.description,
        dockerfile=data.dockerfile,
        created_by=current_user.id,
    )
    await environment.insert()

    image_tag = f"runbook-exec-env:{environment.id}"
    try:
        logger.info(f"Building Docker image {image_tag}...")
        dockerfile_bytes = io.BytesIO(data.dockerfile.encode("utf-8"))
        image, build_logs = docker_client.images.build(
            fileobj=dockerfile_bytes, tag=image_tag, rm=True
        )
        environment.image_tag = image.tags[0]
        await environment.save()
        logger.info(f"Successfully built image {image_tag}")

    except docker.errors.BuildError as e:
        await environment.delete()  # Clean up the failed environment entry
        logger.error(f"Docker build failed for environment {environment.id}: {e}")
        raise HTTPException(status_code=400, detail=f"Docker build failed: {e}")
    except Exception as e:
        await environment.delete()
        logger.error(f"An unexpected error occurred during image build: {e}")
        if "Credentials store" in str(e):
            raise HTTPException(
                status_code=400,
                detail=(
                    "Docker credential helper error. "
                    "This can happen if your local Docker is configured to use a "
                    "cloud credential helper (like gcloud) and you are not logged in. "
                    "Please check your Docker config (`~/.docker/config.json`) or "
                    "ensure you are authenticated with your cloud provider."
                ),
            )
        raise HTTPException(status_code=500, detail="An unexpected error occurred.")

    await log_action(
        current_user,
        "create_environment",
        environment.id,
        details={"name": data.name, "image_tag": environment.image_tag},
    )

    return EnvironmentRead(**environment.model_dump())


@router.put(
    "/{environment_id}",
    response_model=EnvironmentRead,
    summary="Update an execution environment",
)
async def update_environment(
    environment_id: UUID,
    data: EnvironmentUpdate,
    current_user: User = Depends(get_current_user),
    _=auth,
    docker_client: docker.DockerClient = Depends(get_docker_client),
):
    """
    Update an execution environment. If the Dockerfile is changed,
    it will trigger a rebuild of the Docker image.
    """
    environment = await ExecutionEnvironment.get(environment_id)
    if not environment:
        raise HTTPException(status_code=404, detail="Environment not found")

    environment.name = data.name
    environment.description = data.description

    if environment.dockerfile != data.dockerfile:
        old_image_tag = environment.image_tag
        new_image_tag = f"runbook-exec-env:{environment.id}"

        try:
            logger.info(f"Rebuilding Docker image {new_image_tag}...")
            dockerfile_bytes = io.BytesIO(data.dockerfile.encode("utf-8"))
            image, _ = docker_client.images.build(
                fileobj=dockerfile_bytes, tag=new_image_tag, rm=True
            )
            environment.dockerfile = data.dockerfile
            environment.image_tag = image.tags[0]
            logger.info(f"Successfully rebuilt image {new_image_tag}")

            # Clean up the old image if it exists and is different
            if old_image_tag and old_image_tag != new_image_tag:
                try:
                    docker_client.images.remove(image=old_image_tag, force=True)
                    logger.info(f"Removed old image {old_image_tag}")
                except docker.errors.ImageNotFound:
                    pass  # It's okay if it's already gone

        except docker.errors.BuildError as e:
            logger.error(f"Docker rebuild failed for environment {environment.id}: {e}")
            raise HTTPException(status_code=400, detail=f"Docker build failed: {e}")
        except Exception as e:
            logger.error(f"An unexpected error occurred during image rebuild: {e}")
            raise HTTPException(
                status_code=500, detail="An unexpected error occurred during rebuild."
            )

    await environment.save()
    await log_action(
        current_user,
        "update_environment",
        environment.id,
        details={"name": data.name},
    )

    return EnvironmentRead(**environment.model_dump())


@router.get(
    "",
    response_model=List[EnvironmentRead],
    summary="List all execution environments",
)
async def list_environments(_=auth):
    """
    Retrieve a list of all available execution environments.
    """
    environments = await ExecutionEnvironment.find_all().to_list()
    return [EnvironmentRead(**e.model_dump()) for e in environments]


@router.get(
    "/{environment_id}",
    response_model=ExecutionEnvironment,
    summary="Get a single execution environment",
)
async def get_environment(environment_id: UUID, _=auth):
    """
    Retrieve the full details of a single execution environment, including its Dockerfile.
    """
    environment = await ExecutionEnvironment.get(environment_id)
    if not environment:
        raise HTTPException(status_code=404, detail="Environment not found")
    return environment


@router.delete(
    "/{environment_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete an execution environment",
)
async def delete_environment(
    environment_id: UUID,
    current_user: User = Depends(get_current_user),
    _=auth,
    docker_client: docker.DockerClient = Depends(get_docker_client),
):
    """
    Delete an execution environment. This will also attempt to remove the Docker image.
    """
    environment = await ExecutionEnvironment.get(environment_id)
    if not environment:
        raise HTTPException(status_code=404, detail="Environment not found")

    if environment.image_tag:
        try:
            logger.info(f"Removing Docker image {environment.image_tag}")
            docker_client.images.remove(image=environment.image_tag, force=True)
        except docker.errors.ImageNotFound:
            logger.warning(
                f"Image {environment.image_tag} not found, but deleting DB record."
            )
        except Exception as e:
            logger.error(f"Could not remove image {environment.image_tag}: {e}")
            # Decide if you want to prevent deletion if image removal fails
            raise HTTPException(
                status_code=500, detail="Failed to remove Docker image."
            )

    await environment.delete()
    await log_action(current_user, "delete_environment", environment.id)
    return None
