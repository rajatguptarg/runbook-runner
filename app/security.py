from fastapi import Header, HTTPException, status, Depends
from .models import User


async def get_current_user(
    x_api_key: str | None = Header(None, alias="X-API-KEY"),
) -> User:
    """Validate API key from database and return associated user."""
    if x_api_key is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing API key"
        )

    # Retrieve user with given API key
    user = await User.find_one({"api_key": x_api_key})
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid API key"
        )
    return user


async def get_current_role(user: User = Depends(get_current_user)) -> str:
    """Validate API key from database and return associated role."""
    return user.role


def require_roles(*allowed_roles: str):
    """Dependency enforcing that the current role is in allowed_roles."""

    async def dependency(role: str = Depends(get_current_role)) -> None:
        if role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Forbidden",
            )

    return Depends(dependency)
