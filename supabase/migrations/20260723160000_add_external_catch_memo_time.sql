-- Issue #260: Preserve the existing catch date while optionally storing a reported local time.
-- Existing rows intentionally remain NULL; no inferred time is backfilled.
alter table public.external_catch_memos
  add column if not exists caught_time time without time zone;
