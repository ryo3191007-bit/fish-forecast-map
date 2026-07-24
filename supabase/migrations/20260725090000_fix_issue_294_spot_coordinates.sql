-- Issue #294: correct two grossly misplaced approximate port representative points.
-- The coordinates identify the port area only and do not assert fishing access or safety.

do $migration$
declare
  matched_count integer;
begin
  select count(*)
  into matched_count
  from public.fishing_spots
  where id in ('karatsu-east-port', 'maetsuyoshi-fishing-port');

  if matched_count <> 2 then
    raise exception 'Issue #294 expected both target fishing spots, found %', matched_count;
  end if;
end
$migration$;

update public.fishing_spots as spot
set
  latitude = corrected.latitude,
  longitude = corrected.longitude,
  coordinate_precision = 'approximate',
  updated_at = pg_catalog.now()
from (
  values
    ('karatsu-east-port'::text, 33.469823::double precision, 129.963189::double precision),
    ('maetsuyoshi-fishing-port'::text, 33.210620::double precision, 129.452920::double precision)
) as corrected(id, latitude, longitude)
where spot.id = corrected.id;
