-- 009_staff_auth.sql
-- Multi-user staff authentication: users table, RLS, invitation attribution.
-- NO auth.users trigger — candidates sign up via phone OTP with no name/email,
-- so a trigger inserting into users (full_name NOT NULL) would break signup.

-- 1. Ensure public.users table exists with correct schema
--    (May already exist via Dashboard; this is idempotent)
CREATE TABLE IF NOT EXISTS public.users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  email text,
  phone text,
  avatar_url text,
  external_id text,
  role user_role NOT NULL DEFAULT 'candidate',
  lifecycle_stage lifecycle_stage,
  is_active boolean DEFAULT true,
  onboarding_complete boolean DEFAULT false,
  reports_to uuid REFERENCES public.users(id),
  date_of_birth date,
  notification_preferences jsonb,
  push_token text,
  last_login_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add columns that may be missing if table was created with fewer columns
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS last_login_at timestamptz;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- 2. RLS policies for users table
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Drop-if-exists for idempotency
DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can read own profile" ON public.users;
  DROP POLICY IF EXISTS "Staff can read staff users" ON public.users;
  DROP POLICY IF EXISTS "Admin can update users" ON public.users;
  DROP POLICY IF EXISTS "Admin can insert users" ON public.users;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

CREATE POLICY "Users can read own profile"
  ON public.users FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Staff can read staff users"
  ON public.users FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
        AND u.role IN ('admin', 'director', 'manager', 'agent')
    )
  );

CREATE POLICY "Admin can update users"
  ON public.users FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.role = 'admin'
    )
  );

CREATE POLICY "Admin can insert users"
  ON public.users FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.role = 'admin'
    )
  );

-- 3. Auto-update updated_at on users
CREATE OR REPLACE FUNCTION public.update_users_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_users_updated_at'
  ) THEN
    CREATE TRIGGER trg_users_updated_at
      BEFORE UPDATE ON public.users
      FOR EACH ROW EXECUTE FUNCTION public.update_users_updated_at();
  END IF;
END $$;

-- 4. Add invitation attribution column
ALTER TABLE public.invitations
  ADD COLUMN IF NOT EXISTS invited_by_user_id uuid REFERENCES public.users(id);
