from pydantic import BaseModel, EmailStr, Field


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=6, max_length=128)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=6, max_length=128)


class AuthResponse(BaseModel):
    success: bool
    message: str
    access_token: str | None = None
    refresh_token: str | None = None
    token_type: str | None = None
    user: dict | None = None


class SendMailRequest(BaseModel):
    to_email: EmailStr
    subject: str = Field(..., min_length=1, max_length=200)
    message: str = Field(..., min_length=1, max_length=5000)


class SendMailResponse(BaseModel):
    success: bool
    message: str
    sent_to: EmailStr


class FaceVerifyResponse(BaseModel):
    success: bool
    message: str
    matched: bool
    distance: float | None = None
    threshold: float | None = None
    anti_spoofing_checked: bool = True
    user_email: str | None = None