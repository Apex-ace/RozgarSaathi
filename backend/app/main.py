from __future__ import annotations

from datetime import datetime, timezone
from math import radians, sin, cos, sqrt, atan2
from typing import Any, Optional

import httpx
from fastapi import (
    Depends,
    FastAPI,
    File,
    Form,
    HTTPException,
    Query,
    UploadFile,
    status,
)
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from app.auth import login_with_supabase, register_with_supabase
from app.config import settings
from app.dependencies import get_current_user
from app.face_utils import register_face_for_user, verify_face_for_user
from app.mailer import send_smtp_email
from app.storage import ensure_storage


# =========================
# App setup
# =========================

app = FastAPI(title=settings.APP_NAME)
ensure_storage()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://192.168.1.50:5173",  # replace with your LAN IP if needed
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# =========================
# Models
# =========================

class RegisterRequest(BaseModel):
    email: str
    password: str


class LoginRequest(BaseModel):
    email: str
    password: str


class AuthResponse(BaseModel):
    success: bool
    message: str
    access_token: Optional[str] = None
    refresh_token: Optional[str] = None
    token_type: Optional[str] = "bearer"
    user: Optional[dict] = None


class SendMailRequest(BaseModel):
    to_email: str
    subject: str
    message: str


class SendMailResponse(BaseModel):
    success: bool
    message: str
    sent_to: Optional[str] = None


class FaceVerifyResponse(BaseModel):
    success: bool
    message: str
    matched: bool
    distance: Optional[float] = None
    threshold: Optional[float] = None
    anti_spoofing_checked: bool = True
    user_email: Optional[str] = None


class ProfileUpsertRequest(BaseModel):
    role: str = Field(..., pattern="^(worker|user)$")
    full_name: Optional[str] = None
    skills: list[str] = []
    location: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    address_text: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None
    is_location_live: bool = False
    service_radius_km: int = 5
    availability_status: str = "available"
    experience_years: int = 0
    hourly_rate: float = 0.0


class WorkerLocationUpdate(BaseModel):
    lat: Optional[float] = None
    lng: Optional[float] = None
    address_text: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    is_location_live: bool = False
    service_radius_km: int = 5
    availability_status: str = "available"


class JobCreateRequest(BaseModel):
    title: str
    description: str
    skill: str
    location: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    address_text: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None
    urgency: str = "normal"


class MessageCreateRequest(BaseModel):
    message: str


class RatingCreateRequest(BaseModel):
    worker_id: str
    job_id: str
    rating: float = Field(..., ge=1, le=5)
    review: Optional[str] = None


# =========================
# Utility helpers
# =========================

SUPABASE_REST_HEADERS = {
    "apikey": settings.SUPABASE_SERVICE_ROLE_KEY,
    "Authorization": f"Bearer {settings.SUPABASE_SERVICE_ROLE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=representation",
}


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def norm_text(value: str | None) -> str:
    return (value or "").strip().lower()


def parse_skills(value: Any) -> list[str]:
    if not value:
        return []
    if isinstance(value, list):
        return [str(x).strip().lower() for x in value if str(x).strip()]
    return [str(value).strip().lower()]


def safe_float(value: Any) -> Optional[float]:
    try:
        if value is None or value == "":
            return None
        return float(value)
    except Exception:
        return None


def safe_int(value: Any, default: Optional[int] = None) -> Optional[int]:
    try:
        if value is None or value == "":
            return default
        return int(value)
    except Exception:
        return default


def haversine_km(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    r = 6371.0
    dlat = radians(lat2 - lat1)
    dlng = radians(lng2 - lng1)

    a = (
        sin(dlat / 2) ** 2
        + cos(radians(lat1)) * cos(radians(lat2)) * sin(dlng / 2) ** 2
    )
    c = 2 * atan2(sqrt(a), sqrt(1 - a))
    return r * c


def build_query_params(params: dict[str, Any]) -> list[tuple[str, str]]:
    output: list[tuple[str, str]] = []
    for key, value in params.items():
        if value is None:
            continue
        if isinstance(value, list):
            for item in value:
                output.append((key, str(item)))
        else:
            output.append((key, str(value)))
    return output


async def supabase_get(
    table: str,
    params: Optional[dict[str, Any]] = None,
) -> list[dict]:
    url = f"{settings.SUPABASE_URL}/rest/v1/{table}"
    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.get(
            url,
            headers=SUPABASE_REST_HEADERS,
            params=build_query_params(params or {}),
        )

    data = response.json() if response.content else []
    if response.status_code >= 400:
        raise HTTPException(
            status_code=response.status_code,
            detail=data.get("message") if isinstance(data, dict) else "Supabase GET failed",
        )
    return data


async def supabase_insert(table: str, payload: dict[str, Any]) -> dict:
    url = f"{settings.SUPABASE_URL}/rest/v1/{table}"
    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(url, headers=SUPABASE_REST_HEADERS, json=payload)

    data = response.json() if response.content else []
    if response.status_code >= 400:
        raise HTTPException(
            status_code=response.status_code,
            detail=data.get("message") if isinstance(data, dict) else "Supabase insert failed",
        )
    if isinstance(data, list) and data:
        return data[0]
    return data


async def supabase_patch(
    table: str,
    filters: dict[str, Any],
    payload: dict[str, Any],
) -> dict:
    url = f"{settings.SUPABASE_URL}/rest/v1/{table}"
    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.patch(
            url,
            headers=SUPABASE_REST_HEADERS,
            params=build_query_params(filters),
            json=payload,
        )

    data = response.json() if response.content else []
    if response.status_code >= 400:
        raise HTTPException(
            status_code=response.status_code,
            detail=data.get("message") if isinstance(data, dict) else "Supabase patch failed",
        )
    if isinstance(data, list) and data:
        return data[0]
    return data


async def get_profile(user_id: str) -> Optional[dict]:
    rows = await supabase_get("profiles", {"select": "*", "id": f"eq.{user_id}", "limit": 1})
    return rows[0] if rows else None


async def upsert_profile(user_id: str, payload: dict[str, Any]) -> dict:
    existing = await get_profile(user_id)
    payload = {**payload, "id": user_id}

    if existing:
        return await supabase_patch("profiles", {"id": f"eq.{user_id}"}, payload)
    return await supabase_insert("profiles", payload)


async def get_job(job_id: str) -> Optional[dict]:
    rows = await supabase_get("jobs", {"select": "*", "id": f"eq.{job_id}", "limit": 1})
    return rows[0] if rows else None


# =========================
# Base routes
# =========================

@app.get("/")
async def root():
    return {"success": True, "message": "Rozgar API is running"}


@app.get("/health")
async def health():
    return {"success": True, "message": "API is running"}


# =========================
# Auth routes
# =========================

@app.post("/register", response_model=AuthResponse)
async def register(payload: RegisterRequest):
    result = await register_with_supabase(payload.email, payload.password)
    return AuthResponse(
        success=True,
        message="User registered successfully",
        access_token=result.get("access_token"),
        refresh_token=result.get("refresh_token"),
        token_type=result.get("token_type", "bearer"),
        user=result.get("user"),
    )


@app.post("/login", response_model=AuthResponse)
async def login(payload: LoginRequest):
    result = await login_with_supabase(payload.email, payload.password)
    return AuthResponse(
        success=True,
        message="Login successful",
        access_token=result.get("access_token"),
        refresh_token=result.get("refresh_token"),
        token_type=result.get("token_type", "bearer"),
        user=result.get("user"),
    )


@app.get("/me")
async def me(current_user: dict = Depends(get_current_user)):
    profile = await get_profile(current_user["id"])
    return {
        "success": True,
        "user": current_user,
        "profile": profile,
    }


# =========================
# Face + email routes
# =========================

@app.post("/face/register-face")
async def register_face(
    photo: UploadFile = File(...),
    current_user: dict = Depends(get_current_user),
):
    image_bytes = await photo.read()
    result = register_face_for_user(
        user_id=current_user["id"],
        email=current_user.get("email", ""),
        image_bytes=image_bytes,
        filename=photo.filename,
    )
    return {
        "success": True,
        "message": "Face registered successfully",
        "data": result,
    }


@app.post("/face/verify-face", response_model=FaceVerifyResponse)
async def verify_face(
    photo: UploadFile = File(...),
    current_user: dict = Depends(get_current_user),
):
    image_bytes = await photo.read()
    result = verify_face_for_user(
        user_id=current_user["id"],
        image_bytes=image_bytes,
        filename=photo.filename,
    )

    return FaceVerifyResponse(
        success=True,
        message="Face verification completed",
        matched=result["matched"],
        distance=result["distance"],
        threshold=result["threshold"],
        anti_spoofing_checked=True,
        user_email=current_user.get("email"),
    )


@app.post("/send-mail", response_model=SendMailResponse)
async def send_mail(
    payload: SendMailRequest,
    current_user: dict = Depends(get_current_user),
):
    send_smtp_email(
        to_email=payload.to_email,
        subject=payload.subject,
        message=payload.message,
    )

    return SendMailResponse(
        success=True,
        message=f"Email sent successfully by {current_user.get('email', 'authenticated user')}",
        sent_to=payload.to_email,
    )


@app.post("/verify-face-and-send-mail")
async def verify_face_and_send_mail(
    to_email: str = Form(...),
    subject: str = Form(...),
    message: str = Form(...),
    photo: UploadFile = File(...),
    current_user: dict = Depends(get_current_user),
):
    image_bytes = await photo.read()
    result = verify_face_for_user(
        user_id=current_user["id"],
        image_bytes=image_bytes,
        filename=photo.filename,
    )

    if not result["matched"]:
        return {
            "success": False,
            "message": "Face verification failed. Email not sent.",
            "matched": False,
            "distance": result["distance"],
            "threshold": result["threshold"],
        }

    send_smtp_email(
        to_email=to_email,
        subject=subject,
        message=message,
    )

    return {
        "success": True,
        "message": "Face verified and email sent successfully",
        "matched": True,
        "distance": result["distance"],
        "threshold": result["threshold"],
        "sent_to": to_email,
    }


# =========================
# Profile routes
# =========================

@app.post("/profiles/upsert")
async def profiles_upsert(
    payload: ProfileUpsertRequest,
    current_user: dict = Depends(get_current_user),
):
    data = payload.model_dump()
    data["email"] = current_user.get("email")
    data["updated_at"] = now_iso()

    if not (await get_profile(current_user["id"])):
        data["created_at"] = now_iso()

    profile = await upsert_profile(current_user["id"], data)

    return {
        "success": True,
        "message": "Profile saved successfully",
        "profile": profile,
    }


@app.patch("/worker/profile")
async def update_worker_profile(
    payload: ProfileUpsertRequest,
    current_user: dict = Depends(get_current_user),
):
    profile = await get_profile(current_user["id"])
    if not profile or profile.get("role") != "worker":
        raise HTTPException(status_code=403, detail="Only workers can update worker profile")

    data = payload.model_dump()
    data["updated_at"] = now_iso()

    updated = await upsert_profile(current_user["id"], data)
    return {"success": True, "message": "Worker profile updated", "profile": updated}


@app.post("/worker/location")
async def update_worker_location(
    payload: WorkerLocationUpdate,
    current_user: dict = Depends(get_current_user),
):
    profile = await get_profile(current_user["id"])
    if not profile or profile.get("role") != "worker":
        raise HTTPException(status_code=403, detail="Only workers can update location")

    data = payload.model_dump()
    data["location_updated_at"] = now_iso()
    data["updated_at"] = now_iso()

    updated = await upsert_profile(current_user["id"], {**profile, **data})
    return {"success": True, "message": "Location updated", "profile": updated}


# =========================
# Worker search
# =========================

@app.get("/workers/search")
async def search_workers(
    skill: str | None = Query(default=None),
    lat: float | None = Query(default=None),
    lng: float | None = Query(default=None),
    radius_km: int = Query(default=10),
    city: str | None = Query(default=None),
    availability_status: str | None = Query(default=None),
    min_rating: float | None = Query(default=None),
    min_trust_score: float | None = Query(default=None),
    min_experience: int | None = Query(default=None),
    face_verified: bool | None = Query(default=None),
    max_hourly_rate: float | None = Query(default=None),
    sort_by: str = Query(default="nearest"),
    current_user: dict = Depends(get_current_user),
):
    rows = await supabase_get(
        "profiles",
        {
            "select": "*",
            "role": "eq.worker",
            "order": "created_at.desc",
        },
    )

    skill_q = norm_text(skill)
    city_q = norm_text(city)

    results = []
    for row in rows:
        worker_skills = parse_skills(row.get("skills"))
        worker_city = norm_text(row.get("city"))
        worker_status = norm_text(row.get("availability_status"))
        worker_lat = safe_float(row.get("lat"))
        worker_lng = safe_float(row.get("lng"))
        worker_rating = safe_float(row.get("rating")) or 0
        worker_trust = safe_float(row.get("trust_score")) or 0
        worker_exp = safe_int(row.get("experience_years"), 0) or 0
        worker_rate = safe_float(row.get("hourly_rate")) or 0
        worker_face_verified = bool(row.get("face_verified"))

        if skill_q and not any(skill_q in s or s in skill_q for s in worker_skills):
            continue
        if city_q and city_q not in worker_city:
            continue
        if availability_status and worker_status != norm_text(availability_status):
            continue
        if min_rating is not None and worker_rating < min_rating:
            continue
        if min_trust_score is not None and worker_trust < min_trust_score:
            continue
        if min_experience is not None and worker_exp < min_experience:
            continue
        if face_verified is not None and worker_face_verified != face_verified:
            continue
        if max_hourly_rate is not None and worker_rate > max_hourly_rate:
            continue

        distance_km = None
        if lat is not None and lng is not None and worker_lat is not None and worker_lng is not None:
            distance_km = haversine_km(lat, lng, worker_lat, worker_lng)
            if radius_km is not None and distance_km > radius_km:
                continue

        results.append({**row, "distance_km": round(distance_km, 2) if distance_km is not None else None})

    if sort_by == "nearest":
        results.sort(key=lambda x: x.get("distance_km") if x.get("distance_km") is not None else 999999)
    elif sort_by == "rating":
        results.sort(key=lambda x: safe_float(x.get("rating")) or 0, reverse=True)
    elif sort_by == "trust":
        results.sort(key=lambda x: safe_float(x.get("trust_score")) or 0, reverse=True)
    elif sort_by == "experience":
        results.sort(key=lambda x: safe_int(x.get("experience_years"), 0) or 0, reverse=True)
    elif sort_by == "price_low":
        results.sort(key=lambda x: safe_float(x.get("hourly_rate")) or 0)

    return {"success": True, "workers": results}


# =========================
# Job routes
# =========================

@app.post("/jobs")
async def create_job(
    payload: JobCreateRequest,
    current_user: dict = Depends(get_current_user),
):
    profile = await get_profile(current_user["id"])
    if not profile or profile.get("role") != "user":
        raise HTTPException(status_code=403, detail="Only users can post jobs")

    job = await supabase_insert(
        "jobs",
        {
            "user_id": current_user["id"],
            "title": payload.title,
            "description": payload.description,
            "skill": payload.skill,
            "location": payload.location or payload.city,
            "city": payload.city,
            "state": payload.state,
            "address_text": payload.address_text,
            "lat": payload.lat,
            "lng": payload.lng,
            "urgency": payload.urgency,
            "status": "open",
            "created_at": now_iso(),
            "updated_at": now_iso(),
        },
    )

    return {"success": True, "message": "Job posted successfully", "job": job}


@app.get("/jobs/my")
async def my_jobs(current_user: dict = Depends(get_current_user)):
    profile = await get_profile(current_user["id"])
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")

    if profile.get("role") == "user":
        rows = await supabase_get(
            "jobs",
            {
                "select": "*",
                "user_id": f"eq.{current_user['id']}",
                "order": "created_at.desc",
            },
        )
    else:
        rows = await supabase_get(
            "jobs",
            {
                "select": "*",
                "worker_id": f"eq.{current_user['id']}",
                "order": "created_at.desc",
            },
        )

    return {"success": True, "jobs": rows}


@app.get("/jobs/feed")
async def job_feed(current_user: dict = Depends(get_current_user)):
    profile = await get_profile(current_user["id"])
    if not profile or profile.get("role") != "worker":
        raise HTTPException(status_code=403, detail="Only workers can view job feed")

    worker_skills = parse_skills(profile.get("skills"))
    worker_city = norm_text(profile.get("city") or profile.get("location"))
    worker_lat = safe_float(profile.get("lat"))
    worker_lng = safe_float(profile.get("lng"))
    worker_radius = safe_int(profile.get("service_radius_km"), 5) or 5
    worker_status = norm_text(profile.get("availability_status"))

    assigned_jobs = await supabase_get(
        "jobs",
        {
            "select": "*",
            "worker_id": f"eq.{current_user['id']}",
            "order": "created_at.desc",
        },
    )

    open_jobs = await supabase_get(
        "jobs",
        {
            "select": "*",
            "status": "eq.open",
            "order": "created_at.desc",
        },
    )

    matched_open_jobs = []
    for job in open_jobs:
        job_skill = norm_text(job.get("skill"))
        job_city = norm_text(job.get("city") or job.get("location"))
        job_lat = safe_float(job.get("lat"))
        job_lng = safe_float(job.get("lng"))

        skill_match = not worker_skills or any(job_skill in s or s in job_skill for s in worker_skills)

        distance_km = None
        if worker_lat is not None and worker_lng is not None and job_lat is not None and job_lng is not None:
            distance_km = haversine_km(worker_lat, worker_lng, job_lat, job_lng)
            geo_match = distance_km <= worker_radius
        else:
            geo_match = not worker_city or worker_city in job_city or job_city in worker_city

        if skill_match and geo_match and worker_status == "available":
            matched_open_jobs.append(
                {
                    **job,
                    "distance_km": round(distance_km, 2) if distance_km is not None else None,
                }
            )

    active_assigned_jobs = [row for row in assigned_jobs if row.get("status") in ["assigned", "completed"]]

    return {
        "success": True,
        "matched_open_jobs": matched_open_jobs,
        "assigned_jobs": active_assigned_jobs,
    }


@app.post("/jobs/{job_id}/accept")
async def accept_job(
    job_id: str,
    current_user: dict = Depends(get_current_user),
):
    profile = await get_profile(current_user["id"])
    if not profile or profile.get("role") != "worker":
        raise HTTPException(status_code=403, detail="Only workers can accept jobs")

    job = await get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    if job.get("status") != "open":
        raise HTTPException(status_code=400, detail="Job is no longer open")

    updated = await supabase_patch(
        "jobs",
        {"id": f"eq.{job_id}"},
        {
            "worker_id": current_user["id"],
            "status": "assigned",
            "updated_at": now_iso(),
        },
    )

    return {"success": True, "message": "Job accepted successfully", "job": updated}


@app.get("/jobs/{job_id}")
async def job_detail(
    job_id: str,
    current_user: dict = Depends(get_current_user),
):
    job = await get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    if current_user["id"] not in [job.get("user_id"), job.get("worker_id")]:
        raise HTTPException(status_code=403, detail="Not allowed to access this job")

    messages = await supabase_get(
        "job_messages",
        {
            "select": "*",
            "job_id": f"eq.{job_id}",
            "order": "created_at.asc",
        },
    )

    return {"success": True, "job": job, "messages": messages}


@app.post("/jobs/{job_id}/messages")
async def post_message(
    job_id: str,
    payload: MessageCreateRequest,
    current_user: dict = Depends(get_current_user),
):
    job = await get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    if current_user["id"] not in [job.get("user_id"), job.get("worker_id")]:
        raise HTTPException(status_code=403, detail="Not allowed to message in this job")

    message = await supabase_insert(
        "job_messages",
        {
            "job_id": job_id,
            "sender_id": current_user["id"],
            "message": payload.message,
            "created_at": now_iso(),
        },
    )

    return {"success": True, "message": "Message sent", "data": message}


@app.post("/jobs/{job_id}/complete")
async def complete_job(
    job_id: str,
    current_user: dict = Depends(get_current_user),
):
    job = await get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    if current_user["id"] != job.get("user_id"):
        raise HTTPException(status_code=403, detail="Only the user can mark the job complete")

    updated = await supabase_patch(
        "jobs",
        {"id": f"eq.{job_id}"},
        {
            "status": "completed",
            "updated_at": now_iso(),
        },
    )

    return {"success": True, "message": "Job marked as completed", "job": updated}


@app.post("/ratings")
async def create_rating(
    payload: RatingCreateRequest,
    current_user: dict = Depends(get_current_user),
):
    job = await get_job(payload.job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    if current_user["id"] != job.get("user_id"):
        raise HTTPException(status_code=403, detail="Only the user can rate the worker")
    if job.get("worker_id") != payload.worker_id:
        raise HTTPException(status_code=400, detail="Worker does not match this job")
    if job.get("status") != "completed":
        raise HTTPException(status_code=400, detail="Only completed jobs can be rated")

    rating = await supabase_insert(
        "ratings",
        {
            "job_id": payload.job_id,
            "user_id": current_user["id"],
            "worker_id": payload.worker_id,
            "rating": payload.rating,
            "review": payload.review,
            "created_at": now_iso(),
        },
    )

    existing_ratings = await supabase_get(
        "ratings",
        {
            "select": "rating",
            "worker_id": f"eq.{payload.worker_id}",
        },
    )

    if existing_ratings:
        avg_rating = sum(float(r["rating"]) for r in existing_ratings) / len(existing_ratings)
    else:
        avg_rating = payload.rating

    worker_profile = await get_profile(payload.worker_id)
    current_trust = safe_float(worker_profile.get("trust_score") if worker_profile else 0) or 0
    new_trust = min(100.0, max(current_trust, avg_rating * 20))

    await supabase_patch(
        "profiles",
        {"id": f"eq.{payload.worker_id}"},
        {
            "rating": round(avg_rating, 2),
            "trust_score": round(new_trust, 2),
            "updated_at": now_iso(),
        },
    )

    return {"success": True, "message": "Rating submitted successfully", "rating": rating}