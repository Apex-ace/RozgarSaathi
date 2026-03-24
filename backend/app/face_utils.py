import os
import uuid
import cv2
from fastapi import HTTPException, status
from deepface import DeepFace

from app.config import settings
from app.storage import load_face_db, save_face_db


def ensure_upload_dir() -> None:
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)


def save_upload_file_bytes(data: bytes, original_name: str | None = None) -> str:
    ensure_upload_dir()

    ext = ".jpg"
    if original_name and "." in original_name:
        ext = "." + original_name.split(".")[-1].lower()

    filename = f"{uuid.uuid4().hex}{ext}"
    file_path = os.path.join(settings.UPLOAD_DIR, filename)

    with open(file_path, "wb") as f:
        f.write(data)

    return file_path


def single_face_check(image_path: str) -> dict:
    try:
        faces = DeepFace.extract_faces(
            img_path=image_path,
            detector_backend=settings.DEEPFACE_DETECTOR_BACKEND,
            enforce_detection=True,
            align=True,
            anti_spoofing=False,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"No face detected: {str(exc)}",
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Face detection failed: {str(exc)}",
        )

    if not faces or len(faces) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No face detected in image",
        )

    if len(faces) > 1:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Multiple faces detected. Use an image with one face only",
        )

    return {
        "faces": 1,
        "detector_backend": settings.DEEPFACE_DETECTOR_BACKEND,
    }


def register_face_for_user(
    user_id: str,
    email: str,
    image_bytes: bytes,
    filename: str | None = None,
) -> dict:
    saved_path = save_upload_file_bytes(image_bytes, filename)
    face_info = single_face_check(saved_path)

    db = load_face_db()
    db[user_id] = {
        "email": email,
        "image_path": saved_path,
        "face_info": face_info,
    }
    save_face_db(db)

    return {
        "user_id": user_id,
        "email": email,
        "image_path": saved_path,
        "face_info": face_info,
    }


def verify_face_for_user(
    user_id: str,
    image_bytes: bytes,
    filename: str | None = None,
) -> dict:
    db = load_face_db()

    if user_id not in db:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No registered face found for this user",
        )

    live_path = save_upload_file_bytes(image_bytes, filename or "live.jpg")
    single_face_check(live_path)

    registered_path = db[user_id]["image_path"]

    try:
        result = DeepFace.verify(
            img1_path=registered_path,
            img2_path=live_path,
            model_name=settings.DEEPFACE_MODEL,
            detector_backend=settings.DEEPFACE_DETECTOR_BACKEND,
            distance_metric=settings.DEEPFACE_DISTANCE_METRIC,
            threshold=settings.DEEPFACE_THRESHOLD,
            enforce_detection=True,
            align=True,
            anti_spoofing=False,
            silent=True,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Face verification failed: {str(exc)}",
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Verification error: {str(exc)}",
        )

    return {
        "matched": bool(result.get("verified", False)),
        "distance": float(result.get("distance")) if result.get("distance") is not None else None,
        "threshold": float(result.get("threshold")) if result.get("threshold") is not None else settings.DEEPFACE_THRESHOLD,
        "model": result.get("model"),
        "distance_metric": result.get("distance_metric"),
    }