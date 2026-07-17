-- Post-MVP-059: apply the repository-owner-approved Karatsu East Port curation.
-- This migration upserts exactly one public.fishing_spots row and does not change schema, RLS, grants, or other spots.

insert into public.fishing_spots (
  id,
  name,
  area_name,
  latitude,
  longitude,
  spot_type,
  shore_access,
  coordinate_precision,
  target_species,
  recommended_methods,
  notes,
  is_active
)
values (
  'karatsu-east-port',
  '唐津東港',
  '唐津湾',
  33.459,
  129.993,
  'その他',
  '不明',
  'approximate',
  array['アジ', 'シーバス', 'チヌ']::text[],
  array[]::text[],
  array[
    '唐津港東港地区の代表点です。一般利用可能な釣り位置や入口を示すものではありません。',
    '立入・釣り可否は、現地表示と港湾管理者の最新案内を確認してください。',
    '魚種は過去の公開情報に基づく参考情報で、現在の釣果や時期を保証しません。'
  ]::text[],
  true
)
on conflict (id) do update set
  name = excluded.name,
  area_name = excluded.area_name,
  latitude = excluded.latitude,
  longitude = excluded.longitude,
  spot_type = excluded.spot_type,
  shore_access = excluded.shore_access,
  coordinate_precision = excluded.coordinate_precision,
  target_species = excluded.target_species,
  recommended_methods = excluded.recommended_methods,
  notes = excluded.notes,
  is_active = excluded.is_active,
  updated_at = now();
