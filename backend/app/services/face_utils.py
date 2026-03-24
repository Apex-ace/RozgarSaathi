import os
import uuid
import cv2
from fastapi import HTTPException, status
from deepface import DeepFace

from app.config import settings


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

    if not faces:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No face detected in image",
        )

    if len(faces) > 1:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Multiple faces detected. Use one face only",
        )

    return {"faces": 1, "detector": settings.DEEPFACE_DETECTOR_BACKEND}


def verify_against_registered(registered_path: str, probe_path: str) -> dict:
    try:
        result = DeepFace.verify(
            img1_path=registered_path,
            img2_path=probe_path,
            model_name=settings.DEEPFACE_MODEL,
            detector_backend=settings.DEEPFACE_DETECTOR_BACKEND,
            distance_metric=settings.DEEPFACE_DISTANCE_METRIC,
            threshold=settings.DEEPFACE_THRESHOLD,
            enforce_detection=True,
            align=True,
            anti_spoofing=False,
            silent=True,
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Verification error: {str(exc)}",
        )

    return {
        "matched": bool(result.get("verified", False)),
        "distance": result.get("distance"),
        "threshold": result.get("threshold") or settings.DEEPFACE_THRESHOLD,
        "model": result.get("model"),
        "distance_metric": result.get("distance_metric"),
    }


def can_open_image(path: str) -> bool:
    image = cv2.imread(path)
    return image is not None
