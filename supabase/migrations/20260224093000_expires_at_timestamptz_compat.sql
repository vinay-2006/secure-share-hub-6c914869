do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'files'
      and column_name = 'expires_at'
      and data_type = 'timestamp without time zone'
  ) then
    alter table public.files
      alter column expires_at type timestamptz
      using (
        case
          when expires_at is null then null
          else expires_at at time zone 'UTC'
        end
      );
  end if;
end;
$$;