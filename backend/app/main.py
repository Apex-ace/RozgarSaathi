from __future__ import annotations

import socketio
from fastapi import Depends, FastAPI, File, Form, HTTPException, UploadFile, status
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.dependencies import get_current_user
from app.schemas import JobAssign, JobCreate, MailRequest, ProfileUpsert, RatingCreate
from app.services.face_utils import (
    can_open_image,
    save_upload_file_bytes,
    single_face_check,
    verify_against_registered,
)
from app.services.mailer import send_mail
from app.supabase_rest import insert_rows, patch_rows, select_rows, single_row, upsert_rows


sio = socketio.AsyncServer(async_mode="asgi", cors_allowed_origins=settings.cors_origins_list or ["*"])
fastapi_app = FastAPI(title=settings.APP_NAME)

fastapi_app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list or ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app = socketio.ASGIApp(sio, fastapi_app)


def _profile_to_response(row: dict | None) -> dict | None:
    if not row:
        return None
    return {
        "id": row["id"],
        "email": row.get("email"),
        "role": row.get("role"),
        "full_name": row.get("full_name"),
        "location": row.get("location"),
        "availability": row.get("availability"),
        "status": row.get("status"),
        "skills": row.get("skills") or [],
        "experience_years": row.get("experience_years") or 0,
        "bio": row.get("bio") or "",
        "face_registered": row.get("face_registered") or False,
        "face_verified": row.get("face_verified") or False,
        "rating_avg": row.get("rating_avg") or 0,
        "rating_count": row.get("rating_count") or 0,
        "trust_score": row.get("trust_score") or 50,
    }


async def get_profile(user_id: str) -> dict | None:
    return await single_row("profiles", {"select": "*", "id": f"eq.{user_id}"})


@fastapi_app.get("/health")
async def health():
    return {"status": "ok"}


@fastapi_app.get("/me")
async def me(current_user: dict = Depends(get_current_user)):
    profile = await get_profile(current_user["id"])
    return {"user": current_user, "profile": _profile_to_response(profile)}


@fastapi_app.post("/profiles/upsert")
async def profiles_upsert(payload: ProfileUpsert, current_user: dict = Depends(get_current_user)):
    row = {
        "id": current_user["id"],
        "email": current_user["email"],
        **payload.model_dump(),
    }
    saved = await upsert_rows("profiles", [row], on_conflict="id")
    return {"profile": _profile_to_response(saved[0])}


@fastapi_app.get("/workers")
async def list_workers(skill: str | None = None, location: str | None = None):
    params = {"select": "*", "role": "eq.worker", "order": "trust_score.desc"}
    rows = await select_rows("profiles", params)
    filtered = []
    for row in rows:
        skills = row.get("skills") or []
        if skill and skill.lower() not in [s.lower() for s in skills]:
            continue
        if location and row.get("location", "").lower() != location.lower():
            continue
        filtered.append(_profile_to_response(row))
    return {"workers": filtered}


@fastapi_app.get("/workers/{worker_id}")
async def get_worker(worker_id: str):
    row = await get_profile(worker_id)
    if not row or row.get("role") != "worker":
        raise HTTPException(status_code=404, detail="Worker not found")
    return {"worker": _profile_to_response(row)}


@fastapi_app.post("/jobs")
async def create_job(payload: JobCreate, current_user: dict = Depends(get_current_user)):
    profile = await get_profile(current_user["id"])
    if not profile or profile.get("role") != "user":
        raise HTTPException(status_code=403, detail="Only users can post jobs")

    saved = await insert_rows("jobs", [{
        "user_id": current_user["id"],
        **payload.model_dump(),
    }])
    return {"job": saved[0]}


@fastapi_app.get("/jobs/feed")
async def job_feed(current_user: dict = Depends(get_current_user)):
    profile = await get_profile(current_user["id"])
    if not profile or profile.get("role") != "worker":
        raise HTTPException(status_code=403, detail="Only workers can view job feed")

    skills = [s.lower() for s in (profile.get("skills") or [])]
    location = (profile.get("location") or "").lower()

    rows = await select_rows("jobs", {"select": "*", "status": "eq.open", "order": "created_at.desc"})
    jobs = []
    for row in rows:
        if skills and row.get("skill", "").lower() not in skills:
            continue
        if location and row.get("location", "").lower() != location:
            continue
        jobs.append(row)
    return {"jobs": jobs}


@fastapi_app.post("/jobs/{job_id}/accept")
async def accept_job(job_id: str, current_user: dict = Depends(get_current_user)):
    profile = await get_profile(current_user["id"])
    if not profile or profile.get("role") != "worker":
        raise HTTPException(status_code=403, detail="Only workers can accept jobs")
    if not profile.get("face_registered"):
        raise HTTPException(status_code=400, detail="Register face first")
    saved = await patch_rows(
        "jobs",
        {"id": job_id},
        {"worker_id": current_user["id"], "status": "assigned"},
    )
    return {"job": saved[0] if saved else None}


@fastapi_app.post("/jobs/{job_id}/hire")
async def hire_worker(job_id: str, payload: JobAssign, current_user: dict = Depends(get_current_user)):
    profile = await get_profile(current_user["id"])
    if not profile or profile.get("role") != "user":
        raise HTTPException(status_code=403, detail="Only users can hire workers")
    saved = await patch_rows(
        "jobs",
        {"id": job_id},
        {"worker_id": payload.worker_id, "status": "assigned"},
    )
    return {"job": saved[0] if saved else None}


@fastapi_app.get("/jobs/{job_id}")
async def get_job(job_id: str, current_user: dict = Depends(get_current_user)):
    row = await single_row("jobs", {"select": "*", "id": f"eq.{job_id}"})
    if not row:
        raise HTTPException(status_code=404, detail="Job not found")
    if current_user["id"] not in [row.get("user_id"), row.get("worker_id")]:
        raise HTTPException(status_code=403, detail="Forbidden")
    return {"job": row}


@fastapi_app.post("/jobs/{job_id}/complete")
async def complete_job(job_id: str, current_user: dict = Depends(get_current_user)):
    row = await single_row("jobs", {"select": "*", "id": f"eq.{job_id}"})
    if not row:
        raise HTTPException(status_code=404, detail="Job not found")
    if current_user["id"] != row.get("worker_id"):
        raise HTTPException(status_code=403, detail="Only assigned worker can complete")
    saved = await patch_rows("jobs", {"id": job_id}, {"status": "completed"})
    return {"job": saved[0] if saved else None}


async def recalc_worker_metrics(worker_id: str) -> dict:
    ratings = await select_rows("ratings", {"select": "rating", "worker_id": f"eq.{worker_id}"})
    total = sum(int(r["rating"]) for r in ratings)
    count = len(ratings)
    avg = round(total / count, 2) if count else 0.0

    profile = await get_profile(worker_id)
    completed = await select_rows("jobs", {"select": "id", "worker_id": f"eq.{worker_id}", "status": "eq.completed"})
    completed_count = len(completed)
    face_bonus = 15 if profile and profile.get("face_verified") else 0
    trust_score = min(100, round(avg * 10 + min(completed_count, 10) * 2 + face_bonus))
    saved = await patch_rows(
        "profiles",
        {"id": worker_id},
        {"rating_avg": avg, "rating_count": count, "trust_score": trust_score},
    )
    return saved[0] if saved else profile


@fastapi_app.post("/jobs/{job_id}/rate")
async def rate_job(job_id: str, payload: RatingCreate, current_user: dict = Depends(get_current_user)):
    job = await single_row("jobs", {"select": "*", "id": f"eq.{job_id}"})
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    if current_user["id"] != job.get("user_id"):
        raise HTTPException(status_code=403, detail="Only the hiring user can rate")
    if job.get("status") != "completed":
        raise HTTPException(status_code=400, detail="Complete the job before rating")
    saved = await upsert_rows(
        "ratings",
        [{
            "job_id": job_id,
            "user_id": current_user["id"],
            "worker_id": job["worker_id"],
            **payload.model_dump(),
        }],
        on_conflict="job_id",
    )
    profile = await recalc_worker_metrics(job["worker_id"])
    return {"rating": saved[0], "worker_profile": _profile_to_response(profile)}


@fastapi_app.post("/face/register-face")
async def register_face(photo: UploadFile = File(...), current_user: dict = Depends(get_current_user)):
    contents = await photo.read()
    path = save_upload_file_bytes(contents, photo.filename)
    if not can_open_image(path):
        raise HTTPException(status_code=400, detail="Invalid image")
    single_face_check(path)

    await upsert_rows(
        "face_profiles",
        [{"user_id": current_user["id"], "image_path": path}],
        on_conflict="user_id",
    )
    saved = await patch_rows(
        "profiles",
        {"id": current_user["id"]},
        {"face_registered": True, "face_verified": False},
    )
    return {"message": "Face registered successfully", "profile": _profile_to_response(saved[0])}


@fastapi_app.post("/face/verify-face")
async def verify_face(photo: UploadFile = File(...), current_user: dict = Depends(get_current_user)):
    face_row = await single_row("face_profiles", {"select": "*", "user_id": f"eq.{current_user['id']}"})
    if not face_row:
        raise HTTPException(status_code=404, detail="No registered face found for this user")

    contents = await photo.read()
    probe_path = save_upload_file_bytes(contents, photo.filename)
    single_face_check(probe_path)

    result = verify_against_registered(face_row["image_path"], probe_path)
    await patch_rows(
        "profiles",
        {"id": current_user["id"]},
        {"face_verified": bool(result["matched"])},
    )
    return result


@fastapi_app.post("/face/verify-face-and-send-mail")
async def verify_face_and_send_mail(
    to: str = Form(...),
    subject: str = Form("Face verification successful"),
    body: str = Form("Your identity has been verified successfully."),
    photo: UploadFile = File(...),
    current_user: dict = Depends(get_current_user),
):
    result = await verify_face(photo, current_user)
    if result["matched"]:
        send_mail(to, subject, body)
        return {"verified": True, "mail_sent": True, "result": result}
    return {"verified": False, "mail_sent": False, "result": result}


@fastapi_app.post("/send-mail")
async def send_mail_route(payload: MailRequest, current_user: dict = Depends(get_current_user)):
    send_mail(payload.to, payload.subject, payload.body)
    return {"message": "Mail sent"}


@fastapi_app.get("/jobs/{job_id}/messages")
async def get_job_messages(job_id: str, current_user: dict = Depends(get_current_user)):
    job = await single_row("jobs", {"select": "*", "id": f"eq.{job_id}"})
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    if current_user["id"] not in [job.get("user_id"), job.get("worker_id")]:
        raise HTTPException(status_code=403, detail="Forbidden")
    rows = await select_rows("job_messages", {"select": "*", "job_id": f"eq.{job_id}", "order": "created_at.asc"})
    return {"messages": rows, "room_id": job["chat_room_id"]}


@sio.event
async def connect(sid, environ, auth):
    print("socket connected", sid)


@sio.event
async def disconnect(sid):
    print("socket disconnected", sid)


@sio.event
async def join_room(sid, data):
    room = data["room"]
    await sio.enter_room(sid, room)


@sio.event
async def send_message(sid, data):
    room = data["room"]
    await insert_rows("job_messages", [{
        "job_id": data["job_id"],
        "room_id": room,
        "sender_id": data["sender_id"],
        "message": data["message"],
    }])
    await sio.emit("new_message", data, room=room)
