from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    SUPABASE_URL: str
    SUPABASE_PUBLISHABLE_KEY: str
    SUPABASE_SERVICE_ROLE_KEY: str

    SMTP_HOST: str
    SMTP_PORT: int
    SMTP_USER: str
    SMTP_PASS: str
    SMTP_FROM: str

    APP_NAME: str = "Rozgar API"
    UPLOAD_DIR: str = "uploads"

    DEEPFACE_MODEL: str = "Facenet"
    DEEPFACE_DISTANCE_METRIC: str = "cosine"
    DEEPFACE_DETECTOR_BACKEND: str = "opencv"
    DEEPFACE_THRESHOLD: float = 0.68

    CORS_ORIGINS: str = "http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000,http://127.0.0.1:3000"

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    @property
    def cors_origins_list(self) -> list[str]:
        return [x.strip() for x in self.CORS_ORIGINS.split(",") if x.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
