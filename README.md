# VaultLink – Secure File Sharing Platform

**Repository:** [vinay-2006/secure-share-hub-6c914869](https://github.com/vinay-2006/secure-share-hub-6c914869)  
**Live Demo:** [secure-share-hub-6c914869.vercel.app](https://secure-share-hub-6c914869.vercel.app)

---

## 🚀 Overview

VaultLink lets you securely share files with the highest level of privacy, auditability, and control.  
**All core security, atomic validation, audit logging, and user-friendly features are shipped and ready for production deployment!**

**Status:** ✅ Code Complete | ⏳ Ready for Deployment

---

## ✨ Features

- **Atomic, Secure File Sharing:**  
  Upload files, set download limits/expiry, and protect with passwords/encryption

- **Zero Client-Side Validation Loopholes:**  
  All validation (revoke, expiry, download counting, and passwords) occurs *server-side* via Supabase Edge Functions

- **Audit Logging & Admin Panel:**  
  Full user and admin audit history, download metrics, geo-IP analysis, suspicious access detection, and more

- **Real-Time Share Management:**  
  View and revoke your active/expired/revoked shares, see download counts and expiry in real time

- **Password & Encryption Protection:**  
  Bcrypt password hashing, client-side AES-GCM encryption (optional), and secure download URLs

- **Elegant React UI:**  
  Modern, dark-mode design, responsive and accessible

---

## 🔒 Security by Design

- All secret logic (download validation, password hashes, revocation, counting) runs on the server only
- Password hashes **never** leave the backend
- Atomic download counting with optimistic locking—no race conditions
- Rate limiting (5 fails/10 mins/IP); geo-country and suspicious IP detection
- **Audit** every access, with access logs and admin tools

---

## 🏗️ Architectural Highlights

- **Frontend:** React + TypeScript (Vite, Tailwind), clean modular structure
- **Backend:** Supabase (Database, Storage, Edge Functions)
- **Edge Functions:** 
    - `validate-and-download`: server-side validation & atomic download counter
    - `verify-file-password`: secure password check (hash never given to browser)
- **Data Model:** Organized for robust share lifecycle management and user isolation (Row Level Security)
- For detailed design and security choices, see [`ARCHITECTURE_BUILT.md`](ARCHITECTURE_BUILT.md)

---

## 📚 Documentation

- **[Quick Start](QUICK_START.md):** Choose to deploy, test, or just review
- **[DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md):** Step-by-step production deployment (Supabase, Vercel)
- **[LOCAL_DEVELOPMENT.md](LOCAL_DEVELOPMENT.md):** Run everything locally (Supabase emulator)
- **[PROJECT_STATUS.md](PROJECT_STATUS.md):** Features, what works now, limitations
- **[ERROR_HANDLING_IMPROVEMENTS.md](ERROR_HANDLING_IMPROVEMENTS.md):** Helpful error messages, troubleshooting
- **[`supabase/functions/README.md`](supabase/functions/README.md):** Edge Function API contracts and deployment

---

## ⚡ Getting Started

### 1. Production Deployment (Recommended)
> ~15-20 min to a full, production app with **all security features enabled**.
```sh
# 1. Follow deployment guide:
cat DEPLOYMENT_GUIDE.md

# 2. Quick summary:
supabase login
supabase link --project-ref <your-project-ref>
supabase db push
supabase functions deploy
# Set env vars in Supabase Dashboard
```

### 2. Local Development/Test
> Fastest way to try out the UI, or hack on the project without deploying.
```sh
# 1. Setup local Supabase:
supabase start
supabase functions serve

# 2. Update .env.local with your local Supabase URL/keys
npx vite
```
*Full UI and all client logic will work, but actual uploads/downloads require edge function deployment.*

### 3. Just Review
> Only want to review? You can read:
- [`ARCHITECTURE_BUILT.md`](ARCHITECTURE_BUILT.md) (high-level technical)
- [`PROJECT_STATUS.md`](PROJECT_STATUS.md) (features, status)
- [`src/pages/`](src/pages/) (key React components)

---

## 💡 What Works Now

- React UI (all forms, status badges, revoking, error handling)
- Build + single test pass (TypeScript clean)
- You can verify navigation, revoke, and UI filters
- Access log listing, share status, and admin dashboard UIs
- Security and validation flows (with all error cases handled gently)

### After Deployment:
- **File upload with password and/or AES-GCM encryption**
- **Download rate-limiting and signed URLs**
- **Admin metrics, full audit logging, geo-country detection**
- **Automatic cleanup of expired shares**

---

## 🛣️ Project Structure

```
src/
  pages/
    Dashboard.tsx
    UploadFile.tsx
    DownloadAccess.tsx
    ShareResult.tsx
    MyShares.tsx
    AccessLogs.tsx
    AdminPanel.tsx
  components/
    StatusBadge.tsx
    AppSidebar.tsx
    AppHeader.tsx
  data/         // Test mocks
  lib/          // API and utility helpers
public/         // Static assets
supabase/
  functions/    // Edge (serverless) functions
  migrations/   // Database changes
```

---

## 🖌️ UI/UX and Theming

- **Dark mode** enabled by default (customizable via index.html)
- Consistent color palette, accessible contrasts
- Professional dashboard feel with responsive cards and animated status badges
- All icons (Heroicons), focus handling, and tab navigation supported

---

## 📋 Tech Stack

- **Frontend:** React, TypeScript, Vite, Tailwind CSS, Heroicons
- **Backend:** Supabase (Database & Storage), Edge Functions (TypeScript)
- **CI & Deployment:** Vercel, Supabase CLI, GitHub Actions (deploy scripts included)
- **Testing:** Vitest

---

## 🎮 Demo/Test Accounts

Create a demo account after deploying/running locally to test all flows  
(Admin features: add your user ID to `ADMIN_USER_IDS` env)

---

## 🔐 Security Notes

- Never commit `.env.local` or secrets.
- Encryption keys are never stored – only in browser memory!
- Only backend has access to Supabase server role keys

---

## ▶️ Try it Yourself

### Live (if deployed):

[Launch App](https://secure-share-hub-6c914869.vercel.app)

---

## 🎉 Credits

Built and open-sourced by [@vinay-2006](https://github.com/vinay-2006)

---

## 📄 License

_See repository for license details (custom, commercial, or open source)._

---

> _Need full technical details, deployment help, or in-depth security explanation?  
> See [ARCHITECTURE_BUILT.md](ARCHITECTURE_BUILT.md), [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md), and [supabase/functions/README.md](supabase/functions/README.md)._

---

_**Note: This README is based on current and quickly-evolving project documentation. For the most complete and up-to-date info, always check the files themselves in the repository!**_

---

**Partial file listing only; for full code and files visit the repository:**  
https://github.com/vinay-2006/secure-share-hub-6c914869/tree/main
