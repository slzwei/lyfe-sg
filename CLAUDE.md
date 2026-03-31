# Lyfe SG — ATS + Public Website

## Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | Next.js (App Router) | 16.2.0 |
| Language | TypeScript | ^5 (strict mode) |
| React | React + ReactDOM | 19.2.4 |
| Styling | Tailwind CSS v4 | ^4 |
| Backend | Supabase (Auth, DB, Storage, Realtime) | @supabase/supabase-js ^2.99.3, @supabase/ssr ^0.9.0 |
| Validation | Zod | ^4.3.6 |
| PDF | PDFKit | ^0.18.0 |
| Email | Nodemailer | ^8.0.3 |
| Testing | Vitest (unit), Playwright (E2E) | vitest ^4.1.0, @playwright/test ^1.58.2 |
| Error tracking | Sentry | @sentry/nextjs ^10.47.0 |
| Rate limiting | Upstash Redis (in-memory fallback) | @upstash/ratelimit, @upstash/redis |
| Hosting | Vercel (sin1 region — Singapore) | — |

## Folder Structure

```
lyfe-sg/
├── src/
│   ├── app/
│   │   ├── layout.tsx              Root layout (Plus Jakarta Sans + Pacifico fonts)
│   │   ├── page.tsx                "Coming Soon" landing page
│   │   ├── globals.css             Tailwind v4 theme (orange palette)
│   │   ├── api/
│   │   │   ├── upload-candidate-doc/route.ts   File upload for candidate docs (rate-limited)
│   │   │   └── upload-invite-doc/route.ts      File upload for invitation attachments (rate-limited)
│   │   ├── candidate/              Candidate-facing portal
│   │   │   ├── layout.tsx          Header with sign-out
│   │   │   ├── actions.ts          Auth (sendOtp, verifyOtp, validateInviteToken, signOut)
│   │   │   ├── login/page.tsx      Phone OTP login with invite token validation
│   │   │   ├── verify/page.tsx     6-digit OTP verification
│   │   │   ├── onboarding/         6-step application form
│   │   │   │   ├── page.tsx        Server component with auth guard
│   │   │   │   ├── actions.ts      saveProfile, saveDraft (auto-save)
│   │   │   │   ├── OnboardingForm.tsx  Multi-step form orchestrator
│   │   │   │   └── steps/          Step1Personal..Step6Declaration
│   │   │   ├── disc-quiz/          38-question DISC personality assessment
│   │   │   │   ├── page.tsx        Server component with progression guards
│   │   │   │   ├── actions.ts      submitDiscQuiz, saveQuizProgress
│   │   │   │   ├── DiscQuiz.tsx    Multi-step quiz UI
│   │   │   │   ├── questions.ts    38 questions in 3 formats (word pair, rating, scenario)
│   │   │   │   └── scoring.ts      Circumplex scoring, 13 result types, priorities
│   │   │   ├── disc-results/       Results visualization page
│   │   │   │   ├── page.tsx        Server component rendering results
│   │   │   │   ├── CircumplexChart.tsx  Interactive SVG circumplex chart
│   │   │   │   ├── ResultsLive.tsx Broadcasts "viewing-results" state
│   │   │   │   └── SignOutButton.tsx
│   │   │   ├── signed-out/page.tsx Confirmation page
│   │   │   ├── error.tsx           Error boundary
│   │   │   └── loading.tsx         Spinner
│   │   └── staff/                  Staff ATS portal
│   │       ├── layout.tsx          Nav with Dashboard/Candidates/Jobs links
│   │       ├── actions.ts          Auth + invitations + PDF backfill (~745 lines)
│   │       ├── login/page.tsx      Phone OTP + admin email/password
│   │       ├── verify/page.tsx     OTP verification for staff
│   │       ├── dashboard/          Stats overview
│   │       │   ├── actions.ts      getDashboardStats
│   │       │   └── DashboardClient.tsx  KPIs + DISC distribution chart
│   │       ├── invite/             Invitation management
│   │       │   └── InviteClient.tsx Send invites, track progress, manage files (~1054 lines)
│   │       ├── candidates/         Candidate pipeline
│   │       │   ├── actions.ts      CRUD + activities + documents + interviews (~613 lines)
│   │       │   ├── CandidatesClient.tsx  Pipeline tabs (All/Invited/Archived)
│   │       │   └── [id]/CandidateDetailClient.tsx  Detail view (~787 lines)
│   │       ├── jobs/               Job postings
│   │       │   ├── actions.ts      CRUD for jobs
│   │       │   └── JobsClient.tsx  Create/edit/close/delete jobs
│   │       └── components/LogoutButton.tsx
│   ├── components/                 Public website components (unused — Coming Soon page active)
│   │   ├── Navbar.tsx, Hero.tsx, About.tsx, Services.tsx
│   │   ├── WhyJoin.tsx, Contact.tsx, Footer.tsx, AnimateIn.tsx
│   │   └── ui/StepIndicator.tsx    Shared step progress indicator
│   ├── hooks/useInView.ts          IntersectionObserver hook
│   ├── lib/
│   │   ├── email.ts               Nodemailer with HTML templates
│   │   ├── pdf.ts                 PDFKit generators (profile + DISC)
│   │   ├── schemas/onboarding.ts  Zod schemas for 6-step form
│   │   ├── shared-types/          Shared with lyfe-app
│   │   │   ├── database.ts        Row types (User, PaManagerAssignment, etc.)
│   │   │   ├── database.types.ts  Auto-generated Supabase types (DO NOT EDIT)
│   │   │   ├── roles.ts           RBAC: capabilities, role checks
│   │   │   ├── recruitment.ts     Candidate, Interview, Activity, Document types
│   │   │   ├── event.ts           Event/Roadshow types (used by lyfe-app)
│   │   │   └── lead.ts            Lead types (used by lyfe-app)
│   │   └── supabase/
│   │       ├── admin.ts           Service-role client (singleton, bypasses RLS)
│   │       ├── client.ts          Browser client (anon key)
│   │       ├── server.ts          Server client (cookie-based session)
│   │       ├── proxy.ts           Middleware logic (session refresh + route guards)
│   │       ├── storage.ts         Storage helpers (3 buckets)
│   │       ├── progress-broadcast.ts  Realtime broadcast for candidate progress
│   │       └── database.types.ts  Re-export from shared-types
│   ├── proxy.ts                   Middleware entry point (exports `proxy` + config)
│   └── types/pdfkit.d.ts          Type declarations for PDFKit
├── tests/e2e/                     Playwright E2E tests
├── scripts/                       Admin scripts (seed, reset-pw, test-email)
├── docs/DISC_QUIZ_SPEC.md         Detailed DISC quiz specification
└── public/images/                 Static assets
```

## Routing Architecture

### Public Routes
| Route | Description |
|-------|-----------|
| `/` | Coming Soon page (email capture, no backend) |

### Candidate Routes (protected — require candidate role)
| Route | Guard | Description |
|-------|-------|-----------|
| `/candidate/login` | Public (redirects if already logged in) | Invite-only phone OTP login |
| `/candidate/verify` | sessionStorage phone check | OTP verification |
| `/candidate/onboarding` | Auth + candidate role | 6-step application form |
| `/candidate/disc-quiz` | Auth + profile completed | 38-question DISC quiz |
| `/candidate/disc-results` | Auth + quiz completed | Results + sign out |
| `/candidate/signed-out` | Public | Confirmation page |

### Staff Routes (protected — require staff role)
| Route | Guard | Description |
|-------|-------|-----------|
| `/staff/login` | Public | Phone OTP or admin email/password |
| `/staff/verify` | sessionStorage phone check | Staff OTP verification |
| `/staff/dashboard` | Staff auth | KPIs, DISC distribution, recent candidates |
| `/staff/invite` | Staff auth | Send invitations, track progress, manage files |
| `/staff/candidates` | Staff auth | Pipeline view (All/Invited/Archived) |
| `/staff/candidates/[id]` | Staff auth | Candidate detail + activities + interviews |
| `/staff/jobs` | Staff auth | Job postings CRUD |

### API Routes
| Route | Method | Description |
|-------|--------|-----------|
| `/api/upload-candidate-doc` | POST | Upload docs for candidates (staff only) |
| `/api/upload-invite-doc` | POST | Attach docs to invitations (staff only) |

## Role & Auth System

### Roles (from Supabase `user_role` enum)
```
admin > director > manager > agent | pa | candidate
```

### Auth Methods
- **Candidates**: Phone OTP only (SG +65 numbers). Invite token required for first login.
- **Staff (OTP)**: Phone OTP for pa/manager/director roles. Verified against `app_metadata.role`.
- **Staff (Admin)**: Email + password for admin role only.
- **Legacy**: `staff_session` cookie fallback (transition period — should be removed).

### Proxy / Middleware (`src/proxy.ts`)
- Next.js 16 renamed `middleware.ts` → `proxy.ts`. File correctly exports named `proxy` function.
- Matcher: `/candidate/:path*` and `/staff/:path*`
- Staff routes: checks Supabase Auth session first, falls back to legacy `staff_session` cookie
- Candidate routes: enforces candidate role, redirects to login if unauthenticated

### Server-Side Auth Pattern
All server actions use `requireStaff(minRole?)` which:
1. Checks Supabase Auth session via cookie
2. Validates role is in `STAFF_ROLES` (pa, manager, director, admin)
3. Enforces minimum role level when specified
4. Falls back to legacy cookie (no role — denied if minRole required)

### Capability-Based Permissions
Defined in `src/lib/shared-types/roles.ts`:
- `hold_agents`, `reassign_leads`, `reassign_leads_globally`, `reassign_candidates`
- `invite_agents`, `create_candidates`, `schedule_interviews`
- `view_admin`, `view_team`, `view_leads`, `view_candidates`

## ATS Pipeline Architecture

### Candidate Journey
```
Invite Sent → Login → OTP Verify → Onboarding (6 steps) → DISC Quiz (5 steps) → Results → Sign Out
```

### Candidate Status Enum (`candidate_status`)
Used in `candidates.status` field. Values defined in DB enum. Status auto-syncs to `users.lifecycle_stage` via DB trigger `sync_candidate_status_to_lifecycle`.

### Dual Record System
Candidates exist in two places:
1. **`invitations`** — Created when staff sends invite. Tracks token, email, progress, PDFs.
2. **`candidates`** — ATS pipeline record. Created when candidate accepts invite and verifies OTP.

These are linked via `invitations.candidate_record_id → candidates.id` and `candidate_profiles.candidate_id → candidates.id`.

### Interview System
- Managed via `interviews` table (candidate_id, manager_id, scheduled_by_id)
- Supports rounds, types (zoom/in_person), and recommendations (second_interview/on_hold/pass)

### Activity Tracking
- `candidate_activities` — call, whatsapp, note with outcomes (reached/no_answer/sent)

### Document Management
- 3 storage buckets: `candidate-pdfs` (generated), `candidate-resumes` (invite attachments), `candidate-documents` (uploaded docs)
- 12 document labels: Resume, RES5, M5, M9, M9A, HI, M8, M8A, ComGI, BCP, PGI, Other

## Supabase Tables — Ownership

### Tables THIS system WRITES to:
| Table | Operations | Notes |
|-------|-----------|-------|
| `invitations` | CRUD | Invitation lifecycle, PDF paths, attached files |
| `candidates` | INSERT, UPDATE | Created on invite accept, reassignment |
| `candidate_profiles` | UPSERT, UPDATE | Onboarding form data (50+ fields) |
| `candidate_activities` | INSERT | Staff activity logs (call/whatsapp/note) |
| `candidate_documents` | INSERT, DELETE | Uploaded documents metadata |
| `disc_responses` | UPSERT, DELETE | Raw quiz answers (auto-saved) |
| `disc_results` | UPSERT, DELETE | Calculated DISC scores |
| `jobs` | CRUD | Job postings |
| `interviews` | UPDATE | Interview feedback/recommendation |
| `notifications` | INSERT | Assignment/reassignment notifications |
| `users` | UPDATE | last_login_at |
| `pipeline_stages` | SELECT | Read only — resolve first stage for job |
| `staff_sessions` | SELECT | Legacy auth check |

### Tables THIS system READS from (owned by lyfe-app):
| Table | Purpose |
|-------|---------|
| `users` | Staff profiles, manager lookup |
| `pa_manager_assignments` | PA → manager mapping |
| `pipeline_stages` | Job pipeline stages |

### Tables NOT used by this system:
`leads`, `lead_activities`, `events`, `event_attendees`, `roadshow_*`, `roadmap_*`, `exam_*`, `candidate_module_*`, `candidate_programme_enrollment`, `progress_signals` (DB table — app uses Realtime broadcast channel instead)

## Relationship to lyfe-app

- **Shared database**: Same Supabase project (nvtedkyjwulkzjeoqjgx)
- **Shared types**: `src/lib/shared-types/` contains types used by both apps
- **Migrations**: ALL in lyfe-app/supabase/migrations/ — never add migrations here
- **Type generation**: Run `npm run gen:types` from root lyfe/ directory
- **Real-time sync**: Both apps use Supabase Realtime broadcast channel "candidate-progress"
- **Push notifications**: `notifications` INSERT triggers edge function → Expo Push API (mobile)
- **Users table**: Shared. Auth users created in either app appear in both.

## Security & Rate Limiting

### Rate Limits (via `checkRateLimitAsync` in `src/lib/rate-limit.ts`)

| Endpoint | Key | Limit | Window |
|----------|-----|-------|--------|
| Candidate OTP send | `candidate-otp:{ip}` | 5 | 1 min |
| Candidate OTP verify | `verify-otp:{ip}` | 10 | 1 min |
| Staff login (email) | `staff-login:{ip}` | 5 | 1 min |
| Staff OTP send | `staff-otp:{ip}` | 5 | 1 min |
| Staff OTP verify | `staff-verify-otp:{ip}` | 10 | 1 min |
| Send invitation | `send-invite:{staffId}` | 20 | 1 hour |
| Upload candidate doc | `upload-doc:{staffId}` | 30 | 1 hour |
| Upload invite doc | `upload-invite:{staffId}` | 30 | 1 hour |
| Waitlist signup | `waitlist:{ip}` | 3 | 1 hour |

Uses Upstash Redis when `UPSTASH_REDIS_REST_URL` is set; falls back to per-instance in-memory.

### Access Control Patterns

- **Team scoping**: `verifyCandidateAccess(candidateId, staff)` in `candidates/actions.ts` — checks `getTeamManagerIds()` for role-based candidate visibility
- **Interview endpoints**: All 3 (get/schedule/feedback) verify candidate access
- **File operations**: `removeInviteFile` checks `invited_by_user_id` ownership or manager+ role
- **Input validation**: All staff actions enforce max lengths (255 for names, 10K for text, 2K for URLs)
- **Enum validation**: Activity types (`call/whatsapp/note`), outcomes (`reached/no_answer/sent`), recommendations (`second_interview/on_hold/pass`) validated server-side

### Error Tracking (Sentry)

- Configured via `sentry.{client,server,edge}.config.ts` + `instrumentation.ts`
- `global-error.tsx` captures root-level unhandled errors
- `after()` blocks in disc-quiz and onboarding actions call `Sentry.captureException()` for PDF/email failures
- CSP allows `connect-src` to `*.sentry.io` and `*.ingest.sentry.io`
- Inactive until `NEXT_PUBLIC_SENTRY_DSN` is set

## Naming Conventions & Code Patterns

- **Server Actions**: `"use server"` files in each route directory's `actions.ts`
- **Client Components**: `"use client"` with `ComponentClient.tsx` naming
- **Page Components**: Server components that fetch data and pass to client
- **Auth Pattern**: `requireStaff(minRole?)` for staff actions; `supabase.auth.getUser()` for candidates
- **Admin Client**: `getAdminClient()` singleton — bypasses RLS for privileged operations
- **Error Handling**: Server actions return `{ success, error?, data? }` objects
- **Form Validation**: Zod schemas in `src/lib/schemas/` validated client-side before server action
- **Storage Paths**: `{userId}/{type}.pdf` for PDFs, `invitations/{id}/docs/` for invite files, `candidates/{id}/` for candidate docs

## Known Technical Debt

1. ~~Middleware naming~~: Fixed — Next.js 16 renamed `middleware.ts` → `proxy.ts`.
2. **Legacy auth**: `staff_session` cookie fallback in proxy should be removed after migration. Note: `requireStaff()` in `auth.ts` no longer has legacy fallback.
3. **Contact form stub**: `src/components/Contact.tsx` form handler sets state but doesn't submit anywhere.
4. **Public website unused**: Components exist (Navbar, Hero, About, etc.) but root page is "Coming Soon".
5. ~~**Hardcoded admin email**~~: Fixed — reads `NOTIFY_EMAIL` and `NOTIFY_BCC` env vars.
6. **Font file dependency**: `src/lib/pdf.ts` loads Pacifico font via `fs.readFileSync()` — may fail in serverless.
7. ~~**Team isolation**~~: Fixed — all candidate endpoints use `verifyCandidateAccess()`. PA scoping via `pa_manager_assignments` deferred (only 1 PA in prod).
8. **Pipeline stages unused**: `pipeline_stages` table has 0 rows; `candidates.current_stage_id` is always null.
9. ~~**Dashboard "completed" metric**~~: Fixed — now counts candidates with completed profile AND DISC results. Dashboard uses COUNT aggregates.
10. ~~**Supabase RLS gaps**~~ — Fixed via migration.
11. ~~**9 DB functions have mutable search_path**~~ — Fixed via migration.
12. **Leaked password protection disabled** in Supabase Auth settings.

### Deferred DB migrations (need lyfe-app repo)
- `remove_invitation_file` RPC — atomic JSONB array removal (currently validated client-side)
- `UNIQUE(candidate_id, round_number)` on `interviews` — retry logic in place as interim fix
- `accept_invitation` RPC — atomic invitation acceptance (currently uses UPDATE...WHERE...RETURNING)
- `jsonb_object_length()` computed column for quiz progress counting

## Environment Variables Required

```
NEXT_PUBLIC_SUPABASE_URL     — Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY — Supabase anon/public key
SUPABASE_SERVICE_ROLE_KEY    — Service role key (server-side only)
NEXT_PUBLIC_SITE_URL         — Public URL (default: https://lyfe.sg)
EMAIL_HOST                   — SMTP host
EMAIL_PORT                   — SMTP port
EMAIL_USER                   — SMTP username
EMAIL_PASSWORD               — SMTP password
EMAIL_FROM                   — Sender address (default: EMAIL_USER or noreply@lyfe.sg)
STAFF_SECRET                 — Legacy staff auth secret (deprecated)
E2E_BASE_URL                 — Playwright base URL (default: http://localhost:3000)
NEXT_PUBLIC_SENTRY_DSN       — Sentry DSN for error tracking (optional — inactive if unset)
UPSTASH_REDIS_REST_URL       — Upstash Redis URL for distributed rate limiting (optional — falls back to in-memory)
UPSTASH_REDIS_REST_TOKEN     — Upstash Redis token (required with URL above)
```

## Scripts

```bash
npm run dev           # Start Next.js dev server
npm run build         # Production build
npm run lint          # ESLint
npm run test          # Vitest unit tests
npm run test:coverage # Vitest with coverage
npm run test:e2e      # Playwright E2E tests
npm run test:e2e:ui   # Playwright with UI mode
```
