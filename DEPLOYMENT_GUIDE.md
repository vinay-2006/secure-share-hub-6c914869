# Deployment Checklist: Fix "Failed to Fetch" Errors

## Problem
The application is showing "Failed to fetch" errors because the Edge Functions haven't been deployed to Supabase yet.

## Solution: Deploy Edge Functions to Supabase

### Prerequisites
1. Supabase account (https://supabase.com)
2. Supabase CLI installed: `npm install -g supabase`
3. Your Supabase project credentials

### Step-by-Step Deployment

#### Step 1: Link Your Supabase Project
```bash
cd C:\secure-share-hub-6c914869
supabase login
supabase link --project-ref <YOUR_PROJECT_REF>
```

Get your project ref from:
- Go to https://app.supabase.com/projects
- Select your project (qqhkuowjptgzftoztvda)
- Navigate to Settings > General
- Copy the "Reference ID"

#### Step 2: Apply Database Migrations
```bash
supabase db push
```

This will create the necessary tables and columns:
- `hash_version` column on `files` table
- `geo_country` column on `access_logs` table
- `encryption_enabled` and `encryption_iv` columns on `files` table
- Performance indexes on `expires_at`, `timestamp`, `status+timestamp`

#### Step 3: Deploy Edge Functions
```bash
supabase functions deploy
```

Or deploy specific functions:
```bash
supabase functions deploy create-share-metadata
supabase functions deploy verify-file-password
supabase functions deploy validate-and-download
supabase functions deploy admin-panel-data
supabase functions deploy admin-share-action
supabase functions deploy ops-maintenance
```

#### Step 4: Set Environment Variables

In Supabase Dashboard (Settings > Edge Functions > Secrets), add:

```
ADMIN_USER_IDS=<your-user-id-1>,<your-user-id-2>
OPS_MAINTENANCE_KEY=<generate-a-secure-random-key>
ACCESS_LOG_RETENTION_DAYS=90
RATE_LIMIT_SPIKE_THRESHOLD=50
FAILURE_SPIKE_THRESHOLD=100
```

To get your user ID:
1. Log in to the app
2. Open browser console (F12)
3. Run: `(await supabase.auth.getUser()).data.user.id`

#### Step 5: Restart Your Local Dev Server
```bash
# Kill the existing server (Ctrl+C or close the terminal)
# Then restart:
npx vite
```

#### Step 6: Test the Application
1. Navigate to http://localhost:8080
2. Login with your Supabase account
3. Try uploading a file
4. Try downloading a file
5. Check admin panel

### Troubleshooting

#### 401/403 Unauthorized Errors
- Check that you're logged in: `supabase auth list`
- Verify access token: Check browser console (F12) → Application → Local Storage → `sb-token`
- Ensure ADMIN_USER_IDS includes your user ID

#### 404 Not Found Errors
- Function not deployed: Run `supabase functions deploy`
- Check function name is correct: `supabase functions list`
- Try redeploying specific function: `supabase functions deploy <function-name>`

#### Database Migration Errors
- Check migrations exist: `supabase migration list`
- If issues, reset (WARNING - data loss): `supabase db reset`
- Then: `supabase db push`

#### Network Errors (CORS)
- Clear browser cache: Ctrl+Shift+Delete
- Hard refresh: Ctrl+F5
- Check VITE_SUPABASE_URL in `.env` matches your project

### Verify Deployment Success

Run this to check function status:
```bash
supabase functions list
```

Expected output:
```
create-share-metadata   v1      Thu Feb 22 2026 13:00:00 GMT+0000
verify-file-password    v1      Thu Feb 22 2026 13:00:00 GMT+0000
validate-and-download   v1      Thu Feb 22 2026 13:00:00 GMT+0000
admin-panel-data        v1      Thu Feb 22 2026 13:00:00 GMT+0000
admin-share-action      v1      Thu Feb 22 2026 13:00:00 GMT+0000
ops-maintenance         v1      Thu Feb 22 2026 13:00:00 GMT+0000
```

Query to verify database migrations:
```sql
-- Run in Supabase SQL Editor
SELECT column_name, data_type FROM information_schema.columns 
WHERE table_name = 'files';
```

Should show: `hash_version`, `encryption_enabled`, `encryption_iv`

### Post-Deployment

#### Step 7: Schedule Ops Maintenance (Optional)
To automatically clean up expired files and logs:

1. Create a new HTTP Edge Function hook (cron)
2. Configure to call `ops-maintenance` every hour:
```bash
supabase functions deploy ops-maintenance --header "key:MAINTENANCE_KEY_VALUE"
```

Or use GitHub Actions / external cron service to call:
```
POST https://qqhkuowjptgzftoztvda.supabase.co/functions/v1/ops-maintenance
Header: X-Ops-Key: <OPS_MAINTENANCE_KEY>
```

#### Step 8: Production Safety
Before going live:
- [ ] Test file upload
- [ ] Test password protection
- [ ] Test encryption
- [ ] Test download with rate limiting
- [ ] Test admin panel (if applicable)
- [ ] Review security: RLS policies, signed URLs, password protection
- [ ] Set up monitoring/logging

### What's Being Deployed

| Function | Purpose | Requires Auth | Requires Admin |
|----------|---------|---------------|----------------|
| create-share-metadata | Save file metadata with bcrypt password hash | Bearer JWT | No |
| verify-file-password | Verify password + geographic logging | No | No |
| validate-and-download | Atomic download validation + signed URL | No | No |
| admin-panel-data | System metrics + audit logs | Bearer JWT | Yes (ADMIN_USER_IDS) |
| admin-share-action | Admin file mutations (revoke/extend/delete) | Bearer JWT | Yes (ADMIN_USER_IDS) |
| ops-maintenance | Cleanup expired files + retention purge | OPS_MAINTENANCE_KEY header | Yes |

---

## Quick Commands Reference

```bash
# Login
supabase login

# Link project
supabase link --project-ref qqhkuowjptgzftoztvda

# Apply database migrations
supabase db push

# Deploy all functions
supabase functions deploy

# Show function logs
supabase functions logs ops-maintenance
supabase functions logs validate-and-download

# List deployed functions
supabase functions list

# Run locally (before deploying)
supabase start
supabase functions serve
```

---

## Need Help?

1. **Supabase CLI Installation**: https://supabase.com/docs/guides/cli
2. **Edge Functions Guide**: https://supabase.com/docs/guides/functions
3. **Environment Variables**: https://supabase.com/docs/guides/functions#managing-secrets
4. **Database Migrations**: https://supabase.com/docs/guides/cli/local-development

---

## Security Notes

- Never commit `.env.local` or secrets to git
- Edge Functions have access to SERVICE_ROLE_KEY (server-only, secure)
- All password hashing happens server-side (bcrypt)
- Encryption keys never stored on server
- Rate limiting enforced per IP address
- All access logged for audit trail
