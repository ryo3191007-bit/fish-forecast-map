# データ永続化計画

## 目的

このドキュメントは、Supabase/PostgreSQLを導入する前に、Fish Forecast Mapで永続化するデータ、localStorageに残すデータ、都度取得・算出でよいデータを整理するための設計メモです。

このIssueでは設計のみを扱い、Supabaseプロジェクト作成、DBマイグレーション、SQL実装、API Route追加、UI変更、localStorage移行実装は行いません。Post-MVP-016でSupabaseクライアント初期化層のみ最小導入済みです。読み取り専用の最小疎通確認は `docs/SUPABASE_READONLY_CONNECTION_CHECK.md` を参照し、次の候補は `fish_species` / `fishing_spots` / `source_registry` のDB化設計です。

## 現在のデータ保存状態

| データ | 現在の保存場所 | 現在の扱い | 課題 |
| --- | --- | --- | --- |
| モック釣果データ | `src/data/mockFishingReports.ts` | アプリ同梱の静的データ | ユーザーごとの追加・バックアップには向かない |
| 魚種データ | `src/domain/fishing.ts` | TypeScriptの定数・型 | DB化する場合は共有マスター候補 |
| 釣り場マスター | `src/data/fishingSpots.ts` | アプリ同梱の静的データ | 公開時は座標精度、危険地点、小場所保護の運用が必要 |
| 手動外部釣果メモ | ブラウザlocalStorage | ユーザー端末内に手動保存 | 複数端末同期、バックアップ、認証後の分離ができない |
| 外部情報元レジストリ | `src/data/externalSources.ts` | アプリ同梱の静的データ | レビュー状態やポリシー更新履歴の管理余地がある |
| Open-Meteo環境データ | クライアントで都度取得・画面内キャッシュ | 参考表示 | 正式な潮汐表、安全判断、航行判断には使わない |
| SCORE計算結果 | クライアントで都度算出 | 表示時の参考スコア | 履歴分析をする場合のみスナップショット保存候補 |
| 地図レイヤー設定 | React state | 表示中だけ保持 | 個人設定として残したい場合はlocalStorage候補 |
| フィルタ状態 | React state | 表示中だけ保持 | URL同期やユーザー設定化は別Issue候補 |

## データ分類

### localStorageに残すもの

| データ | 方針 | 理由 |
| --- | --- | --- |
| 地図レイヤー設定 | 当面はlocalStorage候補 | 端末ごとの表示好みであり、DB化の優先度は低い |
| フィルタ状態 | 原則は都度状態、必要ならlocalStorage候補 | 検索条件は短期的なUI状態で、共有・同期の必要性が低い |
| 認証前の手動外部釣果メモ | Supabase移行まで既存keyで維持 | 既存ユーザーの端末内データを壊さないため |
| DB移行前の一時バックアップ | 手動エクスポート/インポート候補 | 移行失敗時の復旧導線として有効 |

既存のlocalStorage key `fish-forecast-map.external-catch-memos` は、このIssueでは変更しません。

### Supabase/PostgreSQLへ移す候補

| データ | DB化候補度 | ユーザー分離 | 方針 |
| --- | --- | --- | --- |
| 魚種マスター | 中 | 共有 | 変更頻度は低いが、DB化後の参照整合性に役立つ |
| 釣り場マスター | 高 | 共有 | 釣果、外部メモ、SCORE履歴から参照する中心データにする |
| 手動外部釣果メモ | 高 | 必要 | 複数端末同期、バックアップ、ユーザー別管理の主対象 |
| ユーザー自身の釣果・釣果日記 | 高 | 必要 | 認証導入後の主要な永続化対象 |
| 外部情報元レジストリ | 中 | 共有 | 自動収集可否ではなく、手動参照・レビュー状態の共有マスターとして扱う |
| SCORE評価履歴 | 低〜中 | 用途次第 | 分析や比較が必要になった段階で保存する |
| ユーザー設定 | 中 | 必要 | 表示設定、既定エリアなどを複数端末で共有したい場合に保存する |

### 都度取得・算出でよいもの

| データ | 方針 | 注意 |
| --- | --- | --- |
| Open-Meteo Weather / Marine APIの環境データ | 都度取得・短期キャッシュ | 参考表示に限定し、安全判断・航行判断・公式潮汐表の代替にしない |
| 現在表示用のSCORE | 都度算出 | スコア根拠を説明可能にし、釣果保証表現を避ける |
| 地図表示用の一時状態 | React state | 永続化が必要な設定だけ後続Issueで切り出す |
| 絞り込み後の一覧 | 都度算出 | URL同期や保存検索条件は別Issueで検討する |

## Supabase/PostgreSQLテーブル候補

実装時は小さく始め、必要なテーブルだけを導入します。nullable方針は、必須の参照キー・出典・作成更新日時をできるだけ必須にし、外部情報由来で曖昧な地点・サイズ・匹数などはnullableを許容します。

| テーブル | 目的 | 主なカラム候補 | 主キー/FK候補 | インデックス候補 | 注意 | MVP必要度 |
| --- | --- | --- | --- | --- | --- | --- |
| `profiles` または `users_public_profile` | 認証ユーザーの最小プロフィール | `user_id`, `display_name`, `created_at`, `updated_at` | PK/FK: `user_id` -> auth users | `user_id` | 個人情報は最小限。公開名と内部IDを分ける | 認証導入時に必要 |
| `fish_species` | 魚種共有マスター | `id`, `name_ja`, `category`, `season_months`, `created_at`, `updated_at` | PK: `id` | `name_ja`, `category` | `青物`、`根魚`はカテゴリとして扱う | 中 |
| `fishing_spots` | 釣り場共有マスター | `id`, `name`, `area_name`, `latitude`, `longitude`, `spot_type`, `shore_access`, `coordinate_precision`, `notes`, `created_at`, `updated_at` | PK: `id` | `area_name`, `coordinate_precision`, 必要なら地理インデックス | 公開時は詳細座標の丸め、危険地点の除外を検討 | 高 |
| `catch_reports` | ユーザー自身の釣果・将来の釣果日記 | `id`, `user_id`, `caught_date`, `species_id`, `spot_id`, `area_name`, `method`, `catch_count`, `size_cm`, `memo`, `visibility`, `created_at`, `updated_at` | PK: `id`; FK: `user_id`, `species_id`, `spot_id` | `user_id`, `caught_date`, `species_id`, `spot_id` | 正確な位置、個人メモ、公開範囲に注意 | 認証後に高 |
| `external_catch_memos` | 手動外部釣果メモのDB保存 | `id`, `user_id`, `species`, `caught_date`, `area_name`, `estimated_spot_name`, `spot_id`, `latitude`, `longitude`, `coordinate_precision`, `method`, `catch_count`, `size_cm`, `source_id`, `source_name`, `source_url`, `acquisition_method`, `confidence`, `environment_match_notes`, `created_at`, `updated_at`, `imported_from_local_storage_at` | PK: `id`; FK: `user_id`, `spot_id`, `source_id` | `user_id`, `caught_date`, `spot_id`, `source_id`, `source_url` | 本文全文、画像、コメント全文、プロフィール詳細は保存しない | 高 |
| `source_registry` | 外部情報元レジストリ | `source_id`, `source_name`, `source_type`, `target_area_names`, `base_url`, `crawl_policy`, `robots_status`, `terms_status`, `notes`, `reviewed_at`, `review_urls`, `review_summary` | PK: `source_id` | `crawl_policy`, `source_type` | DB化しても自動収集許可を意味しない | 中 |
| `forecast_score_snapshots` または `score_evaluations` | SCORE算出結果の履歴保存 | `id`, `user_id`, `spot_id`, `species_id`, `score`, `reasons`, `input_summary`, `calculated_at` | PK: `id`; FK: `user_id`, `spot_id`, `species_id` | `spot_id`, `species_id`, `calculated_at` | まずは都度算出でよい。保存は分析目的が明確になってから | 低 |
| `user_preferences` | 表示・初期設定の同期 | `user_id`, `default_area`, `map_layer`, `filter_defaults`, `created_at`, `updated_at` | PK/FK: `user_id` | `user_id` | 個人設定のみ。検索履歴の過剰保存は避ける | 中 |

## 外部メモの保存方針

### 保存してよい情報

- 魚種。
- 釣果日。
- エリア。
- 推定地点名、または `spotId`。
- 座標を扱う場合の座標精度区分。
- 釣り方。
- 匹数。
- サイズ。
- 情報元名。
- 情報元URL。
- `acquisitionMethod`。
- `confidence`。
- 作成日時、更新日時。

### 保存しない情報

- 外部サイト本文全文。
- 第三者サイトの記事本文の長文転載。
- 画像コピー。
- コメント全文。
- 投稿者プロフィール詳細。
- スクレイピングで自動取得した本文。
- アプリ利用に不要な個人情報。
- 同意のない正確なユーザー現在地。

DB化しても、外部サイトの自動収集、スクレイピング、定期アクセス、AI解析はこの設計だけでは行いません。外部メモはユーザーが手動で登録した構造化された事実情報と出典URLを中心に扱います。

## localStorage keyの移行方針

対象keyは `fish-forecast-map.external-catch-memos` です。

- Supabase導入前は既存keyを維持し、データ構造を変更しません。
- 認証導入後、初回ログイン時にlocalStorage内の外部メモを検出し、ユーザー確認のうえDBへインポートする導線を検討します。
- 自動で即時削除せず、インポート成功後も一定期間は端末内バックアップとして残すか、ユーザー操作で削除できるようにします。
- localStorageとDBを長期的に二重の正本にしません。ログイン後の正本はDB、未ログイン時の一時保存はlocalStorage、という役割分担を目指します。
- 移行失敗時はlocalStorageを残し、再試行できるようにします。
- 重複防止は、`source_url`、`caught_date`、`species`、`area_name`、`spot_id`、`created_at`などを組み合わせた候補で判定します。ただし、完全一致だけで自動削除せず、重複候補として扱う設計が安全です。
- 手動エクスポート/インポートは、Supabase移行より先にバックアップ機能として分割Issue化できます。具体的なバックアップ/復元導線は `docs/LOCAL_STORAGE_BACKUP_PLAN.md` に整理します。

## 認証導入前後の方針

### 認証導入前

- 個人用/単一ユーザー前提で、localStorageと静的データを中心に運用します。
- Supabaseクライアント初期化層は導入済みですが、最初の接続確認は読み取り専用など、認証なしで安全に扱える範囲から始めます。
- 手動外部メモをDB保存する前に、ユーザー分離の有無を決めます。

### 認証導入後

- `external_catch_memos`、`catch_reports`、`user_preferences` は `user_id` を持たせ、ユーザー単位で分離します。
- `fish_species`、`fishing_spots`、`source_registry` は共有マスターとして扱います。
- ユーザー自身の釣果やメモは、公開範囲を `private` / `shared` / `public` のように拡張できる余地を残します。
- 公開範囲を広げる場合は、釣り場保護、混雑防止、安全配慮のため、詳細座標の丸めや非公開化を検討します。

## RLS方針の下書き

実装時のたたき台です。このIssueではSQLやポリシー実装は行いません。

- 共有マスター（`fish_species`、`fishing_spots`、`source_registry`）は匿名/ログインユーザーに読み取り許可、書き込みは管理者のみ許可する方針にします。
- ユーザー所有データ（`external_catch_memos`、`catch_reports`、`user_preferences`）は、`user_id = auth.uid()` の行だけ読み書き可能にします。
- `profiles` は本人が更新できる範囲を最小限にし、公開プロフィールを作る場合も表示名などに限定します。
- `forecast_score_snapshots` をユーザー別に保存する場合は、本人の行だけ読み取り可能にします。共有スコアとして保存する場合は入力データに個人情報が混ざらないよう分離します。
- 匿名公開するデータは、共有マスターと公開用に丸めた地点情報に限定します。
- 管理者ロールやサービスロールを使う処理は、クライアントにシークレットを置かず、必要になった時点で別Issueで設計します。

## 安全・利用上の注意

- SCOREは釣果を保証するものではなく、参考情報として表示します。
- Open-Meteoの天気・海況データや潮位参考値は、公式潮汐表、安全判断、航行判断の代替にしません。
- 外部メモ由来の情報は出典を明示し、本文・画像の転載を避けます。
- 自動収集を始める場合は、情報元ごとに利用規約、robots.txt、著作権、アクセス負荷を別Issueで確認します。

## 段階的ロードマップ

1. データ永続化設計を確定する。
2. 手動エクスポート/インポートなど、localStorageバックアップ導線を検討する（設計: `docs/LOCAL_STORAGE_BACKUP_PLAN.md`）。
3. Supabaseプロジェクト作成と環境変数設計を別Issueで行う（設計: `docs/SUPABASE_SETUP_PLAN.md`）。
4. Supabaseクライアント初期化層を最小導入する（Post-MVP-016で導入済み）。
5. 読み取り専用接続の最小確認を行う。
6. `fish_species`、`fishing_spots`、`source_registry` など読み取り専用マスターのDB化を検討する。
7. `external_catch_memos` のDB保存を実装する。
8. `fish-forecast-map.external-catch-memos` からDBへのインポート導線を実装する。
9. 認証を導入し、ユーザー所有データとRLSを有効化する。
10. ユーザー自身の釣果登録・釣果日記を設計、実装する。
11. SCORE履歴や地点評価履歴の保存が必要か検証し、必要な場合だけスナップショットテーブルを追加する。
12. 公開範囲拡大時の座標丸め、危険地点の扱い、利用規約整備を行う。

## 今回の対象外

- Supabaseプロジェクト作成。
- DBテーブル、SQL、RLS、画面連携。
- 読み取り専用接続の最小確認。
- `.env` / 環境変数追加。
- DBマイグレーション作成。
- SQL実装。
- API Route追加。
- UI変更。
- localStorage key変更。
- localStorage移行実装。
- 外部メモデータ構造変更。
- SCORE計算ロジック変更。
- 外部サイトアクセス。
- スクレイピング。
- 定期実行ジョブ。
- DB/Supabase連携実装。
- AI解析。
- 新API追加。
