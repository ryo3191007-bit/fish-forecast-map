-- Issue #296: correct reviewed representative points for the remaining fishing spots.
-- The coordinates identify a facility, coast, island, or port area only and do not assert fishing access or safety.

 do $migration$
 declare
   matched_count integer;
 begin
   select count(*)
   into matched_count
   from public.fishing_spots
   where id in (
     'nokita-beach',
     'kishi-port',
     'fukuyoshi-port',
     'niji-matsubara',
     'karatsu-west-port',
     'hatazu-fishing-port',
     'nabegushi-fishing-port',
     'takashima-area',
     'kabeshima-port',
     'tobo-port',
     'usukawan-fishing-port',
     'hoki-fishing-port',
     'miyanoura-fishing-port'
   );

   if matched_count <> 13 then
     raise exception 'Issue #296 expected all 13 target fishing spots, found %', matched_count;
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
     ('nokita-beach'::text, 33.60480000::double precision, 130.15520000::double precision),
     ('kishi-port'::text, 33.56817019::double precision, 130.12709036::double precision),
     ('fukuyoshi-port'::text, 33.50788331::double precision, 130.09271930::double precision),
     ('niji-matsubara'::text, 33.44720000::double precision, 130.02070000::double precision),
     ('karatsu-west-port'::text, 33.46620000::double precision, 129.94880000::double precision),
     ('hatazu-fishing-port'::text, 33.37750645::double precision, 129.86504185::double precision),
     ('nabegushi-fishing-port'::text, 33.40073617::double precision, 129.81105386::double precision),
     ('takashima-area'::text, 33.42460000::double precision, 129.75550000::double precision),
     ('kabeshima-port'::text, 33.54630411::double precision, 129.88236479::double precision),
     ('tobo-port'::text, 33.48814255::double precision, 129.94840955::double precision),
     ('usukawan-fishing-port'::text, 33.37271500::double precision, 129.54107500::double precision),
     ('hoki-fishing-port'::text, 33.30411200::double precision, 129.51913500::double precision),
     ('miyanoura-fishing-port'::text, 33.18959444::double precision, 129.35600020::double precision)
 ) as corrected(id, latitude, longitude)
 where spot.id = corrected.id;
