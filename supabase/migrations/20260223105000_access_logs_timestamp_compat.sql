alter table public.access_logs
  add column if not exists timestamp timestamptz;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'access_logs'
      and column_name = 'created_at'
  ) then
    execute $q$
      update public.access_logs
      set timestamp = created_at
      where timestamp is null
    $q$;
  end if;
end;
$$;

update public.access_logs
set timestamp = now()
where timestamp is null;

alter table public.access_logs
  alter column timestamp set default now();

create index if not exists idx_access_logs_timestamp
  on public.access_logs (timestamp);

create index if not exists idx_access_logs_status_timestamp
  on public.access_logs (status, timestamp);