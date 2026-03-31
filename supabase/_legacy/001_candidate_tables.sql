-- Candidate Profiles
create table if not exists public.candidate_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,

  -- Position details
  position_applied text,
  expected_salary text,
  date_available date,

  -- Personal particulars
  full_name text not null default '',
  chinese_name text,
  alias text,
  date_of_birth date,
  place_of_birth text,
  nationality text,
  race text,
  gender text,
  marital_status text,

  -- Address
  address_block text,
  address_street text,
  address_unit text,
  address_postal text,

  -- Contact
  contact_number text,
  email text,

  -- National Service
  ns_enlistment_date date,
  ns_ord_date date,
  ns_service_status text,
  ns_status text,
  ns_exemption_reason text,

  -- Emergency contact
  emergency_name text,
  emergency_relationship text,
  emergency_contact text,

  -- Education (array of objects)
  education jsonb not null default '[]',

  -- Skills
  software_competencies text,
  shorthand_wpm integer,
  typing_wpm integer,

  -- Languages (array of objects)
  languages jsonb not null default '[]',

  -- Employment history (array of objects)
  employment_history jsonb not null default '[]',

  -- Additional information
  additional_health boolean,
  additional_health_detail text,
  additional_dismissed boolean,
  additional_dismissed_detail text,
  additional_convicted boolean,
  additional_convicted_detail text,
  additional_bankrupt boolean,
  additional_bankrupt_detail text,
  additional_relatives boolean,
  additional_relatives_detail text,
  additional_prev_applied boolean,
  additional_prev_applied_detail text,

  -- Declaration
  declaration_agreed boolean not null default false,
  declaration_date timestamptz,

  -- Status
  completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- DISC Responses (raw quiz answers)
create table if not exists public.disc_responses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  responses jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- DISC Results (calculated scores)
create table if not exists public.disc_results (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  d_raw numeric not null,
  i_raw numeric not null,
  s_raw numeric not null,
  c_raw numeric not null,
  d_pct numeric not null,
  i_pct numeric not null,
  s_pct numeric not null,
  c_pct numeric not null,
  disc_type text not null,
  angle numeric not null,
  created_at timestamptz not null default now()
);

-- Enable RLS
alter table public.candidate_profiles enable row level security;
alter table public.disc_responses enable row level security;
alter table public.disc_results enable row level security;

-- RLS Policies: candidates can only access their own data
create policy "Users can view own profile"
  on public.candidate_profiles for select
  using (auth.uid() = user_id);

create policy "Users can insert own profile"
  on public.candidate_profiles for insert
  with check (auth.uid() = user_id);

create policy "Users can update own profile"
  on public.candidate_profiles for update
  using (auth.uid() = user_id);

create policy "Users can view own disc responses"
  on public.disc_responses for select
  using (auth.uid() = user_id);

create policy "Users can insert own disc responses"
  on public.disc_responses for insert
  with check (auth.uid() = user_id);

create policy "Users can update own disc responses"
  on public.disc_responses for update
  using (auth.uid() = user_id);

create policy "Users can view own disc results"
  on public.disc_results for select
  using (auth.uid() = user_id);

create policy "Users can insert own disc results"
  on public.disc_results for insert
  with check (auth.uid() = user_id);

create policy "Users can update own disc results"
  on public.disc_results for update
  using (auth.uid() = user_id);
