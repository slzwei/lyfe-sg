-- Add archived_at column to invitations for staff archiving
ALTER TABLE invitations ADD COLUMN archived_at timestamptz;
