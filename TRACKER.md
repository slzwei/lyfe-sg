# Lyfe SG — TRACKER

> Audit date: 2026-03-23
> Auditor: Claude Opus 4.6

## Status Key

| Code | Meaning |
|------|---------|
| DONE | Fully implemented, working |
| BUGGY | Implemented but has bugs |
| PARTIAL | Some functionality missing |
| STUB | Code exists but doesn't work |
| NONE | Not implemented |

---

## Feature Matrix — Public Website

| Feature | Status | Notes |
|---------|--------|-------|
| Landing page | DONE | "Coming Soon" page with email capture (client-side only, no backend) |
| About section | STUB | Component exists (`About.tsx`) but not rendered — root page is Coming Soon |
| Services section | STUB | Component exists (`Services.tsx`) — 6 insurance service cards |
| Why Join section | STUB | Component exists (`WhyJoin.tsx`) — recruitment pitch |
| Contact form | STUB | Component exists (`Contact.tsx`) — **form handler doesn't submit data anywhere** |
| Navbar | STUB | Component exists (`Navbar.tsx`) — not rendered on Coming Soon page |
| Footer | STUB | Component exists (`Footer.tsx`) — not rendered |
| Hero | STUB | Component exists (`Hero.tsx`) — not rendered |
| SEO / Metadata | DONE | OpenGraph tags, keywords, title set in root layout |
| Mobile responsive | DONE | Tailwind responsive classes throughout |
| Email capture | DONE | Server action notifies admin via email; loading + error states shown |
| Privacy policy | NONE | No privacy policy page |
| Terms of service | NONE | No terms page |
| Sitemap | NONE | No sitemap.xml |
| Favicon | NONE | No custom favicon configured |
| Analytics | NONE | No analytics (GA, Vercel Analytics, etc.) |

---

## Feature Matrix — ATS (Candidate Portal)

| Feature | Status | Notes |
|---------|--------|-------|
| Invite-only registration | DONE | Token-based invitations with email delivery |
| Phone OTP auth | DONE | SG (+65) numbers only via Supabase Auth |
| OTP verification | DONE | 6-digit code, auto-submit, paste support, resend with cooldown |
| Session management | DONE | Cookie-based Supabase session, sign out clears |
| Onboarding form (6 steps) | DONE | Personal, NS, Education, Skills, Employment, Declaration |
| Auto-save drafts | DONE | Saves on step navigation via `saveDraft()` |
| Postal code lookup | DONE | OneMap API auto-fills block/street from postal code |
| NS conditional logic | DONE | Shows NS section only for SG/PR males |
| Zod validation | DONE | Per-step schemas with field-level errors |
| DISC quiz (38 questions) | DONE | 3 formats across 5 steps: word pairs, single-word ratings, scenarios |
| Quiz auto-save | DONE | Saves after every answer change |
| Quiz progress recovery | DONE | Loads saved responses on page revisit |
| DISC scoring engine | DONE | Circumplex model, 12+1 types, independent 0-100 scales |
| DISC results display | DONE | SVG circumplex chart, score bars, priorities, strengths/blind spots |
| Profile PDF generation | DONE | PDFKit with Pacifico font, uploaded to storage |
| DISC PDF generation | DONE | PDFKit with circumplex chart rendering |
| Email notifications | DONE | Invitation, profile submission, DISC results emails |
| Real-time progress broadcast | DONE | Supabase Realtime channel for staff portal |
| Route guards | DONE | Server-side redirects enforce linear progression |
| Error boundary | DONE | Custom error page with retry |
| Loading states | DONE | Spinner + skeleton loaders |
| Calculating overlay | DONE | Animated progress bar during quiz submission |

---

## Feature Matrix — ATS (Staff Portal)

| Feature | Status | Notes |
|---------|--------|-------|
| Staff phone OTP login | DONE | Validates staff role in app_metadata |
| Admin email/password login | DONE | Restricted to admin role only |
| Legacy cookie auth | PARTIAL | Transition fallback — should be removed. No role enforcement. |
| Dashboard KPIs | DONE | Total candidates, completed, pending, active jobs |
| DISC distribution chart | DONE | Bar chart of DISC types across all candidates |
| Recent candidates list | DONE | Last 5 candidates with status badges |
| Send invitations | DONE | Email + name + position + optional job + manager assignment |
| File attachment on invite | DONE | PDF upload to invitation (max 5MB, 20 files) |
| Invitation list | DONE | All invitations with status, progress tracking |
| Real-time progress updates | DONE | Supabase Realtime + fallback polling |
| PDF download (profile) | DONE | Signed URL generation for staff |
| PDF download (DISC) | DONE | Signed URL generation for staff |
| PDF backfill | DONE | One-time backfill for pre-existing candidates without PDFs |
| Revoke invitation | DONE | Manager+ only. Sets status to "revoked". |
| Reset quiz | DONE | Manager+ only. Deletes disc_results + disc_responses. |
| Reset application | DONE | Manager+ only. Resets profile + deletes quiz data. |
| Archive invitation | DONE | Manager+ only. Soft archive via archived_at. |
| Delete candidate | DONE | Admin only. Cascading delete via RPC + auth user deletion. |
| Candidate pipeline view | DONE | Tabs: All Candidates, Invited, Archived |
| Candidate search | DONE | Name/phone/email search across candidates + invitations |
| Candidate detail view | DONE | Profile, DISC results, interviews, activities, documents |
| Activity logging | DONE | Call/WhatsApp/Note with outcomes |
| Document upload | DONE | Multi-type upload (PDF, JPG, PNG, DOCX) with labels |
| Document download | DONE | Signed URLs for candidate documents |
| Document deletion | DONE | Manager+ only |
| Interview management | DONE | Schedule interviews (pa/manager+), update feedback/recommendation |
| Candidate reassignment | DONE | Manager+ can reassign to different manager with email notification |
| Job postings CRUD | DONE | Create, edit, close, delete with portal tracking |
| Pipeline stages | NONE | `pipeline_stages` table has 0 rows. Stage tracking not implemented in UI. |
| Role-based nav/visibility | PARTIAL | Nav shows all links to all staff. Action buttons hidden by role on some pages. |
| Manager assignment for PAs | DONE | PAs see only their assigned managers in dropdown |
| Team filtering | DONE | Admin/director see all; manager sees own; PA sees assigned managers' candidates |

---

## Role-Feature Matrix — Staff

| Feature | admin | director | manager | agent | pa |
|---------|-------|----------|---------|-------|----|
| View dashboard | Y | Y | Y | Y | Y |
| View all candidates | Y | Y | Y | Y | Y |
| View candidate detail | Y | Y | Y | Y | Y |
| Send invitations | Y | Y | Y | N | Y |
| Assign manager on invite | Y | Y | Y | N | Y (scoped to assigned managers) |
| Upload documents | Y | Y | Y | N | Y |
| Add activities (call/note) | Y | Y | Y | Y | Y |
| Revoke invitation | Y | Y | Y | N | N |
| Reset quiz/application | Y | Y | Y | N | N |
| Archive invitation | Y | Y | Y | N | N |
| Delete candidate | Y | N | N | N | N |
| Create/edit jobs | Y | Y | Y | N | N |
| Close/delete jobs | Y | Y | Y | N | N |
| Reassign candidates | Y | Y | Y | N | N |
| Update interview feedback | Y | Y | Y | N | N |
| Edit candidate info | Y | Y | Y | N | N |

---

## Bug Log

### Critical

| # | Bug | Location | Impact |
|---|-----|----------|--------|
| ~~B1~~ | ~~**Middleware may not execute**~~ — **FALSE ALARM**: Next.js 16 renamed `middleware.ts` to `proxy.ts` and `middleware` export to `proxy`. The file is correct. | `src/proxy.ts` | N/A — working as designed |
| ~~B2~~ | ~~**Hardcoded admin email**~~: Moved to `NOTIFY_EMAIL` / `NOTIFY_BCC` env vars with hardcoded fallback. | `src/lib/email.ts:234` | **RESOLVED** |
| ~~B3~~ | ~~**invitations table has NO RLS policies**~~: Added 5 policies — staff SELECT/INSERT/UPDATE, candidate SELECT own, admin DELETE. | Supabase DB | **RESOLVED** |
| ~~B4~~ | ~~**staff_sessions table has NO RLS policies**~~: Added staff SELECT policy. Table is deprecated (no user_id column), so read-only for staff is sufficient. | Supabase DB | **RESOLVED** |

### High

| # | Bug | Location | Impact |
|---|-----|----------|--------|
| ~~B5~~ | ~~**Email capture on landing page doesn't save**~~: Added server action `subscribeEmail()` that emails admin (NOTIFY_EMAIL) on signup. Page shows loading/error states. | `src/app/actions.ts` + `src/app/page.tsx` | **RESOLVED** |
| B6 | **Contact form doesn't submit**: `handleSubmit` prevents default and sets state but never posts data. | `src/components/Contact.tsx:9` | Broken contact form |
| ~~B7~~ | ~~**Year string comparison bug in education validation**~~: Code already uses `Number()` conversion at line 145. Bug was not present at time of audit. | `src/lib/schemas/onboarding.ts:145` | **RESOLVED** — false alarm |
| ~~B8~~ | ~~**File upload path traversal**~~: Routes now sanitize filenames (strip non-alphanumeric) and validate IDs as UUIDs. Storage layer already had sanitization — this adds defense-in-depth. | `src/app/api/upload-*/route.ts` | **RESOLVED** |
| ~~B9~~ | ~~**9 DB functions have mutable search_path**~~: Applied migration `fix_mutable_search_path_on_9_functions` — all 9 functions now have `SET search_path = ''` and fully-qualified table references. | Supabase DB | **RESOLVED** |
| B10 | **Leaked password protection disabled**: Supabase Auth not checking passwords against HaveIBeenPwned. | Supabase Auth config | Weak password risk for admin accounts |

### Medium

| # | Bug | Location | Impact |
|---|-----|----------|--------|
| ~~B11~~ | ~~**Dashboard "Completed" count is misleading**~~: Now counts candidates who have BOTH `candidate_profiles.completed = true` AND a `disc_results` record. Recent candidates list also uses the same logic. | `src/app/staff/dashboard/actions.ts:64` | **RESOLVED** |
| B12 | **Font file load may fail in serverless**: `fs.readFileSync()` loads Pacifico font at runtime. May fail in Vercel edge/serverless if font file not included in build output. | `src/lib/pdf.ts:7` | PDF generation failure |
| ~~B13~~ | ~~**No team isolation**~~: Added `getTeamManagerIds()` helper. `searchCandidates()` and `getCandidate()` now filter by `assigned_manager_id` — admin/director see all, manager sees own, PA sees assigned managers' candidates. | `src/app/staff/candidates/actions.ts` | **RESOLVED** |
| ~~B14~~ | ~~**Invite file attachment race condition**~~: Replaced read-modify-write with `append_invitation_file` RPC using `SELECT ... FOR UPDATE` row lock. Concurrent uploads are now serialized at the DB level. Migration: `add_append_invitation_file_rpc`. | `src/app/api/upload-invite-doc/route.ts` | **RESOLVED** |
| ~~B15~~ | ~~**Upload MIME type check client-side only**~~: Both upload routes now validate file magic bytes server-side before uploading. Candidate doc route checks PDF/JPEG/PNG/DOC/DOCX signatures; invite doc route checks PDF signature. Client-side check retained as UX convenience. | `src/app/api/upload-*/route.ts` | **RESOLVED** |
| B16 | **Pipeline stages table empty**: `pipeline_stages` has 0 rows despite being referenced in candidate creation logic. `candidates.current_stage_id` is always null. | DB + `src/app/candidate/actions.ts:240` | Dead feature |
| B17 | **pg_trgm extension in public schema**: Should be moved to a separate schema per Supabase security recommendation. | Supabase DB | Security best practice violation |

### Low

| # | Bug | Location | Impact |
|---|-----|----------|--------|
| B18 | **No MFA options enabled**: Supabase Auth has insufficient MFA options. | Supabase Auth config | Weaker account security |
| B19 | **Job close overwrites timestamp**: Calling `updateJobPosting` with status "closed" multiple times overwrites `closed_at`. Should check if already closed. | `src/app/staff/jobs/actions.ts:111` | Minor data integrity |
| B20 | **Date of birth validation uses toDateString()**: Loses timezone context when comparing dates. | `src/lib/schemas/onboarding.ts:10-11` | Edge case date validation failure |

---

## Shared Supabase Tables

| Table | Rows | Owner | lyfe-sg | lyfe-app | Notes |
|-------|------|-------|---------|----------|-------|
| `users` | 55 | lyfe-app | R/W (last_login_at) | R/W | Shared auth users |
| `candidates` | 9 | lyfe-sg | R/W | R | ATS pipeline records |
| `candidate_profiles` | 6 | lyfe-sg | R/W | R | 50+ field onboarding form |
| `candidate_activities` | 1 | lyfe-sg | R/W | R | Activity logs |
| `candidate_documents` | 3 | lyfe-sg | R/W | R | Document metadata |
| `disc_responses` | 6 | lyfe-sg | R/W | — | Raw quiz answers |
| `disc_results` | 6 | lyfe-sg | R/W | R | Calculated scores |
| `invitations` | 2 | lyfe-sg | R/W | — | Invite lifecycle |
| `interviews` | 0 | lyfe-sg | R/W | R | Interview records |
| `jobs` | 3 | lyfe-sg | R/W | — | Job postings |
| `pipeline_stages` | 0 | lyfe-sg | R | — | Job pipeline stages (unused) |
| `notifications` | 17 | Shared | W | R/W | Push + in-app notifications |
| `pa_manager_assignments` | 1 | lyfe-app | R | R/W | PA → manager mapping |
| `staff_sessions` | 2 | lyfe-sg | R | — | Legacy auth (deprecated) |
| `progress_signals` | 1 | Shared | — | R/W | Realtime sync trigger |
| `leads` | 6 | lyfe-app | — | R/W | Lead management |
| `lead_activities` | 10 | lyfe-app | — | R/W | Lead activity logs |
| `events` | 60 | lyfe-app | — | R/W | Agency events |
| `event_attendees` | 444 | lyfe-app | — | R/W | Event attendees |
| `roadshow_*` | 0 | lyfe-app | — | R/W | Roadshow management |
| `roadmap_*` | 2-25 | lyfe-app | — | R/W | Training roadmap |
| `candidate_module_*` | 0-1 | lyfe-app | — | R/W | Training progress |
| `candidate_programme_enrollment` | 0 | lyfe-app | — | R/W | Programme enrollment |
| `exam_*` | 3-207 | lyfe-app | — | R/W | Exam system |
| `stage_transitions` | 0 | lyfe-sg | — | — | Empty, possibly deprecated |
| `roadmap_prerequisites` | 0 | lyfe-app | — | R/W | Module prerequisites |
| `roadmap_resources` | 0 | lyfe-app | — | R/W | Learning resources |

### Storage Buckets
| Bucket | Owner | Purpose |
|--------|-------|---------|
| `candidate-pdfs` | lyfe-sg | Generated application + DISC PDFs |
| `candidate-resumes` | lyfe-sg | Documents attached to invitations |
| `candidate-documents` | lyfe-sg | Documents uploaded on candidate detail |

---

## Priority Queue — Top 10 Next Actions

| # | Priority | Action | Why |
|---|----------|--------|-----|
| ~~1~~ | ~~**CRITICAL**~~ | ~~Fix middleware~~ — FALSE ALARM. Next.js 16 uses `proxy.ts` convention. Working correctly. | N/A |
| ~~2~~ | ~~**CRITICAL**~~ | ~~Move hardcoded email to env var `NOTIFY_EMAIL`~~ — DONE | Resolved |
| ~~3~~ | ~~**HIGH**~~ | ~~Fix 9 DB functions with mutable search_path~~ — DONE. Migration `fix_mutable_search_path_on_9_functions` applied. | Resolved |
| ~~4~~ | ~~**HIGH**~~ | ~~Add RLS policies to `invitations` and `staff_sessions` tables~~ — DONE. Migration `add_rls_policies_invitations_and_staff_sessions` applied. | Resolved |
| ~~5~~ | ~~**HIGH**~~ | ~~Sanitize file names in upload routes~~ — DONE. Added `sanitizeFileName()` + UUID validation in both routes. | Resolved |
| 6 | **HIGH** | Enable leaked password protection in Supabase Auth | Admin password security |
| ~~7~~ | ~~**MEDIUM**~~ | ~~Implement interview scheduling UI~~ — DONE. Added `scheduleInterview` server action + scheduling form on candidate detail page. PA/manager/director/admin can schedule. | Resolved |
| ~~8~~ | ~~**MEDIUM**~~ | ~~Add team-scoped candidate filtering for non-admin roles~~ — DONE. `getTeamManagerIds()` scopes `searchCandidates` + `getCandidate` by role. | Resolved |
| ~~9~~ | ~~**MEDIUM**~~ | ~~Wire up landing page email capture to a backend~~ — DONE. Server action sends notification to NOTIFY_EMAIL on signup. | Resolved |
| ~~10~~ | ~~**MEDIUM**~~ | ~~Fix year string comparison in onboarding schema validation~~ — Already uses `Number()`. False alarm. | Resolved |
| ~~11~~ | ~~**MEDIUM**~~ | ~~Fix dashboard "Completed" KPI to require both profile + DISC~~ — DONE. `completedCount` now checks `candidate_profiles.completed` AND `disc_results` exist. Recent candidates list uses same logic. | Resolved |
| ~~12~~ | ~~**MEDIUM**~~ | ~~Add server-side magic byte validation to upload routes~~ — DONE. Both `upload-candidate-doc` and `upload-invite-doc` now validate file signatures (PDF %PDF, JPEG FFD8FF, PNG 89504E47, DOC D0CF11E0, DOCX PK header) before uploading. | Resolved |

---

## Audit Progress

- **Last file/folder examined:** All source files in `src/`, `tests/`, `scripts/`, `docs/`, root configs. All Supabase MCP queries (tables, security advisors).
- **Files/folders left to audit:**
  - `tests/e2e/` — E2E test specs read structurally but not line-by-line analyzed for coverage gaps
  - `scripts/` — Utility scripts (seed-admin, reset-admin-pw, test-email, generate-staff-guide, lyfe_pdf_template) — not production code
  - `src/lib/shared-types/database.types.ts` — remaining 500+ lines of auto-generated types (tables after `roadmap_modules`)
  - Performance advisors from Supabase (output was too large to read inline)
- **Open questions to verify next session:**
  1. Does Next.js 16 support `proxy` as an alternative middleware export name? Or is `middleware.ts` still required?
  2. Are pipeline stages intended to be used? If so, need to seed data and build stage management UI.
  3. Is team isolation intentionally absent, or should candidates be scoped to manager teams?
  4. Is the legacy `staff_session` cookie still needed, or can it be removed?
  5. What is the intended behavior for `stage_transitions` table (0 rows)?
- **Estimated completion: 92% done** — All production code read. Remaining items are test coverage analysis, script review, and Supabase performance advisors.
