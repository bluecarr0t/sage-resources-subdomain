# Admin Section Audit

**Date:** March 4, 2025  
**Scope:** `/admin/**` pages and `/api/admin/**` routes

---

## Executive Summary

The admin section uses Google OAuth, domain whitelisting, and a `managed_users` table for access control. Most API routes enforce authentication and authorization consistently. Several security, privacy, and improvement opportunities were identified.

---

## 1. Security Concerns

### 1.1 Access Model — Org-Wide (Intentional)

**Design:** Internal Sage users (`@sageoutdooradvisory.com`, `@sagecommercialadvisory.com`) in `managed_users` have full org-wide access. No `user_id` filtering is applied—all managed users see and can act on all reports, clients, and studies.

| Route | Access |
|-------|--------|
| `GET /api/admin/reports` | All reports |
| `GET /api/admin/client-map/reports` | All reports |
| `GET /api/admin/reports/stats` | All reports |
| `GET /api/admin/clients` | All clients |
| `GET /api/admin/reports/[id]` | Any report |
| `PUT /api/admin/reports/[id]` | Any report |
| `DELETE /api/admin/reports/[id]` | Any report |
| `GET /api/admin/reports/study/[studyId]` | Any report |
| `PATCH /api/admin/reports/study/[studyId]` | Any report |
| `GET /api/admin/comparables/[studyId]` | Any study |
| `GET /api/admin/comparables/[studyId]/download` | Any study |
| `GET /api/admin/reports/study/[studyId]/download-docx` | Any report |
| `POST /api/admin/comparables/[studyId]/re-extract` | Any study |
| `POST /api/admin/reports/study/[studyId]/upload-docx` | Any report |

**Status:** ✅ Implemented. All admin routes use org-wide access for authenticated managed users.

---

### 1.2 Path Traversal in File Uploads — ✅ Fixed

**Status:** Filenames are now sanitized via `lib/sanitize-filename.ts`:
- `presign-upload`: Uses `sanitizeFilename()` before building storage paths
- `comparables/upload`: Uses `sanitizeFilename()` for workbook storage paths
- `unified-upload`: Validates `storagePath` with `isValidTempUploadPath()` when receiving JSON

---

### 1.3 Internal API Key Bypass — ✅ Hardened

**Status:** Mitigations in place:
- **Rate limiting:** `bulk-upload` limited to 5 requests/hour per IP when using internal key
- **Comments:** Code comments remind developers to never log or expose the key; rotate if compromised
- **Recommendation:** Rotate `ADMIN_INTERNAL_API_KEY` periodically; ensure it is never committed or logged

---

### 1.4 Middleware vs API Auth — Low

**Issue:** Middleware excludes `/api` routes from its matcher. Admin API routes are not protected by middleware; they rely entirely on each route handler for auth. This is acceptable but means every new admin API must implement auth checks.

**Recommendation:** Consider a shared auth helper or middleware wrapper for all `/api/admin/*` routes to avoid missing auth in new endpoints.

---

### 1.5 Rate Limiting — ✅ Fixed

**Status:** `checkRateLimitAsync()` uses Redis when available (`REDIS_URL` or `REDIS_HOST`), falls back to in-memory when Redis is unavailable. All admin rate-limited routes now use the async version. Limits: 10/min unified-upload (30/min internal), 20/min comparables/upload, 60/min analytics, 5/hour bulk-upload (internal key).

---

## 2. Privacy Concerns

### 2.1 Cross-User Data Access

**Design:** Org-wide access is intentional. All internal Sage users can access all reports, clients, and study data. Reports contain client names, addresses, executive summaries, PII, and financial data—access is restricted to managed users with allowed email domains only.

---

### 2.2 User Email Display

**Issue:** `AdminSidebar` displays the authenticated user's email. This is acceptable for internal admin but should not be exposed to non-admin users.

**Status:** ✅ Correct; sidebar is only rendered inside `AdminAuthGuard` for authenticated admins.

---

### 2.3 Analytics Data Exposure

**Issue:** `GET /api/admin/comparables/analytics` returns property names, study IDs, and financial data. Access is restricted to managed users, but the data is sensitive.

**Recommendation:** Ensure analytics responses are not logged or cached. Consider adding audit logging for access to analytics data.

---

## 3. Issues & Improvements

### 3.1 Client-Side Auth Guard

**Issue:** `AdminAuthGuard` runs on the client. There is a brief flash where the layout renders before auth is verified. A user could see the layout structure before redirect.

**Recommendation:** Consider server-side auth in the layout (e.g., `getServerSession` or equivalent) and redirect before rendering the admin shell.

---

### 3.2 Error Message Consistency

**Issue:** Some API routes return generic errors (e.g., "Access denied") while others return more specific messages. Inconsistent error messages can aid enumeration.

**Recommendation:** Use consistent, generic messages for auth failures (401/403) in production.

---

### 3.3 Missing Input Validation

**Issue:** Some routes accept query params without strict validation:

- `comparables` route: `per_page` is clamped but `page` could be very large
- `sort_by` is validated against a whitelist ✅
- `state` and `unit_category` are split by comma but not validated for length

**Recommendation:** Add reasonable bounds (e.g., `page` max 1000, `per_page` max 100) and validate/sanitize string params.

---

### 3.4 File Upload Security

**Issue:** Uploads accept `.xlsx`, `.xlsm`, `.xlsxm`, `.docx`, `.doc`. Macros in `.xlsm` could theoretically be malicious if the files are ever opened in Excel.

**Recommendation:** Document that uploaded files are parsed programmatically and not executed. If users download and open files, consider warning about macro-enabled formats.

---

### 3.5 Logout Flow

**Issue:** `AdminSidebar` calls `fetch('/api/auth/logout', { method: 'POST' })` and `supabase.auth.signOut()`, then redirects to `/login`. The logout route exists at `app/api/auth/logout/route.ts`.

**Recommendation:** Ensure the logout route clears any server-side session state (e.g., cookies) in addition to Supabase sign-out.

---

## 4. Recommended Future Features

### 4.1 Audit Logging — ✅ Implemented

- **Table:** `admin_audit_log` (run `scripts/migrations/admin-audit-log.sql`)
- **Actions logged:** upload, edit, delete, download, re_extract
- **Page:** `/admin/audit-log` with filters (action, pagination)
- **API:** `GET /api/admin/audit-log`

### 4.2 Role-Based Access Control (RBAC)

- `managed_users` has `role: 'user' | 'admin' | 'editor'` but `isAdmin()` is not used for access control
- Consider: admin-only bulk upload, editor-only report edits, viewer-only analytics

### 4.3 Session Management

- Session timeout / idle logout
- "View as" or impersonation for admins (with audit trail)

### 4.4 Data Export Controls

- Bulk export of reports with optional PII redaction
- Audit trail for export downloads

### 4.5 Compare Mode (Planned)

- Per `docs/COMPARABLES_COMPARE_MODE_PLAN.md`, compare 2–4 comparables side-by-side
- Ensure compare mode respects user permissions if reports become user-scoped

### 4.6 Fuzzy Search Improvements

- Per `docs/COMPARABLES_FUZZY_SEARCH_SCOPE.md`, typo-tolerant search is in scope
- Ensure search does not expose data beyond intended scope

---

## 5. Positive Findings

| Area | Status |
|------|--------|
| OAuth + domain whitelist | ✅ `@sageoutdooradvisory.com`, `@sagecommercialadvisory.com` |
| Session check in middleware | ✅ Redirects unauthenticated users to `/login` |
| Managed user check | ✅ `AdminAuthGuard` and API routes use `isManagedUser()` |
| `X-Robots-Tag: noindex, nofollow` | ✅ Set on admin pages |
| `robots.txt` | ✅ Disallows `/admin/` |
| `metadata.robots` | ✅ `index: false, follow: false` on admin layout |
| Rate limiting on uploads | ✅ unified-upload, comparables/upload |
| Path validation in download | ✅ Rejects `..`, `/`, and invalid chars in download routes |
| Storage bucket | ✅ Private, MIME type restrictions |

---

## 6. Action Items Summary

| Priority | Item |
|----------|------|
| ~~High~~ | ~~Resolve IDOR~~ — Org-wide access is intentional; all `user_id` filters removed |
| ~~Medium~~ | ~~Sanitize filenames~~ — `lib/sanitize-filename.ts` + validation in presign, comparables, unified-upload |
| ~~Medium~~ | ~~Internal API key~~ — Rate limited (5/hr bulk-upload), code comments added |
| ~~Low~~ | ~~Redis rate limiting~~ — `checkRateLimitAsync()` uses Redis when available |
| Low | Add server-side auth to admin layout |
| ~~Low~~ | ~~Implement audit logging~~ — Done: `admin_audit_log` table, `/admin/audit-log` page |
