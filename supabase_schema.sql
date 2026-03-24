create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key,
  email text not null unique,
  role text not null check (role in ('worker', 'user')),
  full_name text,
  location text,
  availability text,
  status text default 'offline',
  skills text[] default '{}',
  experience_years int default 0,
  bio text,
  face_registered boolean default false,
  face_verified boolean default false,
  rating_avg numeric(3,2) default 0,
  rating_count int default 0,
  trust_score int default 50,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.face_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  image_path text not null,
  created_at timestamptz default now(),
  unique(user_id)
);

create table if not exists public.jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  worker_id uuid references public.profiles(id) on delete set null,
  title text not null,
  description text,
  skill text not null,
  location text not null,
  urgency text default 'normal',
  status text not null default 'open' check (status in ('open','assigned','in_progress','completed','cancelled')),
  chat_room_id text not null default encode(gen_random_bytes(10), 'hex'),
  created_at timestamptz default now(),
  accepted_at timestamptz,
  completed_at timestamptz
);

create table if not exists public.job_messages (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs(id) on delete cascade,
  room_id text not null,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  message text not null,
  created_at timestamptz default now()
);

create table if not exists public.ratings (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  worker_id uuid not null references public.profiles(id) on delete cascade,
  rating int not null check (rating between 1 and 5),
  review text,
  created_at timestamptz default now(),
  unique(job_id)
);

alter table public.profiles enable row level security;
alter table public.face_profiles enable row level security;
alter table public.jobs enable row level security;
alter table public.job_messages enable row level security;
alter table public.ratings enable row level security;

create policy "profiles readable by authenticated users"
on public.profiles for select
to authenticated
using (true);

create policy "jobs readable by authenticated users"
on public.jobs for select
to authenticated
using (true);

create policy "messages readable by authenticated users"
on public.job_messages for select
to authenticated
using (true);

create policy "ratings readable by authenticated users"
on public.ratings for select
to authenticated
using (true);
