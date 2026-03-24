from typing import Optional, List
from pydantic import BaseModel


class WorkerLocationUpdate(BaseModel):
    lat: Optional[float] = None
    lng: Optional[float] = None
    address_text: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    is_location_live: bool = False
    service_radius_km: int = 5
    availability_status: str = "available"


class WorkerProfileUpdate(BaseModel):
    skills: List[str] = []
    location: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None
    address_text: Optional[str] = None
    is_location_live: bool = False
    service_radius_km: int = 5
    availability_status: str = "available"
    experience_years: int = 0
    hourly_rate: float = 0.0


class UserSearchWorkersQuery(BaseModel):
    skill: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None
    radius_km: int = 10
    city: Optional[str] = None
    availability_status: Optional[str] = None
    min_rating: Optional[float] = None
    min_trust_score: Optional[float] = None
    min_experience: Optional[int] = None
    face_verified: Optional[bool] = None
    max_hourly_rate: Optional[float] = None
    sort_by: Optional[str] = "nearest"