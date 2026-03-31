-- 010_interview_feedback_pa_access.sql
-- Add recommendation column to interviews table for post-interview feedback.
-- Grant PA role read access to users table for staff portal.

-- 1. Add recommendation column (nullable, no default needed)
ALTER TABLE public.interviews
  ADD COLUMN IF NOT EXISTS recommendation text
  CHECK (recommendation IN ('second_interview', 'on_hold', 'pass'));

-- 2. Update RLS: allow PA to read staff users (needed for ATS portal access)
DO $$ BEGIN
  DROP POLICY IF EXISTS "Staff can read staff users" ON public.users;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

CREATE POLICY "Staff can read staff users"
  ON public.users FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
        AND u.role IN ('admin', 'director', 'manager', 'agent', 'pa')
    )
  );
