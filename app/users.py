import secrets
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from .models import User
from .auth import get_current_role

router = APIRouter()


class SignupRequest(BaseModel):
    username: str
    password: str
    role: str = "developer"


class LoginRequest(BaseModel):
    username: str
    password: str


@router.post("/signup")
async def signup(data: SignupRequest):
    existing = await User.find_one({"username": data.username})
    if existing:
        raise HTTPException(status_code=400, detail="Username already exists")

    api_key = secrets.token_hex(16)
    user = User(
        username=data.username,
        password=data.password,
        api_key=api_key,
        role=data.role,
    )
    await user.insert()
    return {"api_key": api_key}


@router.post("/login")
async def login(data: LoginRequest):
    user = await User.find_one({"username": data.username})
    if not user or user.password != data.password:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    return {"api_key": user.api_key}


@router.post("/logout")
async def logout(role: str = Depends(get_current_role)):
    return {"detail": "Logged out"}
