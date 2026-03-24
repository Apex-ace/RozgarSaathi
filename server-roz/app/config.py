from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    SUPABASE_URL: str
    SUPABASE_ANON_KEY: str

    SMTP_HOST: str
    SMTP_PORT: int
    SMTP_USER: str
    SMTP_PASS: str
    SMTP_FROM: str

    APP_NAME: str = "FastAPI DeepFace API"
    UPLOAD_DIR: str = "uploads"

    DEEPFACE_MODEL: str = "Facenet"
    DEEPFACE_DISTANCE_METRIC: str = "cosine"
    DEEPFACE_DETECTOR_BACKEND: str = "opencv"
    DEEPFACE_THRESHOLD: float = 0.68

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()