import json
import os
from app.config import settings


FACE_DB_PATH = os.path.join(settings.UPLOAD_DIR, "face_db.json")


def ensure_storage() -> None:
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    if not os.path.exists(FACE_DB_PATH):
        with open(FACE_DB_PATH, "w", encoding="utf-8") as f:
            json.dump({}, f)


def load_face_db() -> dict:
    ensure_storage()
    with open(FACE_DB_PATH, "r", encoding="utf-8") as f:
        return json.load(f)


def save_face_db(data: dict) -> None:
    ensure_storage()
    with open(FACE_DB_PATH, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)