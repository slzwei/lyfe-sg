-- Enable Supabase Realtime on candidate tracking tables
-- so the staff portal can see progress updates instantly.

alter publication supabase_realtime add table candidate_profiles;
alter publication supabase_realtime add table disc_responses;
alter publication supabase_realtime add table disc_results;
alter publication supabase_realtime add table invitations;
