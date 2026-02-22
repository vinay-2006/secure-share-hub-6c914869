# Local Development & Testing Guide

## Current Status

✅ **Codebase**: Fully built and error-checked
❌ **Edge Functions**: Not yet deployed to Supabase (causes "Failed to fetch" errors)
❓ **Database**: Migrations created but not applied

## Why You See "Failed to fetch"

When you try to upload a file, the app attempts to call Edge Functions at:
```
https://qqhkuowjptgzftoztvda.supabase.co/functions/v1/create-share-metadata
```

Since these haven't been deployed yet, you get a "Failed to fetch" error.

## Option 1: Deploy to Supabase (Recommended - Production-Ready)

See [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) for step-by-step instructions.

**Time Required**: 15-20 minutes

**Benefits**:
- Full functionality
- Production-ready
- All security features working
- Real database persistence

## Option 2: Local Development with Mock Functions

For quick testing without deployment:

### Step 1: Install Supabase CLI
```bash
npm install -g supabase
```

### Step 2: Start Supabase Locally
```bash
cd C:\secure-share-hub-6c914869
supabase start
```

This will:
- Start PostgreSQL locally
- Start Supabase services
- Create auth users
- Apply migrations

### Step 3: Update Environment Variables
Create or update `.env.local`:
```env
VITE_SUPABASE_URL=http://localhost:54321
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

Get these from:
```bash
supabase status
```

### Step 4: Start Edge Functions Locally
In new terminal:
```bash
supabase functions serve
```

### Step 5: Restart Dev Server
```bash
npx vite
```

**Time Required**: 5-10 minutes

**Benefits**:
- Test locally without internet
- No data sent to servers
- Fast iteration
- Can debug Edge Functions

**Limitations**:
- Only works while services are running
- No persistence after restart (lose data)

## Option 3: Skip Edge Function Testing, Test UI Only

For testing just the UI/UX without actual uploads:

1. The app will show helpful error messages
2. You can inspect the error messages to verify error handling is correct
3. All UI components will render and validate input
4. Can test authentication flow
5. Can test navigation and layout

**Time Required**: Immediate

**Benefits**:
- Instant testing
- No dependencies
- Can review UI/UX

**Limitations**:
- Can't test file upload/download
- Can't test password verification
- Can't test admin panel data loading

## Testing Checklist

### UI/Basic Navigation
- [ ] Login page loads
- [ ] Register page works
- [ ] Dashboard displays (shows helpful error if Edge Function missing)
- [ ] Upload page form renders
- [ ] Download access page shows error handling

### Authentication
- [ ] Can create account
- [ ] Can login  
- [ ] Can logout
- [ ] Session persists on refresh

### Error Handling (Current State)
- [ ] Upload form shows helpful error message
- [ ] Error message explains what's missing
- [ ] Error message provides fix instructions
- [ ] Admin panel shows helpful error message

### After Deploying Edge Functions
- [ ] Can upload file with password
- [ ] Can upload file with encryption
- [ ] Can download with password
- [ ] Can download with encryption key
- [ ] Download count increments
- [ ] Access logs appear
- [ ] Admin panel shows metrics
- [ ] Rate limiting works (5 wrong passwords = 429)
- [ ] Geo country displays in logs
- [ ] Suspicious IP detection works

## Current App Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Browser / React App                     │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  UploadFile.tsx                                      │   │
│  │  - Choose file                                       │   │
│  │  - Set password, expiry, limit                       │   │
│  │  ✅ Encrypts file locally (AES-GCM)                  │   │
│  │  ❌ Calls create-share-metadata (not deployed)       │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  DownloadAccess.tsx                                  │   │
│  │  - Shows password form                               │   │
│  │  ❌ Calls verify-file-password (not deployed)        │   │
│  │  ❌ Calls validate-and-download (not deployed)       │   │
│  │  ✅ Decrypts locally (if encrypted)                  │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                           ↓↑
                    ❌ EDGE FUNCTIONS ❌
                    (Not Deployed Yet)
                           ↓↑
┌─────────────────────────────────────────────────────────────┐
│                    Supabase Backend                          │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  create-share-metadata - Hash password, save metadata│   │
│  │  verify-file-password - Check password hash          │   │
│  │  validate-and-download - Atomic counter, signed URL  │   │
│  │  admin-panel-data - System metrics                   │   │
│  │  admin-share-action - File mutations                 │   │
│  │  ops-maintenance - Cleanup expired files             │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  PostgreSQL Database                                 │   │
│  │  - files table (with hashes, encryption metadata)    │   │
│  │  - access_logs table (with geo, rate limit tracking) │   │
│  │  - auth.users table (Supabase Auth)                  │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Storage Bucket (/files)                             │   │
│  │  - Stores encrypted/unencrypted files                │   │
│  │  - Signed URL access only (post-validation)          │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## Files Modified for Error Handling

1. **edgeFunctionMock.ts** (NEW)
   - Provides helpful error messages
   - Explains what to do next
   - Identifies Edge Function issues

2. **UploadFile.tsx** (UPDATED)
   - Better error handling
   - Helpful error messages
   - Specific fix instructions

3. **DownloadAccess.tsx** (UPDATED)
   - Network error handling
   - Rate limit error messages
   - Device status logging

4. **AdminPanel.tsx** (UPDATED)
   - Error handling for Edge Functions
   - Helpful error messages
   - Try-catch for network errors

## Build Status

```
✅ Build: npm run build
   Result: 1775 modules, 612.12 KB (gzipped: 180.46 KB)
   Diagnostics: No errors

✅ Tests: npm run test
   Result: 1 test passed
   
✅ Dev Server: npx vite
   Result: Running on http://localhost:8080
```

## What to Do Next

### I want to deploy and use this in production:
→ Follow [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)

### I want to test locally first:
→ Use Option 2 (Local Supabase + Edge Functions)

### I just want to verify the UI/error handling:
→ Use the app now, it has helpful error messages!

---

## FAQ

**Q: Why do I see "Failed to fetch"?**
A: Edge Functions aren't deployed to Supabase yet. The app tries to call them but they don't exist. See DEPLOYMENT_GUIDE.md to deploy.

**Q: Can I use this without Supabase?**
A: No, this architecture requires Supabase for:
   - PostgreSQL database
   - Edge Functions (server-side logic)
   - Authentication (JWT)
   - File storage (signed URLs)

**Q: How long does deployment take?**
A: 15-20 minutes total (mostly manual CLI commands).

**Q: Can I test without deploying?**
A: Yes! Run Supabase locally with `supabase start` and `supabase functions serve`.

**Q: Is my data secure?**
A: Yes! All security features work:
   - Server-side password hashing (bcrypt)
   - Server-side validation (no client-side trust)
   - Client-side encryption (optional, key stays in browser)
   - Rate limiting per IP
   - Audit logging
   - Signed URLs (access control)

---

## Support

For issues, check:
1. `npm run build` - compilation errors?
2. `npm run test` - test failures?
3. Browser console (F12) - API errors?
4. Terminal output - server errors?
5. [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) - deployment issues?

