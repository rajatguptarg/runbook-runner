from fastapi import FastAPI

from app.auth import require_roles
from app.users import router as users_router
from app.db import create_init_beanie
from app.models import User

app = FastAPI()
app.add_event_handler("startup", create_init_beanie([User]))


@app.get("/")
def read_root():
    return {"Hello": "World"}


@app.get("/protected")
async def protected(_=require_roles("sre")):
    return {"protected": True}


app.include_router(users_router)
