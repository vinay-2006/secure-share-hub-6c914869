alter table public.access_logs
  add column if not exists created_at timestamptz;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'access_logs'
      and column_name = 'timestamp'
  ) then
    execute $q$
      update public.access_logs
      set created_at = timestamp
      where created_at is null
    $q$;
  end if;
end;
$$;

update public.access_logs
set created_at = now()
where created_at is null;

alter table public.access_logs
  alter column created_at set default now();

create index if not exists idx_access_logs_created_at
  on public.access_logs (created_at);

create index if not exists idx_access_logs_status_created_at
  on public.access_logs (status, created_at);