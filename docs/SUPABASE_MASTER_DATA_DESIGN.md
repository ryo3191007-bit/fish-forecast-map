# SupabaseマスターデータDB化設計

## 目的

Post-MVP-018では、既存の静的データとして持っている魚種、釣り場、外部情報元レジストリを、将来Supabase/PostgreSQLへ移すための設計を整理します。

Post-MVP-018時点では、このドキュメントは設計のみを扱い、SQLファイル、DBマイグレーション、実テーブル、RLS SQL、seedデータ、Supabaseクライアント変更、API Route、UI変更、localStorage key変更、外部メモDB保存、認証導入、型生成、実Project URLや実キーの追加は行いませんでした。Post-MVP-019では、設計に沿ったSQL定義ファイルを追加し、Post-MVP-020では既存静的データに対応するseed SQL、手動実行手順、ローカル差分確認スクリプトを追加しています。

## 対象テーブル

今回のDB化設計対象は、読み取り専用の共有マスター候補である以下3テーブルです。

- `fish_species`
- `fishing_spots`
- `source_registry`

これらは認証導入前でもanon roleでselectできる公開マスターとして扱います。一方で、insert/update/deleteはanon roleへ許可せず、管理更新の方法は後続Issueで検討します。

## 既存データの所在と用途

| 種別 | 現在の所在 | 主な項目 | 現在の用途 | localStorageとの関係 | DB化時の扱い |
| --- | --- | --- | --- | --- | --- |
| 魚種マスター | `src/domain/fishing.ts` | `fishSpeciesNames`, `FishSpeciesName`, `FishSpecies`, `SpeciesCategory`, `seasonMonths` | 釣果、釣り場、フィルタ、スコア対象魚種の型制約 | 外部メモは魚種名を保存するが、魚種マスター自体はlocalStorageに保存しない | 共有マスター化し、既存TypeScript型はDB移行中のfallbackと型安全の補助に残す |
| 釣り場マスター | `src/data/fishingSpots.ts` / `src/domain/fishingSpot.ts` | `id`, `name`, `areaName`, `latitude`, `longitude`, `spotType`, `shoreAccess`, `targetSpecies`, `recommendedMethods`, `notes`, `coordinatePrecision` | 地図マーカー、地点詳細、対象魚種、釣法、スコア表示の基礎データ | 外部メモは推定地点や `spotId` と関連し得るが、釣り場マスター自体はlocalStorageに保存しない | 最初のDB化候補。静的データを正本にした二重管理期間を置き、DB読み取り実装後に正本を切り替える |
| 情報源レジストリ | `src/data/externalSources.ts` / `src/domain/externalSource.ts` | `sourceId`, `sourceName`, `sourceType`, `targetAreaNames`, `baseUrl`, `crawlPolicy`, `robotsStatus`, `termsStatus`, `reviewedAt`, `reviewUrls`, `reviewSummary`, `notes` | 外部情報元の利用可否、手動参照、出典確認、データポリシー整理 | 外部メモは情報元名・URLを保存し得るが、レジストリ自体はlocalStorageに保存しない | 共有マスター化してレビュー状態を管理しやすくする。ただしDB化は自動収集許可を意味しない |

## 共通設計方針

- 主キーは既存静的データと対応しやすい、人間が読める安定IDを第一候補にします。
- カラム名はDBではsnake_case、TypeScriptでは既存camelCaseを維持し、変換層は後続Issueで設計します。
- 共有マスターは原則として `created_at` / `updated_at` を持たせます。
- 表示と参照に必須の値は `not null`、外部レビュー状況や補足説明など未確定になり得る値はnullableまたは空配列を許容します。
- 配列項目は初期実装ではPostgreSQL配列または `jsonb` 候補とし、正規化が必要になった段階で中間テーブル化を検討します。
- 公開地点は個人利用段階でも詳細座標を過度に出さず、`coordinate_precision` で丸め・概略・正確の区別を保持します。
- 実キー、実URL、DB password、service role keyはテーブルにもドキュメントにも含めません。

## `fish_species` 設計案

### 目的

アプリで扱う魚種・魚種カテゴリを共有マスターとして管理し、釣り場、釣果、外部メモ、将来のDB型生成で参照しやすくします。

### 主キー候補

| 候補 | 方針 |
| --- | --- |
| `id text primary key` | 第一候補。例: `aji`, `saba`, `aomono`, `rockfish`。日本語名変更や表記揺れがあっても安定させる |
| `uuid` | 今回は優先しない。seedや既存静的データとの対応が読みにくくなるため |

### カラム候補

| カラム | 型候補 | null方針 | 説明 |
| --- | --- | --- | --- |
| `id` | `text` | `not null` | 安定ID。既存の日本語名とは別に保持 |
| `name_ja` | `text` | `not null` | 表示用日本語名。既存 `FishSpeciesName` に対応 |
| `category` | `text` | `not null` | `fish` / `squid` / `category` のような分類 |
| `season_months` | `smallint[]` または `jsonb` | `not null`, 空配列可 | 釣れやすい月の候補。月は1〜12の範囲 |
| `display_order` | `integer` | `not null` | UI表示順とseedの安定化に使う |
| `is_active` | `boolean` | `not null` | 後から非表示化するためのフラグ |
| `created_at` | `timestamptz` | `not null` | 作成日時 |
| `updated_at` | `timestamptz` | `not null` | 更新日時 |

### unique制約候補

- `id` primary key。
- `name_ja` unique。ただし将来の別名、地方名、表記揺れを扱う場合は別名テーブルを検討します。
- `display_order` uniqueは必須にしません。同順位を許容する可能性があるためです。

### index候補

- primary key index: `id`。
- unique index: `name_ja`。
- lookup用: `category`。
- 表示順用: `display_order`。

### 将来追加しそうな項目

- `name_en`。
- `aliases` または `fish_species_aliases`。
- Issue #215では `entity_type`、`is_selectable`、`parent_group_id`、`ui_subgroup` をadditiveに追加します。第1バッチは各個別魚種が最大1つの表示・フィルタグループに属するため単一親を採用し、複数所属が必要になるまではmembership tableを導入しません。
- `aomono` / `rockfish` は `species_group` かつ選択不可として残し、既存記録は推測変換せずlegacy aggregate表示にします。ハタ類は個別IDのまま `rockfish` 配下のUI小分類として扱います。
- `default_methods`。
- `description`。

## `fish_species_aliases`（Issue #196で実装）

魚種本体は既存の人が読める `text` ID（`aji`、`chinu` など）を維持し、別名行だけをUUIDで識別します。正式表示名も承認済み別名として登録するため、正式名と別名は同じ完全一致経路と一意性制約を通ります。

- 照合キーは **NFKC → 前後空白除去 → 小文字化** のみで生成します。内部文字・記号の削除、部分一致、読み仮名・AI推測は行いません。
- resolverが参照するのは `approved` かつ `is_active = true` の行だけです。この状態の `match_key` はDBで全魚種を通じて一意です。
- `approved_by` はAuth管理者基盤に依存しない監査文字列、`approved_at` は承認日時として保持します。今回のseedは `migration:issue-196` を記録します。
- 公開クライアントの `anon` / `authenticated` は承認済み・有効行をselectできるだけで、書き込み権限を持ちません。
- 初期追加別名は `チヌ`、`黒鯛`、`クロダイ` → `chinu` に限定します（ほかの14正式名はcanonical照合行として登録）。
- 未登録値は `unresolved`、不整合による複数候補は `conflict` としてfail-closedに扱い、既存の入力文字列を一括更新・削除しません。

### 既存静的データとの対応

既存の `fishSpeciesNames` の15件を初期候補にします。`青物` と `根魚` は魚種ではなくカテゴリとして扱う現行方針を維持し、`category = 'category'` とする案を第一候補にします。

## `fishing_spots` 設計案

### 目的

地図表示、地点詳細、対象魚種、推奨釣法、将来の釣果・外部メモ参照の中心となる釣り場共有マスターを管理します。

### 主キー候補

| 候補 | 方針 |
| --- | --- |
| `id text primary key` | 第一候補。既存 `src/data/fishingSpots.ts` の `id` を維持し、URLや外部メモ参照との対応を保つ |
| `uuid` | 今回は優先しない。既存の静的IDとfallbackの対応が複雑になるため |

### カラム候補

| カラム | 型候補 | null方針 | 説明 |
| --- | --- | --- | --- |
| `id` | `text` | `not null` | 既存 `FishingSpot.id` に対応する安定ID |
| `name` | `text` | `not null` | 釣り場名 |
| `area_name` | `text` | `not null` | 糸島西岸、唐津湾、伊万里湾、平戸など |
| `latitude` | `numeric(9,6)` または `double precision` | `not null` | 表示用緯度。公開時は精度に注意 |
| `longitude` | `numeric(9,6)` または `double precision` | `not null` | 表示用経度。公開時は精度に注意 |
| `spot_type` | `text` | `not null` | 漁港、堤防、サーフ、地磯、磯場、河口、湾岸、その他 |
| `shore_access` | `text` | `not null` | 足場良い、注意必要、上級者向け、不明 |
| `coordinate_precision` | `text` | `not null` | `exact` / `approximate` / `rounded` |
| `target_species` | `text[]` または `jsonb` | `not null`, 空配列可 | 初期は既存配列を維持。将来は中間テーブル候補 |
| `recommended_methods` | `text[]` または `jsonb` | `not null`, 空配列可 | 推奨釣法の配列 |
| `notes` | `text[]` または `jsonb` | `not null`, 空配列可 | 危険箇所を詳細化しない等の補足 |
| `is_active` | `boolean` | `not null` | 非表示化・廃止地点対応 |
| `created_at` | `timestamptz` | `not null` | 作成日時 |
| `updated_at` | `timestamptz` | `not null` | 更新日時 |

### unique制約候補

- `id` primary key。
- `name`, `area_name` の複合unique候補。ただし同名地点があり得る場合は厳格にしすぎないよう注意します。
- `latitude`, `longitude` のuniqueは付けません。代表点や丸め座標が重複する可能性があるためです。

### index候補

- primary key index: `id`。
- 絞り込み用: `area_name`。
- 絞り込み用: `spot_type`。
- 安全・表示制御用: `coordinate_precision`。
- 地図範囲検索が必要になった場合: `latitude`, `longitude` の複合index、またはPostGIS導入後の地理index。
- 配列検索を多用する場合: `target_species` / `recommended_methods` のGIN index候補。ただし初期SQLでは必要性を確認してから追加します。

### 将来追加しそうな項目

- `prefecture`、`municipality`。
- `geom`。PostGIS導入時の地点geometry。
- `public_location_level`。公開用の丸め粒度。
- `safety_notes`。
- `access_notes`。
- `parking_notes`。公開時は混雑助長や迷惑駐車につながらないか注意します。
- `closed_or_restricted`。立入禁止や工事情報を反映する場合の候補。

### 既存静的データとの対応

既存 `fishingSpots` の各要素を1行に対応させます。`targetSpecies` と `recommendedMethods` は初期移行では配列として保持し、参照整合性が必要になった段階で `fishing_spot_species` や `fishing_spot_methods` の中間テーブルを後続Issueで検討します。

## `source_registry` 設計案

### 目的

外部情報元ごとの出典確認、手動参照可否、robots.txt・利用規約レビュー状態、将来の外部メモ入力補助を共有マスターとして管理します。

DB化しても、外部サイトアクセス、スクレイピング、定期実行、AI解析、自動収集を許可するものではありません。MVP/Post-MVPの方針どおり、本文全文や画像コピーは保存しません。

### 主キー候補

| 候補 | 方針 |
| --- | --- |
| `source_id text primary key` | 第一候補。既存 `ExternalSource.sourceId` を維持する |
| `uuid` | 今回は優先しない。既存レジストリとの対応が読みにくくなるため |

### カラム候補

| カラム | 型候補 | null方針 | 説明 |
| --- | --- | --- | --- |
| `source_id` | `text` | `not null` | 安定ID |
| `source_name` | `text` | `not null` | 表示名 |
| `source_type` | `text` | `not null` | `shop` / `portal` / `tide` / `sns_like` / `other` |
| `target_area_names` | `text[]` または `jsonb` | `not null`, 空配列可 | 対象エリア候補 |
| `base_url` | `text` | `not null` | 情報元の基底URL。実キーや認証情報は含めない |
| `crawl_policy` | `text` | `not null` | `allowed` / `manualOnly` / `referenceOnly` / `unknown` |
| `robots_status` | `text` | `not null` | `unchecked` / `allowed` / `disallowed` / `partial` / `unknown` |
| `terms_status` | `text` | `not null` | `unchecked` / `allowed` / `restricted` / `unknown` |
| `reviewed_at` | `date` | nullable | レビュー実施日。未確認ならnull |
| `review_urls` | `text[]` または `jsonb` | `not null`, 空配列可 | 確認したURL。本文転載はしない |
| `review_summary` | `text` | nullable | レビュー要約 |
| `notes` | `text[]` または `jsonb` | `not null`, 空配列可 | 補足メモ |
| `is_active` | `boolean` | `not null` | 表示・入力候補として使うか |
| `created_at` | `timestamptz` | `not null` | 作成日時 |
| `updated_at` | `timestamptz` | `not null` | 更新日時 |

### unique制約候補

- `source_id` primary key。
- `base_url` unique候補。ただし同一ドメイン内の別サービスを分ける可能性があるため、必要性を確認してから付与します。
- `source_name` は表記変更や同名サービスの可能性があるためunique必須にはしません。

### index候補

- primary key index: `source_id`。
- 絞り込み用: `source_type`。
- 方針確認用: `crawl_policy`。
- レビュー管理用: `terms_status`, `robots_status`。
- 再レビュー候補抽出用: `reviewed_at`。

### 将来追加しそうな項目

- `last_policy_checked_at`。
- `permission_status`。個別許諾を得た場合の状態管理。
- `contact_url`。
- `rss_url`。利用許諾や規約確認後に限定して検討します。
- `data_usage_notes`。

### 既存静的データとの対応

既存 `externalSources` の各要素を1行に対応させます。`crawlPolicy` が `allowed` に見える場合でも、DB化だけで自動収集を始めず、後続Issueで利用規約、robots.txt、アクセス負荷、著作権、許諾の確認を行います。

## RLS / 権限方針

### 認証導入前

- 3つの共有マスターは読み取り専用の公開データとして扱います。
- RLSは有効化する方針です。
- anon roleにはselectのみ許可します。
- anon roleにはinsert/update/deleteを許可しません。
- authenticated roleも、当面はselectのみを基本とします。
- 管理更新はSupabase Dashboard、SQL Editor、サーバー側管理処理などの候補を後続Issueで比較します。
- service role keyはクライアントでは絶対に使いません。

### 認証導入後

- `fish_species` / `fishing_spots` / `source_registry` は引き続き共有マスターとして扱い、一般ユーザーの書き込みを許可しません。
- 管理者更新が必要になった場合は、管理者ロール、サーバー側処理、承認フローを別Issueで設計します。
- ユーザー所有データである外部メモや釣果日記とはRLSポリシーを分けます。
- service role keyやDB URLを使う処理はサーバー側・CI・管理作業に限定し、ブラウザバンドル、Issue、PR、ログへ出しません。

## 移行順序とfallback方針

1. このドキュメントで設計を合意します。
2. 後続IssueでSQLとRLS SQLを作成します。この段階でもアプリからの参照切替は行いません。
3. seed dataを作成し、既存静的データと件数・ID・主要項目が一致するか確認します。
4. 最初にDB化するテーブルは、地図や外部メモ参照の中心になる `fishing_spots` を第一候補にします。ただし参照整合性を重視する場合は `fish_species` を先に作成してもよいです。
5. `source_registry` は外部メモ設計や出典管理の前提としてDB化しますが、自動収集や外部アクセスは開始しません。
6. アプリ画面からの参照切替は、読み取り専用select、RLS、fallback、エラー表示方針を別Issueで実装してから行います。
7. 移行中は既存静的データをfallbackとして残します。Supabase未設定、通信失敗、RLS不備、データ不整合がある場合は静的データで表示できる状態を維持します。
8. DBを正本に切り替えるまでは、静的データとseed dataの二重管理期間を明示します。更新時はどちらを正本にするかPRで確認します。
9. rollbackは、参照切替コードを静的データ優先へ戻すだけで画面表示を復旧できる単位に分割します。
10. localStorageの `fish-forecast-map.external-catch-memos` は今回変更しません。外部メモDB保存やlocalStorage移行は、認証・ユーザー分離設計後の別Issueで扱います。

## Post-MVP-019 SQL定義ファイル

- マスターデータ3テーブルの初期SQL定義は `supabase/sql/002_master_data_tables.sql` に追加しました。
- このSQLは `fish_species` / `fishing_spots` / `source_registry` の `create table if not exists`、必要最小限の制約・index、RLS有効化、anon/authenticated roleへのselect権限のみを定義します。
- 現時点ではSupabase SQL Editorで未実行であり、実DBテーブルは未作成です。
- seedデータは未作成で、既存静的データの移行も未実施です。
- アプリ画面連携、Supabaseクライアント変更、API Route追加、型生成は未実装です。
- 次の候補は、SQL手動実行手順の整備または既存静的データに対応するseedデータ作成です。

## 後続Issue候補

- `supabase/sql/002_master_data_tables.sql` のSQL手動実行手順を整備する。
- 既存静的データからseed dataを作成する。
- seedと既存静的データの差分確認スクリプトを検討する。
- Supabaseから読み取り、失敗時に既存静的データへfallbackする実装を行う。
- DB型生成の導入方針を整理する。
- 外部メモDB保存設計を作成する。
- 認証導入とユーザー所有データRLSを設計する。
- 釣り場座標の公開粒度、危険地点、小場所保護の運用ルールを更新する。
- source registryの再レビュー頻度と許諾取得フローを設計する。

## 今回の対象外

Post-MVP-019時点でも、以下は未実施です。

- DBマイグレーション実行。
- Supabase SQL Editorでの実行。
- 実テーブル作成。
- seedデータ作成。
- Supabaseクライアント変更。
- アプリ画面からSupabaseを呼び出すこと。
- API Route追加。
- UI変更。
- localStorage key変更。
- localStorage移行実装。
- external catch memo DB保存。
- 認証導入。
- 型生成。
- 実Project URL、実anon key、実service role key、実DB URL、DB passwordの追加。
- `.env.local` のコミット。
- 外部サイトアクセス。
- スクレイピング。
- 定期実行ジョブ。
- AI解析。
- 新API追加。
- 有料API追加。

## Post-MVP-020 seed SQLと差分確認

- テーブル定義SQL: `supabase/sql/002_master_data_tables.sql`。
- seed SQL: `supabase/sql/003_master_data_seed.sql`。
- 手動実行手順: `docs/SUPABASE_MASTER_DATA_SETUP.md`。
- ローカル差分確認: `npm run check:master-seed`。

`003_master_data_seed.sql` は `insert ... on conflict ... do update` で再実行しやすい形にし、既存静的データのID/件数とズレがないかをDB接続なしで確認できます。この段階ではSupabase SQL Editorでの実行、実DBへのseed投入、アプリ画面からのSupabase参照はまだ行いません。

## Issue #180: 地点詳細・根拠・信憑性管理の追加設計

### 目的と範囲

Issue #180では、既存の `fishing_spots` 共有マスターを破壊せず、地点詳細を項目単位でSupabaseに保持するためのexpand migrationを追加します。17地点の初期データ投入、地点評価UIの再構成、ユーザー投稿UI/API、SCORE v2、本番DBへの手動反映は対象外です。

### テーブル構成

| テーブル | 責務 |
| --- | --- |
| `fishing_spot_detail_item_definitions` | `target_species`、`toilet`、`depth`などの項目定義。項目名を専用列へ固定せず、後続UIが項目定義を参照できる汎用構造にします。 |
| `fishing_spot_detail_values` | 地点にひもづく項目値、情報状態、信憑性、由来、レビュー状態、採否を保持します。 |
| `fishing_spot_detail_sources` | source種別、名称、URL、確認日、noteを保持します。 |
| `fishing_spot_detail_value_sources` | 項目値とsourceの関連を `supporting` / `checked` / `contradicting` で保持します。 |

項目定義の初期レコードは項目名だけを投入し、17地点の値データは投入しません。最低限、対象魚種、推奨釣法、足場、トイレ、常夜灯・照明、駐車場、アクセス情報、禁止・閉鎖等の状態、水深、底質、海底・沿岸地形、テトラ・根・障害物、堤防・磯・サーフ等の特徴、潮通し・河川影響・外海影響を表現できます。

### 情報状態と信憑性の区別

`fishing_spot_detail_values.information_state` は次を保持します。

- `has_evidence`: 情報があり根拠も保持している。
- `weak_evidence`: 情報はあるが根拠が弱い。UIでは `信憑性：低` の候補になる。
- `researched_unknown`: 調査したが判断できない。UIでは `情報なし` の候補になり、信憑性ラベルは付けない。
- `unresearched`: 未調査。UIでは `情報なし` の候補になり、信憑性ラベルは付けない。
- `rejected`: 採用しない情報。

`confidence` は `high` / `medium` / `low` / `null` です。`researched_unknown` と `unresearched` では `confidence is null` をDB制約で要求し、`情報なし` と `信憑性：低` をデータ上で明確に分離します。アプリ側mapperも `unknown` や `null` を具体値へ推測変換せず、未知のenum値は行ごと除外します。

### curated/research と user contribution

`contribution_origin` は `curated_research` / `user_contribution` を保持します。将来の投稿機能に備え、`contributor_id`、`submitted_at`、`moderation_status`、`review_status`、`adoption_status` を同じ値テーブルに用意します。`user_contribution` の登録時状態は `moderation_status = 'pending'` / `review_status = 'pending_review'` / `adoption_status = 'candidate'` を前提にし、`moderation_status = 'not_required'` は許可しません。承認後は `moderation_status = 'approved'` / `review_status = 'reviewed'` / `adoption_status = 'adopted'` を許可しますが、`approved` かつ `reviewed` でない `user_contribution` は `adopted` にできません。採用後も `contribution_origin = 'user_contribution'` を維持します。今回のPRでは投稿UI/APIやanon write権限は追加しません。

### RLS・権限

追加4テーブルはすべてRLSを有効化します。読み取りは既存共有マスター方針に合わせ、`anon` と `authenticated` に `select` のみをgrantします。`insert` / `update` / `delete` / `all privileges` は付与しません。値テーブルの公開select policyは `adoption_status = 'adopted'` かつ `review_status = 'reviewed'` を必須にします。`curated_research` は `moderation_status in ('not_required', 'approved')`、`user_contribution` は `moderation_status = 'approved'` の場合だけ公開します。anon/authenticated向けの値テーブル列grantには `contribution_origin` を含め、`contributor_id` は含めません。source・中間テーブルも公開値に関連する行だけ参照可能にします。

### fallbackとアプリ側利用

`src/lib/fishingSpotDetailRepository.ts` はSupabase未設定・取得失敗時に、既存 `fishing_spots` の対象魚種・推奨釣法・足場から作る静的fallbackを返します。足場などの `不明` や空文字は具体値ではなく `unresearched` / `confidence = null` の情報なし扱いにし、fallback値は初期状態として `adoption_status = 'candidate'` のまま返します。既存の `fishing_spots` 静的マスターには変更を加えないため、地点一覧・地図・既存スコア表示は壊しません。source noteや値noteは型・mapperでは保持しますが、今回UIへ自動表示しません。

### 復旧方針

このmigrationはforward-onlyのexpand変更で、既存テーブルの削除・列削除・大量更新・RLS無効化を行いません。問題発生時はアプリ側が静的fallbackで動作継続できます。DB適用後に戻す必要がある場合は、次のforward migrationで追加テーブルのRLS policy / grantを閉じて参照を停止し、必要に応じてバックアップ取得後に追加テーブルを削除する復旧migrationをユーザー承認のうえ作成します。
