# Rozgar Fullstack Starter

This package includes a FastAPI backend and a Vite + React frontend for the worker/user hiring flow.

## Included flow

- User / worker auth
- Role-based profile setup
- Worker face registration and verification
- Limited dropdowns for cities and job skills
- Worker search
- Direct hire from worker profile or search results
- Job posting and worker job feed
- Job room with realtime chat over WebSocket
- Job completion and rating

## Backend run

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate   # Windows
pip install -r requirements.txt
copy .env.example .env
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

## Frontend run

```bash
cd frontend
npm install
npm run dev -- --host 0.0.0.0 --port 5173
```

## Important

- Update backend `.env` with your Supabase and SMTP credentials.
- The frontend defaults to `http://<current-hostname>:8000`, so it works on local network when backend runs with `0.0.0.0`.
- The backend CORS config accepts localhost and common LAN ranges.
