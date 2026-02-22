create index if not exists idx_files_expires_at on public.files (expires_at);
create index if not exists idx_access_logs_timestamp on public.access_logs (timestamp);
create index if not exists idx_access_logs_status_timestamp on public.access_logs (status, timestamp);
