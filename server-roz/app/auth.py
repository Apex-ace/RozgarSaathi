import httpx
from fastapi import HTTPException, status
from app.config import settings


SUPABASE_HEADERS = {
    "apikey": settings.SUPABASE_ANON_KEY,
    "Content-Type": "application/json",
}


async def register_with_supabase(email: str, password: str) -> dict:
    url = f"{settings.SUPABASE_URL}/auth/v1/signup"
    payload = {"email": email, "password": password}

    async with httpx.AsyncClient(timeout=20.0) as client:
        response = await client.post(url, headers=SUPABASE_HEADERS, json=payload)

    data = {}
    try:
        data = response.json()
    except Exception:
        pass

    if response.status_code not in (200, 201):
        detail = (
            data.get("msg")
            or data.get("error_description")
            or data.get("error")
            or "Registration failed"
        )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=detail,
        )

    return data


async def login_with_supabase(email: str, password: str) -> dict:
    url = f"{settings.SUPABASE_URL}/auth/v1/token?grant_type=password"
    payload = {"email": email, "password": password}

    async with httpx.AsyncClient(timeout=20.0) as client:
        response = await client.post(url, headers=SUPABASE_HEADERS, json=payload)

    data = {}
    try:
        data = response.json()
    except Exception:
        pass

    if response.status_code != 200:
        detail = (
            data.get("msg")
            or data.get("error_description")
            or data.get("error")
            or "Invalid email or password"
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=detail,
        )

    return data


async def get_user_from_token(token: str) -> dict:
    url = f"{settings.SUPABASE_URL}/auth/v1/user"
    headers = {
        "apikey": settings.SUPABASE_ANON_KEY,
        "Authorization": f"Bearer {token}",
    }

    async with httpx.AsyncClient(timeout=20.0) as client:
        response = await client.get(url, headers=headers)

    data = {}
    try:
        data = response.json()
    except Exception:
        pass

    if response.status_code != 200:
        detail = (
            data.get("msg")
            or data.get("error_description")
            or data.get("error")
            or "Invalid or expired token"
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=detail,
        )

    return data