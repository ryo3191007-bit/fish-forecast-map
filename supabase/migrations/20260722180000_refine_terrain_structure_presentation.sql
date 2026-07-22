-- Issue #237: clarify the existing terrain and fishing-structure taxonomy.
-- Apply after 20260722120000_add_issue_205_karatsu_spots.sql. Rollback, if needed,
-- must be a reviewed follow-up migration restored from the Issue #205 audit payload.
update public.fishing_spot_detail_item_definitions
set label_ja = '釣り場の構造・足場',
    description = '釣り人が立つ場所、または釣り場を構成する人工・自然構造。漁港・第3種漁港等の単独の地点種別は含めない。島の漁港のように立地特性を含む短い複合句は例外として扱える。長い経路説明は含めない。'
where item_key = 'spot_features';

-- The fishing-port type already lives on fishing_spots.spot_type. Remove only the
-- ten duplicate Issue #205 detail rows; source records remain available for audit.
delete from public.fishing_spot_detail_values
where spot_id in (
  'ouka-port', 'kodomo-port', 'kabeshima-port', 'hado-port', 'haregi-port',
  'tobo-port', 'minatohama-port', 'nagoya-port', 'yobuko-port', 'takakushi-port'
)
and item_key = 'spot_features'
and contribution_origin = 'curated_research'
and checked_at = date '2026-07-22'
and (value_text_list && array['漁港', '第3種漁港']::text[]);

-- Preserve the long access wording in a server-side-only field before shortening the
-- ordinary value. The normal repository does not select internal_note.
update public.fishing_spot_detail_values
set internal_note = coalesce(internal_note, '呼子大橋経由で陸路接続する地域文脈')
where spot_id = 'kabeshima-port'
  and item_key = 'coastal_topography'
  and contribution_origin = 'curated_research'
  and checked_at = date '2026-07-22';

-- Reclassify the Issue #205 mixed coastal values as structures/footing and replace
-- long ordinary-display wording with the reviewed concepts.
update public.fishing_spot_detail_values as detail
set item_key = 'spot_features',
    value_text_list = corrected.values
from (values
  ('ouka-port', array['波止', '小型テトラ']::text[]),
  ('kodomo-port', array['砂浜', '波止']::text[]),
  ('kabeshima-port', array['島の漁港']::text[]),
  ('hado-port', array['波止', '沖向きテトラ']::text[]),
  ('haregi-port', array['波止', '岸壁', '小型テトラ']::text[]),
  ('tobo-port', array['波止', 'テトラ']::text[]),
  ('minatohama-port', array['南北の波止', '北側大型テトラ', '南側比較的小型テトラ']::text[]),
  ('nagoya-port', array['波止', '岸壁']::text[]),
  ('yobuko-port', array['複数の波止・岸壁']::text[]),
  ('takakushi-port', array['波止']::text[])
) as corrected(spot_id, values)
where detail.spot_id = corrected.spot_id
  and detail.item_key = 'coastal_topography'
  and detail.contribution_origin = 'curated_research'
  and detail.checked_at = date '2026-07-22';

-- 唐房漁港 alone has independently useful natural coastal evidence. Copy the
-- existing evidence metadata and source relations into a dedicated terrain row.
with original as (
  select * from public.fishing_spot_detail_values
  where spot_id = 'tobo-port'
    and item_key = 'spot_features'
    and contribution_origin = 'curated_research'
    and checked_at = date '2026-07-22'
  limit 1
), inserted as (
  insert into public.fishing_spot_detail_values (
    id, spot_id, item_key, information_state, value_text_list, confidence,
    contribution_origin, moderation_status, review_status, adoption_status, note, checked_at
  )
  select (
      substr(md5('tobo-port:issue-237-coastal_topography'),1,8)||'-'||
      substr(md5('tobo-port:issue-237-coastal_topography'),9,4)||'-'||
      substr(md5('tobo-port:issue-237-coastal_topography'),13,4)||'-'||
      substr(md5('tobo-port:issue-237-coastal_topography'),17,4)||'-'||
      substr(md5('tobo-port:issue-237-coastal_topography'),21,12)
    )::uuid,
    spot_id, 'coastal_topography', information_state, array['浦川河口']::text[], confidence,
    contribution_origin, moderation_status, review_status, adoption_status,
    note, checked_at
  from original
  on conflict (id) do update set
    item_key = excluded.item_key,
    information_state = excluded.information_state,
    value_text_list = excluded.value_text_list,
    confidence = excluded.confidence,
    contribution_origin = excluded.contribution_origin,
    moderation_status = excluded.moderation_status,
    review_status = excluded.review_status,
    adoption_status = excluded.adoption_status,
    note = excluded.note,
    checked_at = excluded.checked_at
  returning id
)
insert into public.fishing_spot_detail_value_sources (detail_value_id, source_id, relation, note)
select inserted.id, relation.source_id, relation.relation, relation.note
from inserted
cross join original
join public.fishing_spot_detail_value_sources as relation on relation.detail_value_id = original.id
on conflict (detail_value_id, source_id) do update
set relation = excluded.relation,
    note = excluded.note;
