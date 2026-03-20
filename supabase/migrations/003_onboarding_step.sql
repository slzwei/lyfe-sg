alter table public.candidate_profiles
  add column if not exists onboarding_step smallint not null default 1;
