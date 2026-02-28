# VaultLink – Secure, Auditable File Sharing

[Live App](https://secure-share-hub-6c914869.vercel.app) | [Source Code](https://github.com/vinay-2006/secure-share-hub-6c914869)

---

## 🚀 Overview

VaultLink is a policy-driven file sharing platform for securely transmitting files with:

- Time-bound access
- Download limits
- Password-based protection
- (Optional) client-side AES-GCM encryption
- Full server-side audit logging
- Admin visibility & revocation

Core stack: **React**, **Supabase (Postgres, Storage, Edge Functions)**, **TypeScript**.

---

## 🎯 Motivation

Most public file-sharing links:

- Don’t enforce expiration
- Allow unlimited downloads
- Have no instant revocation
- Offer limited access visibility

VaultLink explores layered access controls, auditability, and server-side policy enforcement to address these issues.

---

## 🔑 Key Features

- **All critical validation server-side**: Expiry, download count, password check, revocation, and logging enforced via Supabase Edge Functions (not in the browser).
- **Atomic download counter**: Prevents race conditions and double-counting.
- **Password and encryption support**: Files can be protected by password (bcrypt hash, server-validated); optional client-side AES encryption.
- **Access visibility**: Download logs tracked by timestamp, IP, and file.
- **Instant revocation**: Disable a link immediately from UI.
- **Admin panel**: High-level metrics and system actions.

---

## ⚠️ Limitations

- Not externally security-audited or penetration-tested
- Intended for learning/demo environments, not production
- Rate limiting is basic (per-function, not distributed)
- No malware scanning on upload
- No CDN or DDoS bodyguarding
- No RBAC; all users self-administered
- No S3-bucket public access hardening verification
- No mobile UI optimization

---

## 🛠 Future Improvements

- Distributed/global rate limiting
- File extension/type validation & malware scanning
- Role-based access control (RBAC)
- Automated expired-share cleanup jobs (scheduled ops)
- Monitoring and alerting integrations
- External security/code audit

---

## 🗂️ Project Structure

```
src/
  pages/
    UploadFile.tsx
    DownloadAccess.tsx
    MyShares.tsx
    AccessLogs.tsx
    AdminPanel.tsx
  components/
supabase/
  functions/           # Edge Functions (validate, password-check)
  migrations/
```
- See [`ARCHITECTURE_BUILT.md`](./ARCHITECTURE_BUILT.md) for technical design.
- See [`PROJECT_STATUS.md`](./PROJECT_STATUS.md) for phase-by-phase work and results.

---

## ⚡ Quick Start (Local Development)

1. **Prerequisites:**  
   - [Supabase CLI](https://supabase.com/docs/guides/cli) (`npm install -g supabase`)
   - [Node.js](https://nodejs.org/) (recommended v18+)

2. **Clone and Install:**
   ```sh
   git clone https://github.com/vinay-2006/secure-share-hub-6c914869.git
   cd secure-share-hub-6c914869
   npm install
   ```

3. **Local Supabase Setup**  
   (See [`LOCAL_DEVELOPMENT.md`](LOCAL_DEVELOPMENT.md) for detailed workflow)
   ```sh
   supabase start
   supabase functions serve
   # Set up .env.local with local anon key etc
   npm run dev
   ```

4. **Run tests/build:**
   ```sh
   npm run test
   npm run build
   ```

---

## 🚀 Deploying (Prototype Production)

*Follow [`DEPLOYMENT_GUIDE.md`](./DEPLOYMENT_GUIDE.md) for full environment and function setup. Key steps:*

```sh
supabase login
supabase link --project-ref <YOUR-PROJECT-REF>
supabase db push
supabase functions deploy
# Set env vars in Supabase dashboard
```
- Use Vercel, Netlify etc for frontend. Ensure .env contains Supabase project URL/keys.

---

## 🔎 Documentation

- [`ARCHITECTURE_BUILT.md`](./ARCHITECTURE_BUILT.md): Internal design, validations, flows
- [`supabase/functions/README.md`](./supabase/functions/README.md): Edge Function endpoints and code
- [`QUICK_START.md`](./QUICK_START.md): Fast local/production setup
- [`PROJECT_STATUS.md`](./PROJECT_STATUS.md): Build progress, what’s working, known bugs

---

## 🤝 Contributing / Reuse

Refactoring, audits, and scalability impact welcome.  
Please PR additional hardening, scanning, or configuration files—this is a learning reference.

---

## 📜 License

*See LICENSE file or repo for current terms. Created for learning and demo purposes.*

---

## 👀 Live Demo

- [https://secure-share-hub-6c914869.vercel.app](https://secure-share-hub-6c914869.vercel.app)
  (Most features work only with full backend setup—see above.)

---

## 🙋 Questions?

- For issues, open a GitHub Issue
- For architecture, see docs linked above

---
