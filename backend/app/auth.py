import httpx
from fastapi import HTTPException, status
from app.config import settings


SUPABASE_HEADERS = {
    "apikey": settings.SUPABASE_PUBLISHABLE_KEY,
    "Content-Type": "application/json",
}


async def register_with_supabase(email: str, password: str) -> dict:
    url = f"{settings.SUPABASE_URL}/auth/v1/signup"
    async with httpx.AsyncClient(timeout=20.0) as client:
        response = await client.post(url, headers=SUPABASE_HEADERS, json={"email": email, "password": password})

    data = response.json() if response.content else {}
    if response.status_code not in (200, 201):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=data.get("error_description") or data.get("error") or "Registration failed")
    return data


async def login_with_supabase(email: str, password: str) -> dict:
    url = f"{settings.SUPABASE_URL}/auth/v1/token?grant_type=password"
    async with httpx.AsyncClient(timeout=20.0) as client:
        response = await client.post(url, headers=SUPABASE_HEADERS, json={"email": email, "password": password})

    data = response.json() if response.content else {}
    if response.status_code != 200:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=data.get("error_description") or data.get("error") or "Invalid email or password")
    return data


async def get_user_from_token(token: str) -> dict:
    url = f"{settings.SUPABASE_URL}/auth/v1/user"
    headers = {
        "apikey": settings.SUPABASE_PUBLISHABLE_KEY,
        "Authorization": f"Bearer {token}",
    }
    async with httpx.AsyncClient(timeout=20.0) as client:
        response = await client.get(url, headers=headers)

    data = response.json() if response.content else {}
    if response.status_code != 200:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=data.get("error_description") or data.get("error") or "Invalid or expired token")
    return data
