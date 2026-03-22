@AGENTS.md

# Lyfe SG

Web-based ATS (Applicant Tracking System) and candidate onboarding portal for a Singapore insurance agency.

## Stack

- **Framework**: Next.js 16.2, React 19, TypeScript 5
- **Styling**: Tailwind CSS 4, custom orange theme, Plus Jakarta Sans + Pacifico fonts
- **Backend**: Supabase (Postgres, Auth, Storage, Realtime) — shared with lyfe-app
- **Validation**: Zod 4
- **Email**: Nodemailer (Gmail SMTP)
- **PDFs**: PDFKit (server-side generation)
- **Testing**: Vitest (unit), Playwright (E2E)
- **Deploy**: Vercel, sin1 region (Singapore)

## Project Structure

```
src/
├── app/
│   ├── layout.tsx                 # Root layout (fonts, metadata)
│   ├── globals.css                # Tailwind theme (orange palette, fonts)
│   ├── page.tsx                   # Marketing homepage
│   ├── api/
│   │   └── upload-invite-doc/     # POST — staff upload PDFs to invitations
│   ├── candidate/                 # Candidate-facing portal
│   │   ├── login/                 # Phone OTP login
│   │   ├── verify/                # OTP verification + invite token handling
│   │   ├── onboarding/            # Multi-step profile form (5 steps)
│   │   │   ├── actions.ts         # saveProfile() — upsert + PDF gen + email
│   │   │   └── steps/             # Individual form step components
│   │   ├── disc-quiz/             # 38-question DISC assessment
│   │   │   ├── actions.ts         # submitDiscQuiz() — score + save + PDF + email
│   │   │   └── scoring.ts         # DISC calculation logic
│   │   ├── disc-results/          # Results display with circumflex chart
│   │   ├── actions.ts             # sendOtp, verifyOtp, validateInviteToken
│   │   └── signed-out/            # Post-logout landing
│   └── staff/                     # Staff ATS portal
│       ├── login/                 # Email/password (admin) or phone OTP (others)
│       ├── verify/                # OTP verification for staff
│       ├── dashboard/             # Overview with stats
│       ├── invite/                # Send candidate invitations
│       ├── jobs/                  # Job listings management
│       ├── candidates/            # Candidate pipeline
│       │   ├── [id]/              # Candidate detail (profile, DISC, interviews, docs)
│       │   └── actions.ts         # getCandidate, searchCandidates, addActivity, etc.
│       ├── actions.ts             # Auth guards, invite CRUD, PDF management
│       └── components/            # Staff-specific UI components
├── components/                    # Shared components (Hero, Navbar, Footer, etc.)
├── hooks/
│   └── useInView.ts               # IntersectionObserver hook
├── lib/
│   ├── supabase/
│   │   ├── client.ts              # Browser client (anon key)
│   │   ├── server.ts              # Server client (anon key + cookies, RLS enforced)
│   │   ├── admin.ts               # Admin client (service-role key, RLS BYPASSED)
│   │   ├── proxy.ts               # Middleware session management
│   │   ├── storage.ts             # Supabase Storage helpers
│   │   ├── database.types.ts      # Auto-generated types — DO NOT hand-edit
│   │   └── progress-broadcast.ts  # Realtime progress_signals helper
│   ├── email.ts                   # Nodemailer config + HTML email templates
│   ├── pdf.ts                     # PDFKit generation (profile + DISC PDFs)
│   └── schemas/
│       └── onboarding.ts          # Zod validation for onboarding form
├── types/
│   └── pdfkit.d.ts
└── middleware.ts                   # Auth routing (staff, candidate, public)
```

## Auth System

### Candidate Flow
1. Receive invite email with link → `/invite/{token}`
2. Phone OTP login → Supabase Auth
3. `assign_candidate_role` RPC sets role in `auth.users.app_metadata`
4. Auto-create `candidates` + `candidate_profiles` records linked to invitation
5. Protected routes: `/candidate/onboarding`, `/candidate/disc-quiz`, `/candidate/disc-results`

### Staff Flow
1. Admin: email + password login
2. Other roles (PA, manager, director): phone OTP login
3. Verify role in `app_metadata` → must be pa/manager/director/admin
4. Legacy fallback: `staff_session` cookie checked against `STAFF_SECRET` env var (being phased out)
5. Protected routes: all `/staff/*` except login/verify

### Auth Guards
- **Middleware** (`src/middleware.ts`): route-level protection, redirects unauthenticated users
- **`requireStaff(minRole?)`**: server action guard — returns `StaffUser | null`
  - `requireStaff()` — any staff role
  - `requireStaff("manager")` — manager, director, or admin only
  - `requireStaff("admin")` — admin only
- Role hierarchy for guards: `pa < manager < director < admin`

## Supabase Clients

| Import | Key Type | RLS | Use For |
|--------|----------|-----|---------|
| `lib/supabase/client.ts` | Anon | Enforced | Browser components, Realtime subscriptions |
| `lib/supabase/server.ts` | Anon + cookies | Enforced | Server actions, server components |
| `lib/supabase/admin.ts` | Service-role | **Bypassed** | Privileged ops: delete candidates, archive invitations, update PDFs |

## Server Action Patterns

All server actions follow this pattern:
```typescript
"use server"
export async function doThing(input): Promise<{ success: boolean; error?: string; data?: T }> {
  const staff = await requireStaff("manager"); // auth guard
  if (!staff) return { success: false, error: "Unauthorized" };
  // ... business logic
}
```

### Key Server Actions

**Staff actions** (`src/app/staff/actions.ts`):
- `sendInvite(data)` — create invitation + send email
- `listInvitations()` — all invitations with progress enrichment
- `revokeInvitation(id)` / `archiveInvitation(id)` — manager+ required
- `resetApplication(id)` / `resetQuiz(id)` — manager+ required
- `deleteCandidate(id)` — admin only, cascading delete via RPC
- `getPdfUrl(path)` / `getInviteFileUrl(path)` — signed URLs (5min expiry)
- `backfillPdfs()` — generates missing PDFs (runs on staff portal load)

**Candidate actions** (`src/app/staff/candidates/actions.ts`):
- `getCandidate(id)` — full detail with profile, activities, documents, DISC
- `searchCandidates(params)` — filter by name/email/phone/job/stage/DISC type
- `addActivity(candidateId, data)` / `addDocument(candidateId, data)`
- `getInterviews(candidateId)` / `updateInterviewFeedback(id, data)`

**Candidate-facing** (`src/app/candidate/actions.ts`):
- `sendOtp(phone)` / `verifyOtp(phone, token, inviteToken?)`
- `validateInviteToken(token)` — check invitation validity

## Coding Conventions

### Style
- **ESLint**: v9 flat config, extends `eslint-config-next/core-web-vitals` + typescript
- **No Prettier** — ESLint handles formatting
- **Strict TypeScript** (`strict: true`)
- **Path alias**: `@/*` maps to `./src/*`

### Patterns
- Server actions return `{ success, error?, data? }` consistently
- Parallel queries via `Promise.all()` where possible
- Zod validation for form inputs (`src/lib/schemas/`)
- HTML emails use inline CSS with table-based layouts (Outlook-compatible)
- PDFs generated server-side with PDFKit, stored to Supabase Storage
- Console logs prefixed with `[module-name]` for filtering

### Styling
- Tailwind CSS 4 utility classes — no component library (no shadcn, no MUI)
- Custom theme in `globals.css`: orange primary palette, stone grays, white background
- Fonts: Plus Jakarta Sans (body), Pacifico (display/branding)

## Environment Variables

Required in `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=https://nvtedkyjwulkzjeoqjgx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
STAFF_SECRET=...                    # Legacy session fallback (phasing out)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=...
EMAIL_PASSWORD=...                  # Gmail app password
EMAIL_FROM=Lyfe <...>
```

Optional:
```
NEXT_PUBLIC_SITE_URL=...            # For invite email links (defaults to https://lyfe.sg)
NOTIFY_TO=...                       # Email for profile/DISC submission notifications
NOTIFY_BCC=...                      # BCC for notifications
E2E_BASE_URL=...                    # Playwright base URL override
```

## Testing

### Unit Tests (Vitest)
- **Run**: `npm run test`
- **Coverage**: `npm run test:coverage`
- **Thresholds**: 80% lines/functions/branches/statements
- **Config**: `vitest.config.mts`
- **Pattern**: mock Supabase clients with chain-builder, mock `next/headers` and `next/navigation`

### E2E Tests (Playwright)
- **Run**: `npm run test:e2e`
- **UI mode**: `npm run test:e2e:ui`
- **Config**: `playwright.config.ts` — headless Chrome, auto-launches dev server
- **Test dir**: `tests/e2e/`
- Screenshots on failure, videos on retry

## Deployment

- **Platform**: Vercel
- **Region**: sin1 (Singapore)
- **next.config.ts**: `serverExternalPackages: ["pdfkit"]` (required for PDF generation on serverless)

## Database

Types are auto-generated in `src/lib/supabase/database.types.ts`. Do NOT hand-edit.

Migrations live in **lyfe-app/supabase/migrations/** (not in this repo). This repo's `supabase/` directory is archival only.

## Known Issues

- Next.js 16 has breaking changes from training data — check `node_modules/next/dist/docs/` before using unfamiliar APIs
- `STAFF_SECRET` legacy auth is being phased out — new code should use Supabase Auth only
