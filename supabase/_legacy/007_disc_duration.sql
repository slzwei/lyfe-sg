-- Track how long users spend on the DISC quiz
alter table disc_results
  add column duration_seconds integer;
