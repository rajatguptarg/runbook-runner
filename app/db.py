import os
from typing import Iterable

from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie


def get_connection_string() -> str:
    """Build the MongoDB connection string from environment variables."""
    connection = os.getenv("DB_CONNECTION")
    if connection:
        return connection

    user = os.getenv("DB_USER")
    password = os.getenv("DB_PASSWORD")
    host = os.getenv("DB_HOST", "localhost")
    return f"mongodb://{user}:{password}@{host}"


def create_init_beanie(models: Iterable[type]):
    """Return a startup handler that initializes Beanie."""

    async def init() -> None:
        connection = get_connection_string()
        db_name = os.getenv("DB_NAME")
        client = AsyncIOMotorClient(connection)
        await init_beanie(database=client[db_name], document_models=list(models))

    return init
