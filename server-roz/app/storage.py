import json
import os
from typing import Any

DB_FILE = "uploads/face_db.json"


def ensure_storage() -> None:
    os.makedirs("uploads", exist_ok=True)
    if not os.path.exists(DB_FILE):
        with open(DB_FILE, "w", encoding="utf-8") as f:
            json.dump({}, f)


def load_face_db() -> dict[str, Any]:
    ensure_storage()
    with open(DB_FILE, "r", encoding="utf-8") as f:
        return json.load(f)


def save_face_db(data: dict[str, Any]) -> None:
    ensure_storage()
    with open(DB_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)