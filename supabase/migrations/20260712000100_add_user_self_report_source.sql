insert into public.source_registry (
  source_id,
  source_name,
  source_type,
  target_area_names,
  base_url,
  crawl_policy,
  robots_status,
  terms_status,
  reviewed_at,
  review_urls,
  review_summary,
  notes,
  is_active
)
values (
  'user-self-report',
  '本人の釣果',
  'other',
  array['糸島', '唐津', '伊万里湾', '平戸'],
  'https://fish-forecast-map.vercel.app',
  'manualOnly',
  'unchecked',
  'unchecked',
  date '2026-07-12',
  array[]::text[],
  'ユーザー本人が自分の釣果を記録するための内部固定source。外部サイト取得やスクレイピングには使わない。',
  array[
    '既存ExternalCatchMemo/source_registry互換のための内部source。',
    '画面では情報元として入力させず、新規本人登録時に自動設定する。'
  ],
  true
)
on conflict (source_id) do update
set
  source_name = excluded.source_name,
  source_type = excluded.source_type,
  target_area_names = excluded.target_area_names,
  base_url = excluded.base_url,
  crawl_policy = excluded.crawl_policy,
  robots_status = excluded.robots_status,
  terms_status = excluded.terms_status,
  reviewed_at = excluded.reviewed_at,
  review_urls = excluded.review_urls,
  review_summary = excluded.review_summary,
  notes = excluded.notes,
  is_active = excluded.is_active;
