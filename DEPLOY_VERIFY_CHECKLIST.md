# VaultLink Deployment Verification Checklist

Use this after deploying migrations and edge functions.

## 1) Deploy and list

Run in PowerShell:

```powershell
cd C:\secure-share-hub-6c914869
supabase login
supabase link --project-ref qqhkuowjptgzftoztvda
supabase db push
supabase functions deploy
supabase functions list
```

## 2) Smoke-check endpoint reachability

Run:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\verify-deployment.ps1
```

Expected:
- No edge endpoint returns HTTP 404
- admin endpoint returns 401 or 403 without bearer token
- ops endpoint returns 401 without X-Ops-Key

## 3) Verify schema in Supabase SQL editor

### Files columns

```sql
select column_name, data_type
from information_schema.columns
where table_schema = 'public'
  and table_name = 'files'
order by ordinal_position;
```

Ensure these exist:
- token
- stored_path
- original_name
- max_downloads
- download_count
- is_revoked
- hash_version
- encryption_enabled
- encryption_iv

### RLS enabled

```sql
select tablename, rowsecurity
from pg_tables
where schemaname = 'public'
  and tablename in ('files', 'access_logs');
```

Both should show rowsecurity = true.

### RLS policies present

```sql
select tablename, policyname, cmd
from pg_policies
where schemaname = 'public'
  and tablename in ('files', 'access_logs')
order by tablename, policyname;
```

Expected policy names:
- files_select_own
- files_insert_own
- files_update_own
- files_delete_own
- access_logs_select_own_files

## 4) Verify edge function secrets

In Supabase dashboard, confirm these secrets exist:
- ADMIN_USER_IDS
- OPS_MAINTENANCE_KEY
- ACCESS_LOG_RETENTION_DAYS
- RATE_LIMIT_SPIKE_THRESHOLD
- FAILURE_SPIKE_THRESHOLD

Set admin user (required once):

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\set-admin-user.ps1 -AdminUserId "<your-auth-user-id>"
```

Get your auth user id from browser console while logged into the app:

```javascript
(await supabase.auth.getUser()).data.user.id
```

Run maintenance safely (optional):

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\run-ops-maintenance.ps1 -OpsKey "<OPS_MAINTENANCE_KEY>"
```

## 5) Functional checks in app

- Upload file as authenticated user
- Open generated share link and download once
- Confirm download_count increments
- Try wrong password 5 times and confirm rate limit behavior
- Open admin panel with admin user id and confirm data loads

## 6) If something fails

- Function 404: redeploy with supabase functions deploy
- 401/403 on admin: verify ADMIN_USER_IDS contains your exact auth user id
- Upload metadata fail: confirm db push succeeded and new migration is applied
- Local calls hitting wrong project: remove or rename .env.local and restart Vite