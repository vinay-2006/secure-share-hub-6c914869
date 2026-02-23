create index if not exists idx_files_expires_at on public.files (expires_at);

do $$
begin
	if exists (
		select 1
		from information_schema.columns
		where table_schema = 'public'
			and table_name = 'access_logs'
			and column_name = 'timestamp'
	) then
		execute 'create index if not exists idx_access_logs_timestamp on public.access_logs (timestamp)';
		execute 'create index if not exists idx_access_logs_status_timestamp on public.access_logs (status, timestamp)';
	elsif exists (
		select 1
		from information_schema.columns
		where table_schema = 'public'
			and table_name = 'access_logs'
			and column_name = 'created_at'
	) then
		execute 'create index if not exists idx_access_logs_timestamp on public.access_logs (created_at)';
		execute 'create index if not exists idx_access_logs_status_timestamp on public.access_logs (status, created_at)';
	end if;
end;
$$;
