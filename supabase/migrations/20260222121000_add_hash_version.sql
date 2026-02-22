alter table public.files
add column if not exists hash_version text;

update public.files
set hash_version = 'sha256'
where password_hash is not null
  and (hash_version is null or hash_version = '');

alter table public.files
drop constraint if exists files_hash_version_check;

alter table public.files
add constraint files_hash_version_check
check (hash_version is null or hash_version in ('sha256', 'bcrypt'));

create index if not exists idx_files_hash_version
  on public.files (hash_version);
