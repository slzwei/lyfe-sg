-- Invitations table for invite-only candidate flow
create table public.invitations (
  id              uuid primary key default gen_random_uuid(),
  token           text not null unique,
  email           text not null,
  candidate_name  text,
  position_applied text,
  status          text not null default 'pending'
                    check (status in ('pending', 'accepted', 'expired', 'revoked')),
  invited_by      text not null,
  user_id         uuid references auth.users(id) on delete set null,
  created_at      timestamptz not null default now(),
  expires_at      timestamptz not null default (now() + interval '14 days'),
  accepted_at     timestamptz
);

create index idx_invitations_token on public.invitations(token);
create index idx_invitations_email on public.invitations(email);

-- RLS: table accessed via service-role client only
alter table public.invitations enable row level security;

-- Add invitation_id to candidate_profiles
alter table public.candidate_profiles
  add column if not exists invitation_id uuid references public.invitations(id);

-- Add salary_period column if missing (referenced in code but not in original migration)
alter table public.candidate_profiles
  add column if not exists salary_period text default 'month';
