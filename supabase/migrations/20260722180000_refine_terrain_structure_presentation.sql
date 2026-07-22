-- Issue #237: clarify the existing spot_features presentation taxonomy.
-- Evidence values and relations are intentionally unchanged; raw wording remains auditable.
update public.fishing_spot_detail_item_definitions
set label_ja = '釣り場の構造・足場',
    description = '釣り人が立つ場所、または釣り場を構成する人工・自然構造。地点種別は含めない。'
where item_key = 'spot_features';
