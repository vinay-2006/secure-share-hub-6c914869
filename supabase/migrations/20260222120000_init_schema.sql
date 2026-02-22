-- Enable extension for UUID generation
create extension if not exists "pgcrypto";

create table if not exists public.files (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  filename text,
  original_name text,
  description text,
  password_hash text,
  hash_version text,
  expires_at timestamptz,
  download_limit integer,
  download_count integer default 0,
  is_revoked boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.access_logs (
  id uuid primary key default gen_random_uuid(),
  file_id uuid references public.files(id) on delete cascade,
  user_id uuid,
  ip_address text,
  geo_country text,
  status text,
  reason text,
  timestamp timestamptz default now()
);
