from __future__ import annotations

import httpx
from fastapi import HTTPException, status

from app.config import settings


def admin_headers(extra: dict | None = None) -> dict:
    headers = {
        "apikey": settings.SUPABASE_SERVICE_ROLE_KEY,
        "Authorization": f"Bearer {settings.SUPABASE_SERVICE_ROLE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=representation",
    }
    if extra:
        headers.update(extra)
    return headers


async def select_rows(table: str, params: dict | None = None) -> list[dict]:
    url = f"{settings.SUPABASE_URL}/rest/v1/{table}"
    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.get(url, headers=admin_headers(), params=params or {})
    if resp.status_code >= 400:
        raise HTTPException(status_code=500, detail=resp.text)
    return resp.json()


async def upsert_rows(table: str, rows: list[dict], on_conflict: str | None = None) -> list[dict]:
    url = f"{settings.SUPABASE_URL}/rest/v1/{table}"
    params = {"on_conflict": on_conflict} if on_conflict else None
    headers = admin_headers({"Prefer": "resolution=merge-duplicates,return=representation"})
    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.post(url, headers=headers, params=params, json=rows)
    if resp.status_code >= 400:
        raise HTTPException(status_code=500, detail=resp.text)
    return resp.json()


async def insert_rows(table: str, rows: list[dict]) -> list[dict]:
    url = f"{settings.SUPABASE_URL}/rest/v1/{table}"
    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.post(url, headers=admin_headers(), json=rows)
    if resp.status_code >= 400:
        raise HTTPException(status_code=500, detail=resp.text)
    return resp.json()


async def patch_rows(table: str, filters: dict, payload: dict) -> list[dict]:
    url = f"{settings.SUPABASE_URL}/rest/v1/{table}"
    params = {f"{key}": f"eq.{value}" for key, value in filters.items()}
    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.patch(url, headers=admin_headers(), params=params, json=payload)
    if resp.status_code >= 400:
        raise HTTPException(status_code=500, detail=resp.text)
    return resp.json()


async def single_row(table: str, params: dict) -> dict | None:
    rows = await select_rows(table, params)
    return rows[0] if rows else None
