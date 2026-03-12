# Admin Section Security Audit

**Date:** March 12, 2026  
**Scope:** `/admin/**` pages and `/api/admin/**` routes  
**Previous Audit:** [ADMIN_AUDIT.md](./ADMIN_AUDIT.md) (March 4, 2025)

---

## Executive Summary

The admin section uses a **defense-in-depth** approach: middleware (session check), server layout (full auth), client guard (redundant check), and per-route API auth. All 25 admin API routes enforce authentication and authorization. No critical vulnerabilities were found. Several low-priority recommendations remain.

---

## 1. Authentication & Authorization

### 1.1 Access Control Model

| Layer | Check | Location |
|-------|-------|----------|
| **Middleware** | Valid Supabase session | `middleware.ts` (lines 195–204) |
| **Layout (server)** | Session + domain + `managed_users` | `app/admin/layout.tsx` via `getAdminAuthServer()` |
| **Client guard** | Session + domain + `managed_users` | `AdminAuthGuard.tsx` |
| **API routes** | Session + domain + `managed_users` | All 25 `/api/admin/*` routes |

**Domain whitelist:** `@sageoutdooradvisory.com`, `@sagecommercialadvisory.com`  
**Managed users:** `managed_users` table with `is_active = true`

### 1.2 API Route Auth Coverage

All 25 admin API routes enforce auth:

| Route | Auth Method |
|-------|-------------|
| `GET/PUT/DELETE /api/admin/reports/[id]` | Session + domain + managed |
| `GET /api/admin/reports` | Session + domain + managed |
| `GET /api/admin/reports/stats` | Session + domain + managed |
| `POST /api/admin/reports/upload` | Session + domain + managed |
| `POST /api/admin/reports/presign-upload` | Session + domain + managed |
| `POST /api/admin/reports/unified-upload` | Session + domain + managed **or** internal API key |
| `POST /api/admin/reports/bulk-upload` | Internal API key only |
| `GET/PATCH /api/admin/reports/study/[studyId]` | Session + domain + managed |
| `POST /api/admin/reports/study/[studyId]/upload-docx` | Session + domain + managed |
| `GET /api/admin/reports/study/[studyId]/download-docx` | Session + domain + managed |
| `GET /api/admin/clients` | Session + domain + managed |
| `GET /api/admin/client-map/reports` | Session + domain + managed |
| `GET /api/admin/comparables` | Session + domain + managed |
| `GET /api/admin/comparables/facets` | Session + domain + managed |
| `GET /api/admin/comparables/analytics` | Session + domain + managed |
| `POST /api/admin/comparables/upload` | Session + domain + managed **or** internal API key |
| `GET /api/admin/comparables/[studyId]` | Session + domain + managed |
| `GET /api/admin/comparables/[studyId]/download` | Session + domain + managed |
| `POST /api/admin/comparables/[studyId]/re-extract` | Session + domain + managed |
| `GET /api/admin/anchor-point-insights` | Session + domain + managed |
| `GET /api/admin/anchor-point-insights/export` | Session + domain + managed |
| `GET /api/admin/audit-log` | Session + domain + managed |
| `GET /api/admin/map/properties` | Session + domain + managed |
| `GET /api/admin/map/unit-types` | Session + domain + managed |
| `GET /api/admin/sage-glamping-data/metrics` | Session + domain + managed |

### 1.3 Internal API Key (Bulk Upload)

- **bulk-upload:** Requires `x-internal-api-key` header; no session. Rate limited (30/hour per IP).
- **unified-upload / comparables/upload:** Accept internal key for server-to-server calls (e.g. bulk-upload, CI). When using internal key, still requires at least one active managed user.
- **Recommendation:** Rotate `ADMIN_INTERNAL_API_KEY` periodically. Never log or expose it.

---

## 2. Page Protection

### 2.1 Admin Pages

All admin pages are children of `app/admin/layout.tsx`, which:

1. Calls `getAdminAuthServer()` (session + domain + managed_users)
2. Redirects to `/login` if not authorized
3. Wraps content in `AdminAuthGuard` for client-side re-check

**Pages verified:** dashboard, client-map, comparables, past-reports, upload-reports, upload-comparables, proximity-insights, anchor-point-insights, audit-log, sage-glamping-data-breakdown, site-design.

### 2.2 Middleware

- **Matcher:** Excludes `/api`, `_next`, `favicon.ico`. **Admin API routes are not in middleware matcher** — they rely on per-route auth.
- **Admin paths:** Middleware checks session for `/admin` and redirects to `/login` if missing. Sets `X-Robots-Tag: noindex, nofollow`.

---

## 3. Security Controls

### 3.1 Path Traversal & File Safety

| Control | Status |
|---------|--------|
| `sanitizeFilename()` | Used in presign-upload, comparables/upload |
| `isValidTempUploadPath()` | Validates `temp-uploads/{uuid}/{filename}` in unified-upload |
| `sourceDir` in bulk-upload | Rejects `..`, validated against `reports/` base |
| Download routes | Reject `..`, `/`, invalid chars |

### 3.2 Rate Limiting

- unified-upload: 10/min (30/min with internal key)
- comparables/upload: 20/min
- comparables/analytics: 60/min
- bulk-upload: 30/hour per IP (internal key)

### 3.3 Crawler & Indexing

- `robots.txt`: Disallows `/admin/`, `/api/`, `/login`, `/auth/`
- Admin layout: `robots: { index: false, follow: false }`
- Middleware: `X-Robots-Tag: noindex, nofollow` on admin responses

### 3.4 Error Responses

- `lib/api-auth-errors.ts`: Generic 401/403 messages to reduce enumeration
- Routes use `unauthorizedResponse()` / `forbiddenResponse()` consistently

---

## 4. OAuth & Session

### 4.1 Login Flow

1. User visits `/login` → Google OAuth
2. Callback: `/auth/callback` exchanges code for session
3. `getSafeRedirect()` prevents open redirects: rejects `//`, `:`, non-path values
4. LoginForm verifies domain + managed_users before redirecting to admin

### 4.2 Logout

- `POST /api/auth/logout` calls `supabase.auth.signOut()` (clears auth cookies)
- AdminSidebar triggers logout + redirect to `/login`

---

## 5. Findings & Recommendations

### 5.1 Positive Findings

| Area | Status |
|------|--------|
| Server-side layout auth | ✅ `getAdminAuthServer()` before render |
| All API routes protected | ✅ 25/25 routes enforce auth |
| Domain whitelist | ✅ Enforced server-side |
| Managed user check | ✅ Enforced in layout and all APIs |
| Path traversal mitigations | ✅ Filename sanitization, path validation |
| Rate limiting | ✅ On uploads and bulk operations |
| robots.txt / noindex | ✅ Admin not indexed |
| Audit logging | ✅ `admin_audit_log` table, `/admin/audit-log` page |

### 5.2 Low-Priority Recommendations

| # | Item | Notes |
|---|------|------|
| 1 | **Client-side flash** | AdminAuthGuard runs after layout; brief "Verifying access..." is acceptable. Server layout already blocks unauthorized users. |
| 2 | **Centralized API auth** | ✅ Implemented: `withAdminAuth()` wrapper in `lib/require-admin-auth.ts`. All 25 admin API routes now use it. |
| 3 | **Input validation** | ✅ Implemented: `page` max 1000, `per_page` max 100; `validateFilterValues()` and `validateSearchTerms()` on comparables. |
| 4 | **RBAC** | ✅ Implemented: `requireRole: 'admin'` for presign-upload, reports/upload, upload-docx; admin role check for unified-upload and comparables/upload (session path). Bulk-upload uses internal API key (admin credential for server-to-server). |

### 5.3 No Critical Issues

- No unauthenticated admin API routes
- No IDOR (org-wide access is intentional)
- No open redirect in auth callback
- Internal API key is rate-limited and not exposed

---

## 6. Checklist for New Admin Routes

When adding new admin pages or API routes:

- [ ] Page under `app/admin/` (inherits layout auth)
- [ ] API route under `app/api/admin/` with session + domain + managed_users check
- [ ] Use `requireAdminAuth()` or inline `isManagedUser` + `isAllowedEmailDomain`
- [ ] Add rate limiting if handling uploads or heavy operations
- [ ] Use `sanitizeFilename()` / `isValidTempUploadPath()` for file paths
- [ ] Add audit log entry for sensitive actions (edit, delete, download)

---

## 7. Conclusion

The `/admin/**` section is **secure** with multiple layers of authentication and authorization. All API routes enforce proper checks. No critical vulnerabilities were identified. The architecture aligns with the previous audit (March 2025) and incorporates the recommended fixes (path sanitization, rate limiting, audit logging).
