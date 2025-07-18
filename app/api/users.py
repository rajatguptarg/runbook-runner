import secrets
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field

from app.models import User
from app.security import get_current_role

router = APIRouter()


class SignupRequest(BaseModel):
    username: str
    password: str
    role: str = "developer"


class SignupResponse(BaseModel):
    api_key: str = Field(
        ..., json_schema_extra={"example": "a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6"}
    )


class LoginRequest(BaseModel):
    username: str
    password: str


class LoginResponse(BaseModel):
    api_key: str = Field(
        ..., json_schema_extra={"example": "a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6"}
    )


class LogoutResponse(BaseModel):
    detail: str = Field(..., json_schema_extra={"example": "Logged out"})


@router.post(
    "/signup",
    response_model=SignupResponse,
    summary="Create a new user account",
    status_code=status.HTTP_201_CREATED,
)
async def signup(data: SignupRequest):
    """
    Create a new user and return an API key.
    """
    existing = await User.find_one({"username": data.username})
    if existing:
        raise HTTPException(status_code=400, detail="Username already exists")

    api_key = secrets.token_hex(16)
    user = User(
        username=data.username,
        password=data.password,  # In a real app, hash this
        api_key=api_key,
        role=data.role,
    )
    await user.insert()
    return {"api_key": api_key}


@router.post(
    "/login",
    response_model=LoginResponse,
    summary="Log in to get an API key",
)
async def login(data: LoginRequest):
    """
    Authenticate and retrieve an API key.
    """
    user = await User.find_one({"username": data.username})
    if not user or user.password != data.password:  # In a real app, verify hash
        raise HTTPException(status_code=401, detail="Invalid credentials")
    return {"api_key": user.api_key}


@router.post(
    "/logout",
    response_model=LogoutResponse,
    summary="Log out",
)
async def logout(_: str = Depends(get_current_role)):
    """
    Invalidates the user's session (conceptually, as API keys are stateless).
    """
    return {"detail": "Logged out"}
