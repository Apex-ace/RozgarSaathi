# JobConnect MVP

A React + FastAPI + Supabase + Socket.IO + Face Verification scaffold for a worker/user marketplace.

## Flow covered

- Supabase sign up / sign in
- Role selection: worker or user
- Worker onboarding with face registration, skills, location, availability
- User flow for searching workers or posting jobs
- Matching and worker job feed
- Chat per job using Socket.IO
- Job completion and worker rating
- Trust score updates after ratings

## Project layout

- `frontend/` - Vite React app
- `backend/` - FastAPI API + Socket.IO server
- `supabase_schema.sql` - tables for profiles, jobs, messages, ratings, face profiles

## Frontend env

Create `frontend/.env.local`

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxx
VITE_API_BASE=http://YOUR_PC_LAN_IP:8000
```

## Backend env

Create `backend/.env`

```env
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxx
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=yourmail@gmail.com
SMTP_PASS=your_rotated_app_password
SMTP_FROM=yourmail@gmail.com

APP_NAME=JobConnect API
UPLOAD_DIR=uploads
DEEPFACE_MODEL=Facenet
DEEPFACE_DISTANCE_METRIC=cosine
DEEPFACE_DETECTOR_BACKEND=opencv
DEEPFACE_THRESHOLD=0.68
CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173,http://YOUR_PC_LAN_IP:5173
```

## Run backend

```bash
cd backend
python -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

## Run frontend

```bash
cd frontend
npm install
npm run dev -- --host 0.0.0.0
```

## Notes

- Apply `supabase_schema.sql` in Supabase SQL editor first.
- The backend uses the service role key for table writes and the publishable key to validate user tokens.
- For LAN testing, replace API and frontend origins with your machine IP.
