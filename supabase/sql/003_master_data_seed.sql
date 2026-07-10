-- Master data seed for Post-MVP-020.
-- Run manually after supabase/sql/002_master_data_tables.sql in the Supabase SQL Editor.
-- This file is idempotent and does not contain project secrets or live DB connection settings.

insert into public.fish_species (id, name_ja, category, season_months, display_order, is_active)
values
  ('aji', 'アジ', 'fish', array[]::smallint[], 1, true),
  ('saba', 'サバ', 'fish', array[]::smallint[], 2, true),
  ('iwashi', 'イワシ', 'fish', array[]::smallint[], 3, true),
  ('aomono', '青物', 'category', array[]::smallint[], 4, true),
  ('shiira', 'シイラ', 'fish', array[]::smallint[], 5, true),
  ('hirame', 'ヒラメ', 'fish', array[]::smallint[], 6, true),
  ('magochi', 'マゴチ', 'fish', array[]::smallint[], 7, true),
  ('seabass', 'シーバス', 'fish', array[]::smallint[], 8, true),
  ('aoriika', 'アオリイカ', 'squid', array[]::smallint[], 9, true),
  ('yariika', 'ヤリイカ', 'squid', array[]::smallint[], 10, true),
  ('kouika', 'コウイカ', 'squid', array[]::smallint[], 11, true),
  ('chinu', 'チヌ', 'fish', array[]::smallint[], 12, true),
  ('madai', '真鯛', 'fish', array[]::smallint[], 13, true),
  ('kisu', 'キス', 'fish', array[]::smallint[], 14, true),
  ('rockfish', '根魚', 'category', array[]::smallint[], 15, true)
on conflict (id) do update set
  name_ja = excluded.name_ja,
  category = excluded.category,
  season_months = excluded.season_months,
  display_order = excluded.display_order,
  is_active = excluded.is_active,
  updated_at = now();

insert into public.fishing_spots (id, name, area_name, latitude, longitude, spot_type, shore_access, coordinate_precision, target_species, recommended_methods, notes, is_active)
values
  ('nokita-port', '野北漁港', '糸島西岸', 33.623, 130.138, '漁港', '足場良い', 'rounded', array['アジ', 'イワシ', 'サバ', 'チヌ', 'アオリイカ']::text[], array['サビキ', 'コマセ', 'エギング']::text[], array[]::text[], true),
  ('nokita-beach', '野北海岸', '糸島西岸', 33.625, 130.158, 'サーフ', '注意必要', 'approximate', array['シーバス', 'ヒラメ', 'マゴチ', 'キス']::text[], array['キャスティング', 'その他']::text[], array[]::text[], true),
  ('keya-port', '芥屋漁港', '糸島西岸', 33.594, 130.112, '漁港', '足場良い', 'rounded', array['アオリイカ', 'コウイカ', 'アジ', 'チヌ']::text[], array['エギング', 'サビキ', 'コマセ']::text[], array[]::text[], true),
  ('keya-gate', '芥屋大門周辺', '糸島西岸', 33.596, 130.109, '磯場', '注意必要', 'approximate', array['アオリイカ', '青物', '根魚']::text[], array['エギング', 'ジギング', 'キャスティング', 'その他']::text[], array['小場所や危険箇所の詳細座標は扱わず、周辺代表点として丸める。']::text[], true),
  ('funakoshi-port', '船越漁港', '糸島西岸', 33.577, 130.177, '漁港', '足場良い', 'rounded', array['アジ', 'チヌ', 'アオリイカ', 'キス']::text[], array['サビキ', 'コマセ', 'エギング', 'その他']::text[], array[]::text[], true),
  ('kishi-port', '岐志漁港', '糸島西岸', 33.568, 130.151, '漁港', '足場良い', 'rounded', array['アジ', 'サバ', 'チヌ', 'アオリイカ']::text[], array['サビキ', 'コマセ', 'エギング']::text[], array[]::text[], true),
  ('fukuyoshi-port', '福吉漁港', '糸島西岸', 33.517, 130.058, '漁港', '足場良い', 'rounded', array['キス', 'アジ', 'チヌ', 'シーバス']::text[], array['その他', 'サビキ', 'コマセ', 'キャスティング']::text[], array[]::text[], true),
  ('hamasaki-beach', '浜崎海岸', '唐津湾', 33.447, 130.039, 'サーフ', '注意必要', 'approximate', array['キス', 'マゴチ', 'ヒラメ', 'シーバス']::text[], array['その他', 'キャスティング', '泳がせ']::text[], array[]::text[], true),
  ('niji-matsubara', '虹の松原周辺', '唐津湾', 33.462, 130.016, 'サーフ', '注意必要', 'approximate', array['キス', 'マゴチ', 'ヒラメ']::text[], array['その他', 'キャスティング', '泳がせ']::text[], array[]::text[], true),
  ('karatsu-east-port', '唐津東港', '唐津湾', 33.459, 129.993, '堤防', '足場良い', 'rounded', array['青物', '真鯛', 'サバ', 'アジ']::text[], array['ジギング', 'コマセ', 'サビキ']::text[], array[]::text[], true),
  ('karatsu-west-port', '唐津西港', '唐津湾', 33.468, 129.978, '堤防', '足場良い', 'rounded', array['サバ', 'アジ', '青物', 'チヌ']::text[], array['サビキ', 'ジギング', 'コマセ']::text[], array[]::text[], true),
  ('yobuko-area', '呼子周辺', '唐津湾北部', 33.543, 129.892, '漁港', '注意必要', 'approximate', array['ヤリイカ', 'アオリイカ', '根魚', '青物']::text[], array['エギング', 'その他', 'ジギング']::text[], array[]::text[], true),
  ('imari-inner-bay', '伊万里湾奥', '伊万里湾', 33.281, 129.861, '湾岸', '足場良い', 'rounded', array['アジ', 'シーバス', 'チヌ', 'ヒラメ']::text[], array['サビキ', 'キャスティング', 'コマセ', '泳がせ']::text[], array[]::text[], true),
  ('fukushima-area', '福島周辺', '伊万里湾', 33.332, 129.773, '磯場', '注意必要', 'approximate', array['アオリイカ', '根魚', '青物', '真鯛']::text[], array['エギング', 'その他', 'ジギング', 'コマセ']::text[], array[]::text[], true),
  ('takashima-area', '鷹島周辺', '伊万里湾', 33.448, 129.844, '堤防', '注意必要', 'approximate', array['青物', '根魚', 'アオリイカ', '真鯛']::text[], array['ジギング', 'その他', 'エギング', 'コマセ']::text[], array[]::text[], true),
  ('tabira-port', '田平港', '平戸', 33.365, 129.553, '漁港', '足場良い', 'rounded', array['真鯛', 'アジ', 'チヌ', '根魚']::text[], array['コマセ', 'サビキ', 'その他']::text[], array[]::text[], true),
  ('hirado-seto', '平戸瀬戸周辺', '平戸', 33.354, 129.579, '磯場', '注意必要', 'approximate', array['根魚', '青物', 'シイラ', 'アオリイカ']::text[], array['その他', 'ジギング', 'キャスティング', 'エギング']::text[], array[]::text[], true),
  ('ikitsuki-area', '生月島方面', '平戸', 33.39, 129.564, '地磯', '上級者向け', 'approximate', array['シイラ', '青物', '根魚', 'アオリイカ']::text[], array['キャスティング', 'ジギング', 'その他', 'エギング']::text[], array['危険な地磯や小場所を示さない代表点として扱う。']::text[], true)
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

insert into public.source_registry (source_id, source_name, source_type, target_area_names, base_url, crawl_policy, robots_status, terms_status, reviewed_at, review_urls, review_summary, notes, is_active)
values
  ('marukin', '釣り具のまるきん', 'shop', array['糸島', '唐津', '伊万里湾', '平戸']::text[], 'https://marukin-net.co.jp/', 'referenceOnly', 'partial', 'unknown', '2026-07-09'::date, array['https://marukin-net.co.jp/robots.txt', 'https://marukin-net.co.jp/fishing-report/', 'https://marukin-net.co.jp/fishing-report/?feed=rss2', 'https://marukin-net.co.jp/fishing-report/?store_filter=imari', 'https://marukin-net.co.jp/fishing-report/?store_filter=hirado', 'https://marukin-net.co.jp/fishing-report/?store_filter=itoshima']::text[], '釣果ページとRSS候補は確認できたが、サイト利用規約を確認できず、robots.txtのContent-SignalもAI学習不可・参照利用止まりのため自動収集対象にはしない。', array['釣果情報は /fishing-report/ 配下にあり、店舗フィルタとして imari / hirado / itoshima を確認した。RSS候補も存在する。', 'robots.txtは User-agent: * に Allow: / を示す一方、Content-Signalで ai-train=no / use=reference を示し、複数AI系botを個別にDisallowしている。', '利用規約ページは確認できなかったため、許諾が明確になるまでは自動収集せず、出典確認やUI検討の参照に留める。']::text[], true),
  ('point-i', '釣り具のポイント', 'shop', array['糸島', '唐津', '伊万里湾', '平戸']::text[], 'https://www.point-i.jp/', 'manualOnly', 'allowed', 'restricted', '2026-07-09'::date, array['https://www.point-i.jp/robots.txt', 'https://www.point-i.jp/termsofservice', 'https://www.point-i.jp/catches', 'https://www.point-i.jp/fishing_infos', 'https://www.point-i.jp/fishing_spot_guides']::text[], 'robots.txtに一般的なDisallowは見当たらないが、利用規約が私的利用に限定し、情報収集目的や過度負荷を禁じるため自動収集対象にはしない。', array['釣果候補は /catches（みんなの釣果）、/fishing_infos、/fishing_spot_guides。ユーザー投稿や店舗・スタッフ由来の情報が混在する可能性がある。', '利用規約はWEBサービスの利用を私的目的に限定し、当社または他ユーザーの情報収集目的の利用や過度な負荷を禁止している。', '本文・画像・コメントは保存せず、ユーザーが出典URLを手動登録した場合の構造化メモに限定する。']::text[], true),
  ('chowari', 'Chowari', 'tide', array['糸島', '唐津', '伊万里湾', '平戸']::text[], 'https://tide.chowari.jp/', 'referenceOnly', 'unknown', 'restricted', '2026-07-09'::date, array['https://tide.chowari.jp/robots.txt', 'https://tide.chowari.jp/', 'https://www.chowari.jp/sitepolicy/agreement.php', 'https://www.chowari.jp/catch/', 'https://www.chowari.jp/catcharea/', 'https://www.chowari.jp/catchfish/']::text[], 'tideサブドメインのrobots.txtは404で未確認、Chowari側の規約は情報収集目的や過度負荷を禁止しているため、潮見表UI等の参照のみに留める。', array['潮見表ページから Chowari の最新釣果、地域別釣果、魚種別釣果への導線を確認した。', 'tide.chowari.jp/robots.txt は404で、サブドメイン単位のrobots確認は未完了。', '利用規約は他会員の情報収集目的の利用、過度な負担、知的財産権侵害のおそれがある行為を禁じているため、釣果データ取得元にはしない。']::text[], true),
  ('anglers', 'アングラーズ', 'sns_like', array['糸島', '唐津', '伊万里湾', '平戸']::text[], 'https://anglers.jp/', 'manualOnly', 'partial', 'restricted', '2026-07-09'::date, array['https://anglers.jp/robots.txt', 'https://anglers.jp/terms', 'https://anglers.jp/terms/free', 'https://anglers.jp/terms/post_guideline', 'https://anglers.jp/catches', 'https://anglers.jp/sitemap']::text[], 'ユーザー投稿型サービスで、robots.txtはAI系クローラ制限とCrawl-delayを含む。投稿者権利確認が必要なため自動収集対象にはしない。', array['釣果候補は /catches、サイトマップは /sitemap を確認した。サービス性質上、投稿者由来の本文・画像・位置情報を含み得る。', 'robots.txtは User-agent: * に Allow: / を示す一方、AI系クローラの多くをDisallowし、一部botにはCrawl-delayを設定している。', '利用規約・投稿ガイドラインの確認が必要なユーザー投稿型/SNS的サービスのため、URL手動登録または参照に限定する。']::text[], true)
on conflict (source_id) do update set
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
  is_active = excluded.is_active,
  updated_at = now();
