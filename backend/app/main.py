from __future__ import annotations

from collections import defaultdict
from datetime import datetime, timezone
from math import radians, sin, cos, sqrt, atan2
from typing import Any, Optional

import httpx
from fastapi import Depends, FastAPI, File, Form, HTTPException, Query, UploadFile, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from app.auth import get_user_from_token, login_with_supabase, register_with_supabase
from app.config import settings
from app.dependencies import get_current_user
from app.face_utils import register_face_for_user, verify_face_for_user
from app.mailer import send_smtp_email
from app.storage import ensure_storage


CITY_OPTIONS = ["Nagpur", "Pune", "Mumbai", "Bengaluru", "Hyderabad"]
SKILL_OPTIONS = ["Electrician", "Plumber", "Carpenter", "Painter", "Welder", "Mason", "AC Technician"]
URGENCY_OPTIONS = ["low", "normal", "high", "urgent"]
STATUS_OPTIONS = ["available", "busy", "offline"]


app = FastAPI(title=settings.APP_NAME)
ensure_storage()
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_origin_regex=r"https?://(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+)(:\d+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


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


class AssignWorkerRequest(BaseModel):
    worker_id: str


class MessageCreateRequest(BaseModel):
    message: str


class RatingCreateRequest(BaseModel):
    worker_id: str
    job_id: str
    rating: float = Field(..., ge=1, le=5)
    review: Optional[str] = None


class SendMailRequest(BaseModel):
    to_email: str
    subject: str
    message: str


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
    a = sin(dlat / 2) ** 2 + cos(radians(lat1)) * cos(radians(lat2)) * sin(dlng / 2) ** 2
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


SUPABASE_REST_HEADERS = {
    "apikey": settings.SUPABASE_SERVICE_ROLE_KEY,
    "Authorization": f"Bearer {settings.SUPABASE_SERVICE_ROLE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=representation",
}


async def supabase_get(table: str, params: Optional[dict[str, Any]] = None) -> list[dict]:
    url = f"{settings.SUPABASE_URL}/rest/v1/{table}"
    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.get(url, headers=SUPABASE_REST_HEADERS, params=build_query_params(params or {}))
    data = response.json() if response.content else []
    if response.status_code >= 400:
        raise HTTPException(status_code=response.status_code, detail=data.get("message") if isinstance(data, dict) else "Supabase GET failed")
    return data


async def supabase_insert(table: str, payload: dict[str, Any]) -> dict:
    url = f"{settings.SUPABASE_URL}/rest/v1/{table}"
    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(url, headers=SUPABASE_REST_HEADERS, json=payload)
    data = response.json() if response.content else []
    if response.status_code >= 400:
        raise HTTPException(status_code=response.status_code, detail=data.get("message") if isinstance(data, dict) else "Supabase insert failed")
    return data[0] if isinstance(data, list) and data else data


async def supabase_patch(table: str, filters: dict[str, Any], payload: dict[str, Any]) -> dict:
    url = f"{settings.SUPABASE_URL}/rest/v1/{table}"
    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.patch(url, headers=SUPABASE_REST_HEADERS, params=build_query_params(filters), json=payload)
    data = response.json() if response.content else []
    if response.status_code >= 400:
        raise HTTPException(status_code=response.status_code, detail=data.get("message") if isinstance(data, dict) else "Supabase patch failed")
    return data[0] if isinstance(data, list) and data else data


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


async def get_job_messages(job_id: str) -> list[dict]:
    return await supabase_get("job_messages", {"select": "*", "job_id": f"eq.{job_id}", "order": "created_at.asc"})


async def ensure_job_access(job_id: str, current_user: dict) -> dict:
    job = await get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    if current_user["id"] not in [job.get("user_id"), job.get("worker_id")]:
        raise HTTPException(status_code=403, detail="Not allowed to access this job")
    return job


async def enrich_message_rows(rows: list[dict]) -> list[dict]:
    enriched = []
    cache: dict[str, dict] = {}
    for row in rows:
        sender_id = row.get("sender_id")
        if sender_id and sender_id not in cache:
            cache[sender_id] = await get_profile(sender_id) or {}
        sender = cache.get(sender_id, {})
        enriched.append({
            **row,
            "sender_name": sender.get("full_name") or sender.get("email") or "User",
        })
    return enriched


class ConnectionManager:
    def __init__(self):
        self.rooms: dict[str, set[WebSocket]] = defaultdict(set)

    async def connect(self, room: str, websocket: WebSocket):
        await websocket.accept()
        self.rooms[room].add(websocket)

    def disconnect(self, room: str, websocket: WebSocket):
        if room in self.rooms:
            self.rooms[room].discard(websocket)
            if not self.rooms[room]:
                del self.rooms[room]

    async def broadcast(self, room: str, payload: dict):
        for ws in list(self.rooms.get(room, set())):
            try:
                await ws.send_json(payload)
            except Exception:
                self.disconnect(room, ws)


manager = ConnectionManager()


@app.get("/")
async def root():
    return {"success": True, "message": "Rozgar API is running"}


@app.get("/health")
async def health():
    return {"success": True, "message": "API is running"}


@app.get("/meta/options")
async def meta_options():
    return {
        "success": True,
        "cities": CITY_OPTIONS,
        "skills": SKILL_OPTIONS,
        "urgencies": URGENCY_OPTIONS,
        "availability_statuses": STATUS_OPTIONS,
    }


@app.post("/register", response_model=AuthResponse)
async def register(payload: RegisterRequest):
    result = await register_with_supabase(payload.email, payload.password)
    return AuthResponse(success=True, message="User registered successfully", access_token=result.get("access_token"), refresh_token=result.get("refresh_token"), token_type=result.get("token_type", "bearer"), user=result.get("user"))


@app.post("/login", response_model=AuthResponse)
async def login(payload: LoginRequest):
    result = await login_with_supabase(payload.email, payload.password)
    return AuthResponse(success=True, message="Login successful", access_token=result.get("access_token"), refresh_token=result.get("refresh_token"), token_type=result.get("token_type", "bearer"), user=result.get("user"))


@app.get("/me")
async def me(current_user: dict = Depends(get_current_user)):
    profile = await get_profile(current_user["id"])
    return {"success": True, "user": current_user, "profile": profile}


@app.post("/face/register-face")
async def register_face(photo: UploadFile = File(...), current_user: dict = Depends(get_current_user)):
    image_bytes = await photo.read()
    result = register_face_for_user(user_id=current_user["id"], email=current_user.get("email", ""), image_bytes=image_bytes, filename=photo.filename)
    profile = await get_profile(current_user["id"]) or {"role": "worker", "email": current_user.get("email")}
    await upsert_profile(current_user["id"], {**profile, "face_registered": True, "face_verified": True, "updated_at": now_iso(), "created_at": profile.get("created_at") or now_iso()})
    return {"success": True, "message": "Face registered successfully", "data": result}


@app.post("/face/verify-face")
async def verify_face(photo: UploadFile = File(...), current_user: dict = Depends(get_current_user)):
    image_bytes = await photo.read()
    result = verify_face_for_user(user_id=current_user["id"], image_bytes=image_bytes, filename=photo.filename)
    if result["matched"]:
        profile = await get_profile(current_user["id"]) or {}
        await upsert_profile(current_user["id"], {**profile, "face_verified": True, "updated_at": now_iso(), "created_at": profile.get("created_at") or now_iso()})
    return {"success": True, "message": "Face verification completed", **result}


@app.post("/send-mail")
async def send_mail(payload: SendMailRequest, current_user: dict = Depends(get_current_user)):
    send_smtp_email(payload.to_email, payload.subject, payload.message)
    return {"success": True, "message": f"Email sent successfully by {current_user.get('email', 'authenticated user')}", "sent_to": payload.to_email}


@app.post("/profiles/upsert")
async def profiles_upsert(payload: ProfileUpsertRequest, current_user: dict = Depends(get_current_user)):
    data = payload.model_dump()
    data["email"] = current_user.get("email")
    data["updated_at"] = now_iso()
    if not (await get_profile(current_user["id"])):
        data["created_at"] = now_iso()
    profile = await upsert_profile(current_user["id"], data)
    return {"success": True, "message": "Profile saved successfully", "profile": profile}


@app.patch("/worker/profile")
async def update_worker_profile(payload: ProfileUpsertRequest, current_user: dict = Depends(get_current_user)):
    profile = await get_profile(current_user["id"])
    if not profile or profile.get("role") != "worker":
        raise HTTPException(status_code=403, detail="Only workers can update worker profile")
    updated = await upsert_profile(current_user["id"], {**profile, **payload.model_dump(), "updated_at": now_iso()})
    return {"success": True, "message": "Worker profile updated", "profile": updated}


@app.patch("/user/profile")
async def update_user_profile(payload: ProfileUpsertRequest, current_user: dict = Depends(get_current_user)):
    profile = await get_profile(current_user["id"])
    if not profile or profile.get("role") != "user":
        raise HTTPException(status_code=403, detail="Only users can update user profile")
    updated = await upsert_profile(current_user["id"], {**profile, **payload.model_dump(), "updated_at": now_iso()})
    return {"success": True, "message": "User profile updated", "profile": updated}


@app.post("/worker/location")
async def update_worker_location(payload: WorkerLocationUpdate, current_user: dict = Depends(get_current_user)):
    profile = await get_profile(current_user["id"])
    if not profile or profile.get("role") != "worker":
        raise HTTPException(status_code=403, detail="Only workers can update location")
    updated = await upsert_profile(current_user["id"], {**profile, **payload.model_dump(), "location_updated_at": now_iso(), "updated_at": now_iso()})
    return {"success": True, "message": "Location updated", "profile": updated}


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
    rows = await supabase_get("profiles", {"select": "*", "role": "eq.worker", "order": "created_at.desc"})
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
            if distance_km > radius_km:
                continue

        results.append({
            **row,
            "skills": row.get("skills") or [],
            "distance_km": round(distance_km, 2) if distance_km is not None else None,
        })

    if sort_by == "rating":
        results.sort(key=lambda x: safe_float(x.get("rating")) or 0, reverse=True)
    elif sort_by == "trust":
        results.sort(key=lambda x: safe_float(x.get("trust_score")) or 0, reverse=True)
    elif sort_by == "experience":
        results.sort(key=lambda x: safe_int(x.get("experience_years"), 0) or 0, reverse=True)
    elif sort_by == "price_low":
        results.sort(key=lambda x: safe_float(x.get("hourly_rate")) or 0)
    else:
        results.sort(key=lambda x: (x.get("distance_km") is None, x.get("distance_km") or 999999))

    return {"success": True, "workers": results}


@app.get("/workers/{worker_id}")
async def worker_detail(worker_id: str, current_user: dict = Depends(get_current_user)):
    profile = await get_profile(worker_id)
    if not profile or profile.get("role") != "worker":
        raise HTTPException(status_code=404, detail="Worker not found")
    ratings = await supabase_get("ratings", {"select": "rating,review,created_at", "worker_id": f"eq.{worker_id}", "order": "created_at.desc", "limit": 5})
    return {"success": True, "worker": profile, "recent_reviews": ratings}


@app.post("/jobs")
async def create_job(payload: JobCreateRequest, current_user: dict = Depends(get_current_user)):
    profile = await get_profile(current_user["id"])
    if not profile or profile.get("role") != "user":
        raise HTTPException(status_code=403, detail="Only users can post jobs")
    job = await supabase_insert("jobs", {
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
    })
    return {"success": True, "message": "Job posted successfully", "job": job}


@app.get("/jobs/my")
async def my_jobs(current_user: dict = Depends(get_current_user)):
    profile = await get_profile(current_user["id"])
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    if profile.get("role") == "user":
        rows = await supabase_get("jobs", {"select": "*", "user_id": f"eq.{current_user['id']}", "order": "created_at.desc"})
    else:
        rows = await supabase_get("jobs", {"select": "*", "worker_id": f"eq.{current_user['id']}", "order": "created_at.desc"})
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

    assigned_jobs = await supabase_get("jobs", {"select": "*", "worker_id": f"eq.{current_user['id']}", "order": "created_at.desc"})
    open_jobs = await supabase_get("jobs", {"select": "*", "status": "eq.open", "order": "created_at.desc"})

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
            matched_open_jobs.append({**job, "distance_km": round(distance_km, 2) if distance_km is not None else None})

    active_assigned_jobs = [row for row in assigned_jobs if row.get("status") in ["assigned", "in_progress", "completed", "rated"]]
    return {"success": True, "matched_open_jobs": matched_open_jobs, "assigned_jobs": active_assigned_jobs}


@app.post("/jobs/{job_id}/assign-worker")
async def assign_worker(job_id: str, payload: AssignWorkerRequest, current_user: dict = Depends(get_current_user)):
    job = await get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    if current_user["id"] != job.get("user_id"):
        raise HTTPException(status_code=403, detail="Only job owner can assign worker")
    if job.get("status") != "open":
        raise HTTPException(status_code=400, detail="Only open jobs can be assigned")
    worker = await get_profile(payload.worker_id)
    if not worker or worker.get("role") != "worker":
        raise HTTPException(status_code=404, detail="Worker not found")
    updated = await supabase_patch("jobs", {"id": f"eq.{job_id}"}, {"worker_id": payload.worker_id, "status": "assigned", "updated_at": now_iso()})
    return {"success": True, "message": "Worker assigned successfully", "job": updated}


@app.post("/jobs/{job_id}/accept")
async def accept_job(job_id: str, current_user: dict = Depends(get_current_user)):
    profile = await get_profile(current_user["id"])
    if not profile or profile.get("role") != "worker":
        raise HTTPException(status_code=403, detail="Only workers can accept jobs")
    job = await get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    if job.get("status") != "open":
        raise HTTPException(status_code=400, detail="Job is no longer open")
    updated = await supabase_patch("jobs", {"id": f"eq.{job_id}"}, {"worker_id": current_user["id"], "status": "assigned", "updated_at": now_iso()})
    return {"success": True, "message": "Job accepted successfully", "job": updated}


@app.post("/jobs/{job_id}/start")
async def start_job(job_id: str, current_user: dict = Depends(get_current_user)):
    job = await ensure_job_access(job_id, current_user)
    if job.get("status") not in ["assigned", "in_progress"]:
        raise HTTPException(status_code=400, detail="Only assigned jobs can be started")
    updated = await supabase_patch("jobs", {"id": f"eq.{job_id}"}, {"status": "in_progress", "updated_at": now_iso()})
    return {"success": True, "message": "Job started", "job": updated}


@app.get("/jobs/{job_id}")
async def job_detail(job_id: str, current_user: dict = Depends(get_current_user)):
    job = await ensure_job_access(job_id, current_user)
    messages = await enrich_message_rows(await get_job_messages(job_id))
    user_profile = await get_profile(job.get("user_id")) if job.get("user_id") else None
    worker_profile = await get_profile(job.get("worker_id")) if job.get("worker_id") else None
    return {"success": True, "job": job, "messages": messages, "user_profile": user_profile, "worker_profile": worker_profile}


@app.post("/jobs/{job_id}/messages")
async def post_message(job_id: str, payload: MessageCreateRequest, current_user: dict = Depends(get_current_user)):
    await ensure_job_access(job_id, current_user)
    sender_profile = await get_profile(current_user["id"]) or {}
    message = await supabase_insert("job_messages", {
        "job_id": job_id,
        "room_id": f"job:{job_id}",
        "sender_id": current_user["id"],
        "message": payload.message,
        "created_at": now_iso(),
    })
    payload_to_send = {**message, "sender_name": sender_profile.get("full_name") or sender_profile.get("email") or current_user.get("email")}
    await manager.broadcast(job_id, {"type": "message", "data": payload_to_send})
    return {"success": True, "message": "Message sent", "data": payload_to_send}


@app.websocket("/ws/jobs/{job_id}")
async def websocket_job_chat(websocket: WebSocket, job_id: str, token: str):
    try:
        current_user = await get_user_from_token(token)
        await ensure_job_access(job_id, current_user)
    except Exception:
        await websocket.close(code=1008)
        return

    await manager.connect(job_id, websocket)
    try:
        await websocket.send_json({"type": "connected", "job_id": job_id})
        while True:
            payload = await websocket.receive_json()
            text = (payload.get("message") or "").strip()
            if not text:
                continue
            sender_profile = await get_profile(current_user["id"]) or {}
            message = await supabase_insert("job_messages", {
                "job_id": job_id,
                "room_id": f"job:{job_id}",
                "sender_id": current_user["id"],
                "message": text,
                "created_at": now_iso(),
            })
            await manager.broadcast(job_id, {"type": "message", "data": {**message, "sender_name": sender_profile.get("full_name") or sender_profile.get("email") or current_user.get("email")}})
    except WebSocketDisconnect:
        manager.disconnect(job_id, websocket)
    except Exception:
        manager.disconnect(job_id, websocket)
        await websocket.close(code=1011)


@app.post("/jobs/{job_id}/complete")
async def complete_job(job_id: str, current_user: dict = Depends(get_current_user)):
    job = await get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    if current_user["id"] != job.get("user_id"):
        raise HTTPException(status_code=403, detail="Only the user can mark the job complete")
    if not job.get("worker_id"):
        raise HTTPException(status_code=400, detail="Job must be assigned before completion")
    updated = await supabase_patch("jobs", {"id": f"eq.{job_id}"}, {"status": "completed", "updated_at": now_iso()})
    return {"success": True, "message": "Job marked as completed", "job": updated}


@app.post("/ratings")
async def create_rating(payload: RatingCreateRequest, current_user: dict = Depends(get_current_user)):
    job = await get_job(payload.job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    if current_user["id"] != job.get("user_id"):
        raise HTTPException(status_code=403, detail="Only the user can rate the worker")
    if job.get("worker_id") != payload.worker_id:
        raise HTTPException(status_code=400, detail="Worker does not match this job")
    if job.get("status") not in ["completed", "rated"]:
        raise HTTPException(status_code=400, detail="Only completed jobs can be rated")

    existing = await supabase_get("ratings", {"select": "*", "job_id": f"eq.{payload.job_id}", "user_id": f"eq.{current_user['id']}", "limit": 1})
    if existing:
        raise HTTPException(status_code=400, detail="This job has already been rated")

    rating = await supabase_insert("ratings", {
        "job_id": payload.job_id,
        "user_id": current_user["id"],
        "worker_id": payload.worker_id,
        "rating": payload.rating,
        "review": payload.review,
        "created_at": now_iso(),
    })

    existing_ratings = await supabase_get("ratings", {"select": "rating", "worker_id": f"eq.{payload.worker_id}"})
    avg_rating = sum(float(r["rating"]) for r in existing_ratings) / len(existing_ratings) if existing_ratings else payload.rating
    worker_profile = await get_profile(payload.worker_id)
    current_trust = safe_float(worker_profile.get("trust_score") if worker_profile else 0) or 0
    new_trust = min(100.0, max(current_trust, avg_rating * 20))

    await supabase_patch("profiles", {"id": f"eq.{payload.worker_id}"}, {"rating": round(avg_rating, 2), "trust_score": round(new_trust, 2), "updated_at": now_iso()})
    await supabase_patch("jobs", {"id": f"eq.{payload.job_id}"}, {"status": "rated", "updated_at": now_iso()})

    return {"success": True, "message": "Rating submitted successfully", "rating": rating}
