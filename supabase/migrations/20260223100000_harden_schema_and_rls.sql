-- Align schema with current application and edge function expectations

alter table public.files
  add column if not exists token text;

alter table public.files
  add column if not exists stored_path text;

alter table public.files
  add column if not exists max_downloads integer;

alter table public.files
  add column if not exists original_name text;

alter table public.files
  add column if not exists is_revoked boolean default false;

alter table public.files
  add column if not exists download_count integer default 0;

alter table public.files
  add column if not exists created_at timestamptz default now();

alter table public.files
  add column if not exists updated_at timestamptz default now();

-- Backfill max_downloads from legacy download_limit when present
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'files'
      and column_name = 'download_limit'
  ) then
    execute $q$
      update public.files
      set max_downloads = download_limit
      where max_downloads is null
    $q$;
  end if;
end;
$$;

create unique index if not exists idx_files_token_unique on public.files (token);
create index if not exists idx_files_user_id on public.files (user_id);

-- RLS policies
alter table public.files enable row level security;
alter table public.access_logs enable row level security;

drop policy if exists files_select_own on public.files;
create policy files_select_own
  on public.files
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists files_insert_own on public.files;
create policy files_insert_own
  on public.files
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists files_update_own on public.files;
create policy files_update_own
  on public.files
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists files_delete_own on public.files;
create policy files_delete_own
  on public.files
  for delete
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists access_logs_select_own_files on public.access_logs;
create policy access_logs_select_own_files
  on public.access_logs
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.files
      where files.id = access_logs.file_id
        and files.user_id = auth.uid()
    )
  );