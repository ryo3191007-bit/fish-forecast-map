-- Issue #397: explicit private/public visibility for user-owned records.
-- Existing rows and all future rows remain private unless their owner opts in.
alter table public.user_fishing_spots add column visibility text not null default 'private'
  check (visibility in ('private', 'public'));
alter table public.spot_field_reports add column visibility text not null default 'private'
  check (visibility in ('private', 'public'));
alter table public.external_catch_memos add column visibility text not null default 'private'
  check (visibility in ('private', 'public'));

create index user_fishing_spots_public_idx on public.user_fishing_spots (updated_at desc)
  where visibility = 'public' and not is_deleted;
create index spot_field_reports_public_idx on public.spot_field_reports (observed_on desc, created_at desc)
  where visibility = 'public';
create index external_catch_memos_public_idx on public.external_catch_memos (caught_date desc, updated_at desc)
  where visibility = 'public' and not is_deleted and acquisition_method = 'manual';

-- Security-definer read views expose an intentional, email-free projection only.
-- Exact coordinates are included after an owner explicitly publishes a user spot.
create view public.public_user_fishing_spots with (security_barrier = true) as
select id, name, latitude, longitude, area_name, spot_type, created_at, updated_at
from public.user_fishing_spots where visibility = 'public' and not is_deleted;

create view public.public_spot_field_reports with (security_barrier = true) as
select id, target_type, spot_id, user_spot_id, observed_on, summary_note, origin, created_at, updated_at
from public.spot_field_reports where visibility = 'public';

create view public.public_spot_field_report_values with (security_barrier = true) as
select value.id, value.report_id, value.item_key, value.information_state, value.value_text,
  value.value_text_list, value.value_number, value.unit, value.note, value.created_at
from public.spot_field_report_values value
join public.spot_field_reports report on report.id = value.report_id
where report.visibility = 'public';

create view public.public_catch_records with (security_barrier = true) as
select id, species, caught_date, caught_time, area_name, estimated_spot_name, spot_id, user_spot_id,
  latitude, longitude, coordinate_precision, method, catch_count, size_cm, catch_items,
  acquisition_method, confidence, environment_match_notes, user_memo, created_at, updated_at
from public.external_catch_memos
where visibility = 'public' and not is_deleted and acquisition_method = 'manual';

revoke all on public.public_user_fishing_spots, public.public_spot_field_reports,
  public.public_spot_field_report_values, public.public_catch_records from public;
grant select on public.public_user_fishing_spots, public.public_spot_field_reports,
  public.public_spot_field_report_values, public.public_catch_records to anon, authenticated;

comment on column public.user_fishing_spots.visibility is
  'private by default; public explicitly exposes the exact stored latitude/longitude through public_user_fishing_spots.';
comment on table public.public_catch_records is
  'Public manual catch projection. Owner identifiers, source URLs, and private record photo metadata are intentionally excluded.';

-- Recovery: set affected rows back to private and revoke the read views. Columns can remain
-- for forward compatibility; no destructive rollback is required. The private Storage bucket,
-- record_photos RLS, and Storage policies are deliberately unchanged, so photos stay owner-only.
