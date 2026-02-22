alter table public.access_logs
add column if not exists geo_country text;

create index if not exists idx_access_logs_geo_country
  on public.access_logs (geo_country);
