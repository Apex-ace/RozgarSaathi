from typing import Literal

from pydantic import BaseModel, EmailStr, Field


Role = Literal["worker", "user"]


class ProfileUpsert(BaseModel):
    role: Role
    full_name: str = ""
    location: str = ""
    availability: str = "available"
    status: str = "offline"
    skills: list[str] = Field(default_factory=list)
    experience_years: int = 0
    bio: str = ""


class JobCreate(BaseModel):
    title: str
    description: str = ""
    skill: str
    location: str
    urgency: str = "normal"


class JobAssign(BaseModel):
    worker_id: str


class MessageCreate(BaseModel):
    message: str


class RatingCreate(BaseModel):
    rating: int = Field(ge=1, le=5)
    review: str = ""


class MailRequest(BaseModel):
    to: EmailStr
    subject: str
    body: str
