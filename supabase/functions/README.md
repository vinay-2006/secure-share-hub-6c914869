# VaultLink Edge Functions Deployment Guide

## Overview

This directory contains two Supabase Edge Functions that implement atomic, server-side validation for secure file downloads:

1. **`validate-and-download`** - Atomically validates access and returns signed URL
2. **`verify-file-password`** - Server-side password verification (prevents hash exposure)

## Architecture

### validate-and-download

**Purpose**: Single atomic operation to validate file access and return download URL

**Security Features**:
- Revocation check (is_revoked flag)
- Expiry check (expires_at timestamp)
- Download limit validation (download_count vs max_downloads)
- Atomic increment using optimistic locking (prevents race conditions)
- IP address logging (captured from request headers)
- Concurrent download detection (409 conflict response)

**Request**:
```typescript
POST /functions/v1/validate-and-download
Content-Type: application/json

{
  "fileId": "uuid"
}
```

**Response (Success)**:
```json
{
  "success": true,
  "signedUrl": "https://bucket.supabase.co/storage/v1/object/sign/files/..."
}
```

**Response (Failure)**:
```json
{
  "success": false,
  "error": "file_not_found | file_revoked | link_expired | download_limit_exceeded | concurrent_download_detected | ..."
}
```

**Status Codes**:
- `200`: Success, signed URL returned
- `400`: Missing fileId
- `403`: Access denied (revoked/expired/limit-exceeded)
- `404`: File not found
- `409`: Concurrent download detected (retry)
- `500`: Server error

### verify-file-password

**Purpose**: Verify password server-side without exposing hash to client

**Security Features**:
- SHA-256 hash comparison (will migrate to bcrypt)
- Constant-time string comparison (prevents timing attacks)
- No hash exposure (returns boolean only)

**Request**:
```typescript
POST /functions/v1/verify-file-password
Content-Type: application/json

{
  "fileId": "uuid",
  "passwordHash": "hex-string-sha256"
}
```

**Response**:
```json
{
  "success": true,
  "valid": true  // or false if password mismatch
}
```

**Status Codes**:
- `200`: Success, valid field indicates if password matches
- `400`: Missing fields
- `404`: File not found
- `500`: Server error

## Deployment Steps

### 1. Install Supabase CLI

```bash
npm install -g supabase
```

### 2. Link Project

```bash
supabase login
supabase link --project-ref YOUR_PROJECT_REF
```

### 3. Deploy Functions

```bash
supabase functions deploy validate-and-download
supabase functions deploy verify-file-password
```

### 4. Set Environment Variables (in Supabase Dashboard)

The functions automatically use `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` from the environment.
No additional setup needed.

### 5. Update Frontend Environment

Ensure your `.env` includes:
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

## Client Usage (React)

```typescript
// In DownloadAccess.tsx

// 1. Verify password (if required)
if (fileData.password_hash) {
  const hashedInput = await hashPassword(password); // Client-side SHA-256
  const verifyRes = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/verify-file-password`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fileId: fileData.id,
        passwordHash: hashedInput,
      }),
    }
  );
  const verifyData = await verifyRes.json();
  if (!verifyData.valid) throw new Error("Incorrect password");
}

// 2. Get signed URL atomically
const validateRes = await fetch(
  `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/validate-and-download`,
  {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fileId: fileData.id }),
  }
);
const downloadData = await validateRes.json();
if (downloadData.success) {
  window.location.href = downloadData.signedUrl;
}
```

## Migration Path

### Phase 1: Current (SHA-256 Client-Side)
- Client sends SHA-256 hash to Edge Function
- Edge Function verifies by comparing hashes
- Works but uses weak hashing algorithm

### Phase 2: Bcrypt on Server (Next Step)
- Migrate `password_hash` column to bcrypt hashes
- Edge Function uses bcrypt.compare() instead of SHA-256
- Remove client-side hash entirely (send plaintext via HTTPS)

### Phase 3: Client-Side Encryption (Future)
- Before upload: encrypt file with user's password
- Before download: decrypt client-side
- Password never reaches server for file data

## Error Handling

### Client-Side Retry Logic

```typescript
if (validateRes.status === 409) {
  // Concurrent download detected
  // Exponential backoff retry (with jitter)
  await new Promise(r => setTimeout(r, Math.random() * 1000 + 100));
  return handleDownload(event); // Retry
}
```

### Logging

Both functions log to `access_logs` table:
- Success: `status: "success"`, `reason: "download_initiated"`
- Failures: `status: "failed"`, `reason: "[specific_reason]"`

All access attempts (success and failed) are permanently logged for audit.

## Performance Considerations

- **Network latency**: +1 roundtrip vs. client-side validation (acceptable for security)
- **Database**: 3 queries per download (fetch file, increment, log) → ~10-50ms
- **Signed URL generation**: ~5-20ms (depends on Supabase performance)
- **Total**: ~50-100ms overhead vs. client-side (~10ms)

**Optimization**: Could batch fetching + incrementing into an RPC call (if Supabase supports it in future).

## Troubleshooting

### 409 Conflicts

If you see frequent 409 responses, it means:
- Multiple concurrent downloads of the same file
- Optimistic locking is triggering (expected)
- Client should retry with exponential backoff

### Missing IP Address

If `ip_address` is always null:
- Verify Supabase deployment includes `x-forwarded-for` header
- Check if Edge Functions are running behind a proxy
- May need to use `x-real-ip` instead

### Hash Mismatch (Bcrypt Migration)

Before migrating to bcrypt:
1. Export all current SHA-256 hashes
2. Rehash with bcrypt
3. Update `password_hash` column values
4. Deploy new Edge Function code with bcrypt.compare()

## Testing

### Local Testing

```bash
supabase functions serve

# In another terminal:
curl -X POST http://localhost:54321/functions/v1/validate-and-download \
  -H "Content-Type: application/json" \
  -d '{"fileId": "test-uuid"}'
```

### Production Testing

Use the client-side code in DownloadAccess.tsx with a real file UUID.

## Security Notes

1. **Always use HTTPS** - Signed URLs are valid for 60 seconds; HTTPS prevents interception
2. **Access logs are immutable** - Never delete access_logs for audit purposes
3. **Rate limiting** - Consider adding per-IP rate limiting in Edge Function (future)
4. **RLS is enforced** - Only the authenticated user who uploaded can see their files

---

**Last Updated**: Feb 19, 2026
**Status**: Production-ready for Phase 1 (atomic downloads)
