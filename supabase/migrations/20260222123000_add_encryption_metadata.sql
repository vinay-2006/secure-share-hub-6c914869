alter table public.files
add column if not exists encryption_enabled boolean not null default false;

alter table public.files
add column if not exists encryption_iv text;

create index if not exists idx_files_encryption_enabled
  on public.files (encryption_enabled);
