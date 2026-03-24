from fastapi import Header, HTTPException, status
from app.auth import get_user_from_token


async def get_current_user(authorization: str = Header(None)) -> dict:
    if not authorization:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authorization header missing",
        )

    if not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authorization format",
        )

    token = authorization.split(" ", 1)[1].strip()
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token missing",
        )

    return await get_user_from_token(token)