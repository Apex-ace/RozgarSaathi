from fastapi import FastAPI, Depends, UploadFile, File, Form
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.schemas import (
    RegisterRequest,
    LoginRequest,
    AuthResponse,
    SendMailRequest,
    SendMailResponse,
    FaceVerifyResponse,
)
from app.auth import register_with_supabase, login_with_supabase
from app.dependencies import get_current_user
from app.mailer import send_smtp_email
from app.face_utils import register_face_for_user, verify_face_for_user
from app.storage import ensure_storage


app = FastAPI(title=settings.APP_NAME)
ensure_storage()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/static", StaticFiles(directory="app/static"), name="static")


@app.get("/")
async def root():
    return FileResponse("app/static/index.html")


@app.get("/health")
async def health():
    return {"success": True, "message": "API is running"}


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
    return {
        "success": True,
        "user": current_user,
    }


@app.post("/register-face")
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


@app.post("/verify-face", response_model=FaceVerifyResponse)
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