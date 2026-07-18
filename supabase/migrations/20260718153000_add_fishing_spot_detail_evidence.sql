-- Post-MVP-065 / Issue #180: fishing spot detail values, evidence sources, and provenance.
-- Forward-only expand migration. This does not alter or seed existing fishing_spots rows.

create table if not exists public.fishing_spot_detail_item_definitions (
    item_key text primary key,
    category text not null,
    value_kind text not null,
    label_ja text not null,
    description text,
    display_order integer not null default 0,
    is_active boolean not null default true,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint fishing_spot_detail_item_definitions_category_check check (category = any (array['basic', 'facility', 'access', 'restriction', 'terrain', 'hydrology', 'safety']::text[])),
    constraint fishing_spot_detail_item_definitions_value_kind_check check (value_kind = any (array['text', 'text_list', 'boolean', 'number', 'status', 'enum', 'json']::text[]))
);

alter table public.fishing_spot_detail_item_definitions enable row level security;

create table if not exists public.fishing_spot_detail_values (
    id uuid primary key default gen_random_uuid(),
    spot_id text not null references public.fishing_spots(id) on update cascade on delete cascade,
    item_key text not null references public.fishing_spot_detail_item_definitions(item_key) on update cascade on delete restrict,
    information_state text not null,
    value_text text,
    value_text_list text[] not null default '{}'::text[],
    value_number numeric,
    value_boolean boolean,
    value_json jsonb,
    unit text,
    confidence text,
    contribution_origin text not null default 'curated_research',
    contributor_id uuid references auth.users(id) on update cascade on delete set null,
    submitted_at timestamptz,
    moderation_status text not null default 'not_required',
    review_status text not null default 'pending_review',
    adoption_status text not null default 'adopted',
    note text,
    internal_note text,
    checked_at date,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint fishing_spot_detail_values_information_state_check check (information_state = any (array['has_evidence', 'weak_evidence', 'researched_unknown', 'unresearched', 'rejected']::text[])),
    constraint fishing_spot_detail_values_confidence_check check (confidence is null or confidence = any (array['high', 'medium', 'low']::text[])),
    constraint fishing_spot_detail_values_origin_check check (contribution_origin = any (array['curated_research', 'user_contribution']::text[])),
    constraint fishing_spot_detail_values_moderation_status_check check (moderation_status = any (array['not_required', 'pending', 'approved', 'rejected']::text[])),
    constraint fishing_spot_detail_values_review_status_check check (review_status = any (array['pending_review', 'reviewed', 'needs_recheck']::text[])),
    constraint fishing_spot_detail_values_adoption_status_check check (adoption_status = any (array['adopted', 'candidate', 'not_adopted']::text[])),
    constraint fishing_spot_detail_values_no_confidence_without_information_check check ((information_state in ('researched_unknown', 'unresearched') and confidence is null) or information_state not in ('researched_unknown', 'unresearched')),
    constraint fishing_spot_detail_values_user_submission_check check ((contribution_origin = 'user_contribution' and submitted_at is not null) or contribution_origin <> 'user_contribution'),
    constraint fishing_spot_detail_values_text_list_no_nulls_check check (array_position(value_text_list, null::text) is null)
);

alter table public.fishing_spot_detail_values enable row level security;

create table if not exists public.fishing_spot_detail_sources (
    id uuid primary key default gen_random_uuid(),
    source_type text not null,
    source_name text not null,
    source_url text,
    checked_on date,
    note text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint fishing_spot_detail_sources_type_check check (source_type = any (array['official', 'shop', 'portal', 'map', 'field_research', 'user_report', 'other']::text[])),
    constraint fishing_spot_detail_sources_url_check check (source_url is null or source_url ~ '^https?://'::text)
);

alter table public.fishing_spot_detail_sources enable row level security;

create table if not exists public.fishing_spot_detail_value_sources (
    detail_value_id uuid not null references public.fishing_spot_detail_values(id) on update cascade on delete cascade,
    source_id uuid not null references public.fishing_spot_detail_sources(id) on update cascade on delete restrict,
    relation text not null,
    note text,
    created_at timestamptz not null default now(),
    primary key (detail_value_id, source_id),
    constraint fishing_spot_detail_value_sources_relation_check check (relation = any (array['supporting', 'checked', 'contradicting']::text[]))
);

alter table public.fishing_spot_detail_value_sources enable row level security;

create index if not exists fishing_spot_detail_values_spot_item_idx on public.fishing_spot_detail_values (spot_id, item_key);
create index if not exists fishing_spot_detail_values_origin_status_idx on public.fishing_spot_detail_values (contribution_origin, moderation_status, adoption_status);
create index if not exists fishing_spot_detail_sources_type_checked_idx on public.fishing_spot_detail_sources (source_type, checked_on desc);

create policy "Public read fishing spot detail item definitions" on public.fishing_spot_detail_item_definitions for select to anon, authenticated using (is_active = true);
create policy "Public read adopted fishing spot detail values" on public.fishing_spot_detail_values for select to anon, authenticated using (adoption_status = 'adopted' and moderation_status in ('not_required', 'approved'));
create policy "Public read fishing spot detail sources" on public.fishing_spot_detail_sources for select to anon, authenticated using (true);
create policy "Public read fishing spot detail value sources" on public.fishing_spot_detail_value_sources for select to anon, authenticated using (true);

grant select on table public.fishing_spot_detail_item_definitions to anon, authenticated;
grant select on table public.fishing_spot_detail_values to anon, authenticated;
grant select on table public.fishing_spot_detail_sources to anon, authenticated;
grant select on table public.fishing_spot_detail_value_sources to anon, authenticated;

insert into public.fishing_spot_detail_item_definitions (item_key, category, value_kind, label_ja, description, display_order) values
('target_species', 'basic', 'text_list', '対象魚種', '地点ごとの対象魚種。既存マスター配列とは別に根拠つきで管理する。', 10),
('recommended_methods', 'basic', 'text_list', '推奨釣法', '地点ごとの推奨釣法。', 20),
('shore_access', 'access', 'status', '足場', '足場の状態。', 30),
('toilet', 'facility', 'status', 'トイレ', 'トイレ有無または確認状態。', 40),
('lighting', 'facility', 'status', '常夜灯・照明', '照明有無または確認状態。', 50),
('parking', 'facility', 'status', '駐車場', '駐車可能性や確認状態。', 60),
('access', 'access', 'text', 'アクセス情報', 'アクセスに関する補足。', 70),
('restriction_status', 'restriction', 'status', '禁止・閉鎖等の状態', '釣り禁止、立入禁止、工事、閉鎖などの状態。', 80),
('depth', 'terrain', 'number', '水深', '参考水深。航海・安全判断には使用しない。', 90),
('bottom_material', 'terrain', 'text_list', '底質', '砂、岩、藻場などの底質。', 100),
('coastal_topography', 'terrain', 'text_list', '海底・沿岸地形', 'かけあがり、ワンドなどの地形。', 110),
('obstacles', 'terrain', 'text_list', 'テトラ・根・障害物', 'テトラ、根、障害物など。', 120),
('spot_features', 'terrain', 'text_list', '堤防・磯・サーフ等の特徴', '釣り場形状や特徴。', 130),
('water_flow_influences', 'hydrology', 'text_list', '潮通し・河川影響・外海影響', '潮通し、河川、外海の影響。', 140)
on conflict (item_key) do nothing;
