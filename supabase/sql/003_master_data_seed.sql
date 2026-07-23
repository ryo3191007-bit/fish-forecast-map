-- Master data seed for Post-MVP-020, updated by Post-MVP-059.
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
  ('nokita-port', '野北漁港', '糸島西岸', 33.611311, 130.161569, '漁港', '不明', 'exact', array[]::text[], array[]::text[], array['C09公的facility代表点であり、野北漁港の実釣位置、入口、駐車位置、堤防先端、危険箇所を示しません。', '一般立入・釣り可否は未確認のため、現地表示と管理者の最新案内を確認してください。', '魚種・釣法は日付・地点・遊漁文脈を伴う直接根拠不足のため掲載していません。']::text[], true),
  ('nokita-beach', '野北海岸', '糸島西岸', 33.625, 130.158, 'サーフ', '不明', 'approximate', array[]::text[], array[]::text[], array['既存本番座標を暫定保持した海岸代表点です。調査済みですが公的な本番代表座標は未確定で、実釣位置や離岸流・危険箇所を示しません。', '一般立入・釣り可否は未確認のため、現地表示と管理者の最新案内を確認してください。', '魚種・釣法は日付・地点・遊漁文脈を伴う直接根拠不足のため掲載していません。']::text[], true),
  ('keya-port', '芥屋漁港', '糸島西岸', 33.58937974, 130.10658056, '漁港', '不明', 'exact', array[]::text[], array[]::text[], array['C09公的facility代表点であり、芥屋漁港の実釣位置、入口、駐車位置、堤防先端、芥屋大門側の危険箇所を示しません。', '一般立入・釣り可否は未確認のため、現地表示と管理者の最新案内を確認してください。', '魚種・釣法は日付・地点・遊漁文脈を伴う直接根拠不足のため掲載していません。']::text[], true),
  ('keya-gate', '芥屋大門周辺', '糸島西岸', 33.5967, 130.1106, 'その他', '不明', 'approximate', array[]::text[], array[]::text[], array['芥屋大門周辺のdistrict概略代表点であり、洞窟入口、岩場、遊歩道入口、駐車場、芥屋漁港、危険箇所、実釣位置を示しません。', '一般立入・釣り可否は未確認のため、現地表示と管理者の最新案内を確認してください。', '魚種・釣法は日付・地点・遊漁文脈を伴う直接根拠不足のため掲載していません。']::text[], true),
  ('funakoshi-port', '船越漁港', '糸島西岸', 33.55389244, 130.13025931, '漁港', '不明', 'exact', array[]::text[], array[]::text[], array['C09公的facility代表点であり、船越漁港の実釣位置、入口、駐車位置、堤防先端、船越湾内の危険箇所を示しません。', '一般立入・釣り可否は未確認のため、現地表示と管理者の最新案内を確認してください。', '魚種・釣法は日付・地点・遊漁文脈を伴う直接根拠不足のため掲載していません。']::text[], true),
  ('kishi-port', '岐志漁港', '糸島西岸', 33.568, 130.151, '漁港', '不明', 'approximate', array[]::text[], array[]::text[], array['既存本番座標を暫定保持した港代表点です。調査済みですが公的な本番代表座標は未確定で、実釣位置、入口、駐車位置、堤防先端を示しません。', '一般立入・釣り可否は未確認のため、現地表示と管理者の最新案内を確認してください。', '魚種・釣法は日付・地点・遊漁文脈を伴う直接根拠不足のため掲載していません。']::text[], true),
  ('fukuyoshi-port', '福吉漁港', '糸島西岸', 33.517, 130.058, '漁港', '不明', 'approximate', array[]::text[], array[]::text[], array['既存本番座標を暫定保持した港代表点です。調査済みですが公的な本番代表座標は未確定で、実釣位置、入口、駐車位置、導流堤先端を示しません。', '一般立入・釣り可否は未確認のため、現地表示と管理者の最新案内を確認してください。', '魚種・釣法は日付・地点・遊漁文脈を伴う直接根拠不足のため掲載していません。']::text[], true),
  ('hamasaki-beach', '浜崎海岸', '唐津湾', 33.447, 130.039, 'サーフ', '不明', 'approximate', array[]::text[], array[]::text[], array['既存本番座標を暫定保持した海岸代表点です。調査済みですが公的な本番代表座標は未確定で、実釣位置、駐車位置、海水浴場範囲、危険箇所を示しません。', '一般立入・釣り可否は未確認のため、現地表示と管理者の最新案内を確認してください。', '魚種・釣法は日付・地点・遊漁文脈を伴う直接根拠不足のため掲載していません。']::text[], true),
  ('niji-matsubara', '虹の松原周辺', '唐津湾', 33.462, 130.016, 'その他', '不明', 'approximate', array[]::text[], array[]::text[], array['既存本番座標を暫定保持した虹の松原周辺代表点です。調査済みですが公的な本番代表座標は未確定で、海岸・松原・駐車位置・実釣位置を個別に示しません。', '一般立入・釣り可否は未確認のため、現地表示と管理者の最新案内を確認してください。', '魚種・釣法は日付・地点・遊漁文脈を伴う直接根拠不足のため掲載していません。']::text[], true),
  ('karatsu-east-port', '唐津東港', '唐津湾', 33.459, 129.993, 'その他', '不明', 'approximate', array['アジ', 'シーバス', 'チヌ']::text[], array[]::text[], array['唐津港東港地区の代表点です。一般利用可能な釣り位置や入口を示すものではありません。', '立入・釣り可否は、現地表示と港湾管理者の最新案内を確認してください。', '魚種は過去の公開情報に基づく参考情報で、現在の釣果や時期を保証しません。']::text[], true),
  ('karatsu-west-port', '唐津西港', '唐津湾', 33.468, 129.978, 'その他', '不明', 'approximate', array[]::text[], array[]::text[], array['既存本番座標を暫定保持した唐津西港周辺代表点です。調査済みですが公的な本番代表座標は未確定で、港内の岸壁、入口、駐車位置、堤防先端を示しません。', '一般立入・釣り可否は未確認のため、現地表示と管理者の最新案内を確認してください。', '魚種・釣法は日付・地点・遊漁文脈を伴う直接根拠不足のため掲載していません。']::text[], true),
  ('yobuko-area', '呼子周辺', '唐津湾北部', 33.543, 129.892, 'その他', '不明', 'approximate', array[]::text[], array[]::text[], array['既存本番座標を暫定保持した呼子周辺代表点です。調査済みですが公的な本番代表座標は未確定で、港、岸壁、磯、駐車位置、危険箇所、実釣位置を示しません。', '一般立入・釣り可否は未確認のため、現地表示と管理者の最新案内を確認してください。', '魚種・釣法は日付・地点・遊漁文脈を伴う直接根拠不足のため掲載していません。']::text[], true),
  ('imari-inner-bay', '伊万里湾奥', '伊万里湾', 33.281, 129.861, 'その他', '不明', 'approximate', array[]::text[], array[]::text[], array['既存本番座標を暫定保持した伊万里湾奥の広域内湾文脈代表点です。調査済みですが公的な本番代表座標は未確定で、岸壁、河口、駐車位置、実釣位置を示しません。', '一般立入・釣り可否は未確認のため、現地表示と管理者の最新案内を確認してください。', '魚種・釣法は日付・地点・遊漁文脈を伴う直接根拠不足のため掲載していません。']::text[], true),
  ('fukushima-port', '福島港', '伊万里湾・福島', 33.3672, 129.8208, 'その他', '不明', 'approximate', array[]::text[], array[]::text[], array['地点の概略代表点であり、実釣位置、入口、駐車位置、危険箇所を示しません。', '一般立入・釣り可否は未確認です。現地表示と管理者の最新案内を確認してください。', '根拠のない魚種・釣法・SCORE情報は追加していません。']::text[], true),
  ('nabegushi-fishing-port', '鍋串漁港', '伊万里湾・福島', 33.4162, 129.805, '漁港', '不明', 'approximate', array[]::text[], array[]::text[], array['地点の概略代表点であり、実釣位置、入口、駐車位置、危険箇所を示しません。', '一般立入・釣り可否は未確認です。現地表示と管理者の最新案内を確認してください。', '根拠のない魚種・釣法・SCORE情報は追加していません。']::text[], true),
  ('aonoura-fishing-port', '阿翁浦漁港', '伊万里湾・鷹島', 33.4592, 129.7548, '漁港', '不明', 'approximate', array[]::text[], array[]::text[], array['地点の概略代表点であり、実釣位置、入口、駐車位置、危険箇所を示しません。', '一般立入・釣り可否は未確認です。現地表示と管理者の最新案内を確認してください。', '根拠のない魚種・釣法・SCORE情報は追加していません。']::text[], true),
  ('tononoura-fishing-port', '殿ノ浦漁港', '伊万里湾・鷹島', 33.4283, 129.7542, '漁港', '不明', 'approximate', array[]::text[], array[]::text[], array['地点の概略代表点であり、実釣位置、入口、駐車位置、危険箇所を示しません。', '一般立入・釣り可否は未確認です。現地表示と管理者の最新案内を確認してください。', '根拠のない魚種・釣法・SCORE情報は追加していません。']::text[], true),
('funakaratsu-fishing-port', '船唐津漁港', '伊万里湾・鷹島', 33.4118, 129.7215, '漁港', '不明', 'approximate', array[]::text[], array[]::text[], array['地点の概略代表点であり、実釣位置、入口、駐車位置、危険箇所を示しません。', '一般立入・釣り可否は未確認です。現地表示と管理者の最新案内を確認してください。', '根拠のない魚種・釣法・SCORE情報は追加していません。']::text[], true),
  ('fukushima-area', '福島周辺', '伊万里湾', 33.332, 129.773, 'その他', '不明', 'approximate', array[]::text[], array[]::text[], array['福島周辺の広域district概略代表点であり、港、橋、橋脚、灯台、堤防先端、磯入口、駐車位置、危険箇所、実釣位置を示しません。', '一般立入・釣り可否は未確認のため、現地表示と管理者の最新案内を確認してください。', '魚種・釣法は日付・地点・遊漁文脈を伴う直接根拠不足のため掲載していません。']::text[], true),
  ('takashima-area', '鷹島周辺', '伊万里湾', 33.448, 129.844, 'その他', '不明', 'approximate', array[]::text[], array[]::text[], array['既存本番座標を暫定保持した鷹島周辺代表点です。調査済みですが公的な本番代表座標は未確定で、港、橋、堤防、磯入口、駐車位置、実釣位置を示しません。', '一般立入・釣り可否は未確認のため、現地表示と管理者の最新案内を確認してください。', '魚種・釣法は日付・地点・遊漁文脈を伴う直接根拠不足のため掲載していません。']::text[], true),
  ('ouka-port', '相賀漁港', '唐津湾沿岸', 33.506447, 129.956971, '漁港', '不明', 'approximate', array[]::text[], array[]::text[], array['港の概略代表点であり、実釣位置、堤防先端、入口、駐車位置、危険箇所を示しません。', '一般立入・釣り可否は未確認です。現地表示と管理者の最新案内を確認してください。', '過去の魚種・設備・地形情報は地点詳細の参考情報であり、現在の釣果や利用可否を保証しません。']::text[], true),
  ('kodomo-port', '小友漁港', '呼子・鎮西', 33.54684, 129.906629, '漁港', '不明', 'approximate', array[]::text[], array[]::text[], array['港の概略代表点であり、実釣位置、堤防先端、入口、駐車位置、危険箇所を示しません。', '一般立入・釣り可否は未確認です。現地表示と管理者の最新案内を確認してください。', '過去の魚種・設備・地形情報は地点詳細の参考情報であり、現在の釣果や利用可否を保証しません。']::text[], true),
  ('kabeshima-port', '加部島漁港', '呼子・鎮西', 33.55655, 129.8894, '漁港', '不明', 'approximate', array[]::text[], array[]::text[], array['港の概略代表点であり、実釣位置、堤防先端、入口、駐車位置、危険箇所を示しません。', '一般立入・釣り可否は未確認です。現地表示と管理者の最新案内を確認してください。', '過去の魚種・設備・地形情報は地点詳細の参考情報であり、現在の釣果や利用可否を保証しません。']::text[], true),
  ('hado-port', '波戸漁港', '呼子・鎮西', 33.5463, 129.859, '漁港', '不明', 'approximate', array[]::text[], array[]::text[], array['港の概略代表点であり、実釣位置、堤防先端、入口、駐車位置、危険箇所を示しません。', '一般立入・釣り可否は未確認です。現地表示と管理者の最新案内を確認してください。', '過去の魚種・設備・地形情報は地点詳細の参考情報であり、現在の釣果や利用可否を保証しません。']::text[], true),
  ('haregi-port', '晴気漁港', '肥前・玄海沿岸', 33.4351, 129.811, '漁港', '不明', 'approximate', array[]::text[], array[]::text[], array['港の概略代表点であり、実釣位置、堤防先端、入口、駐車位置、危険箇所を示しません。', '一般立入・釣り可否は未確認です。現地表示と管理者の最新案内を確認してください。', '過去の魚種・設備・地形情報は地点詳細の参考情報であり、現在の釣果や利用可否を保証しません。']::text[], true),
  ('tobo-port', '唐房漁港', '唐津湾沿岸', 33.482, 129.94, '漁港', '不明', 'approximate', array[]::text[], array[]::text[], array['港の概略代表点であり、実釣位置、堤防先端、入口、駐車位置、危険箇所を示しません。', '一般立入・釣り可否は未確認です。現地表示と管理者の最新案内を確認してください。', '過去の魚種・設備・地形情報は地点詳細の参考情報であり、現在の釣果や利用可否を保証しません。']::text[], true),
  ('minatohama-port', '湊浜漁港', '唐津湾沿岸', 33.526093, 129.95497, '漁港', '不明', 'approximate', array[]::text[], array[]::text[], array['港の概略代表点であり、実釣位置、堤防先端、入口、駐車位置、危険箇所を示しません。', '一般立入・釣り可否は未確認です。現地表示と管理者の最新案内を確認してください。', '過去の魚種・設備・地形情報は地点詳細の参考情報であり、現在の釣果や利用可否を保証しません。']::text[], true),
  ('nagoya-port', '名護屋漁港', '呼子・鎮西', 33.53261, 129.877582, '漁港', '不明', 'approximate', array[]::text[], array[]::text[], array['港の概略代表点であり、実釣位置、堤防先端、入口、駐車位置、危険箇所を示しません。', '一般立入・釣り可否は未確認です。現地表示と管理者の最新案内を確認してください。', '過去の魚種・設備・地形情報は地点詳細の参考情報であり、現在の釣果や利用可否を保証しません。']::text[], true),
  ('yobuko-port', '呼子漁港', '呼子・鎮西', 33.54585, 129.89076, '漁港', '不明', 'approximate', array[]::text[], array[]::text[], array['港の概略代表点であり、実釣位置、堤防先端、入口、駐車位置、危険箇所を示しません。', '一般立入・釣り可否は未確認です。現地表示と管理者の最新案内を確認してください。', '過去の魚種・設備・地形情報は地点詳細の参考情報であり、現在の釣果や利用可否を保証しません。']::text[], true),
  ('takakushi-port', '高串漁港', '肥前・玄海沿岸', 33.4225, 129.826, '漁港', '不明', 'approximate', array[]::text[], array[]::text[], array['港の概略代表点であり、実釣位置、堤防先端、入口、駐車位置、危険箇所を示しません。', '一般立入・釣り可否は未確認です。現地表示と管理者の最新案内を確認してください。', '過去の魚種・設備・地形情報は地点詳細の参考情報であり、現在の釣果や利用可否を保証しません。']::text[], true),
  ('hatazu-fishing-port', '波多津漁港', '伊万里湾東岸', 33.3908, 129.8723, '漁港', '不明', 'approximate', array[]::text[], array[]::text[], array['地点の概略代表点であり、実釣位置、入口、駐車位置、危険箇所を示しません。', '一般立入・釣り可否は未確認です。現地表示と管理者の最新案内を確認してください。', '根拠のない魚種・釣法・SCORE情報は追加していません。']::text[], true),
  ('imarin-beach', 'イマリンビーチ', '伊万里湾東岸', 33.353857, 129.846813, 'サーフ', '不明', 'approximate', array[]::text[], array[]::text[], array['地点の概略代表点であり、実釣位置、入口、駐車位置、危険箇所を示しません。', '一般立入・釣り可否は未確認です。現地表示と管理者の最新案内を確認してください。', '根拠のない魚種・釣法・SCORE情報は追加していません。']::text[], true),
  ('tabira-port', '田平港', '平戸', 33.362153, 129.574114, 'その他', '不明', 'approximate', array[]::text[], array[]::text[], array['国土地理院の地名代表点を基準にした田平港の概略代表点であり、港内の岸壁、入口、駐車位置、堤防先端、実釣位置、危険箇所を示しません。', '一般立入・釣り可否は未確認のため、現地表示と管理者の最新案内を確認してください。', '魚種・釣法は日付・地点・遊漁文脈を伴う直接根拠不足のため掲載していません。']::text[], true),
  ('hirado-port', '平戸港', '平戸', 33.37096, 129.553782, 'その他', '不明', 'approximate', array[]::text[], array[]::text[], array['国土地理院の地名代表点を基準にした港湾の概略代表点であり、入口、岸壁、堤防先端、駐車位置、実釣位置、危険箇所を示しません。', '一般立入・釣り可否は未確認のため、現地表示と管理者の最新案内を確認してください。', '魚種・釣法・設備・地形・SCORE情報は直接根拠不足のため掲載していません。']::text[], true),
  ('hirado-seto', '平戸瀬戸周辺', '平戸', 33.363946, 129.569344, 'その他', '不明', 'approximate', array[]::text[], array[]::text[], array['国土地理院の地名代表点を基準にした平戸瀬戸周辺の広域district概略代表点です。田平港と平戸港を包含する水道文脈であり、港、橋、橋脚、灯台、堤防先端、磯入口、駐車位置、危険箇所、実釣位置を示しません。', '一般立入・釣り可否は未確認のため、現地表示と管理者の最新案内を確認してください。', '魚種・釣法は日付・地点・遊漁文脈を伴う直接根拠不足のため掲載していません。']::text[], true),
  ('ikitsuki-area', '生月島方面', '平戸', 33.39, 129.564, 'その他', '不明', 'approximate', array[]::text[], array[]::text[], array['生月島方面の広域district概略代表点であり、港、橋、橋脚、灯台、堤防先端、磯入口、駐車位置、危険箇所、実釣位置を示しません。', '一般立入・釣り可否は未確認のため、現地表示と管理者の最新案内を確認してください。', '魚種・釣法は日付・地点・遊漁文脈を伴う直接根拠不足のため掲載していません。']::text[], true)
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
  ('user-self-report', '本人の釣果', 'other', array['糸島', '唐津', '伊万里湾', '平戸']::text[], 'https://fish-forecast-map.vercel.app', 'manualOnly', 'unchecked', 'unchecked', '2026-07-12'::date, array[]::text[], 'ユーザー本人が自分の釣果を記録するための内部固定source。外部サイト取得やスクレイピングには使わない。', array['既存ExternalCatchMemo/source_registry互換のための内部source。', '画面では情報元として入力させず、新規本人登録時に自動設定する。']::text[], true),
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
