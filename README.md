# fish-forecast-map

釣果予測マップは、福岡県糸島市西岸から唐津湾、伊万里湾、平戸方面までの陸っぱり釣り情報を地図で確認するための個人利用Webアプリです。堤防・磯場などでルアー釣り／エサ釣りを検討するときに、モック釣果と手動登録した外部釣果メモ、魚種、エリア、釣り方、地点ごとの釣れそう度スコアを一覧できます。

- 公開URL: https://fish-forecast-map.vercel.app/#map
- 利用目的: 個人利用向けのMVP検証
- データ: MVP v0.1のモックデータを中心に、手動登録した外部釣果メモも表示対象。マスターデータはSupabase read層を経由し、未設定時は静的fallbackで表示します

## 現在できること

- MapLibre GL JSの地図でモック釣果地点マーカーと、釣り場に紐づけた手動外部メモのマーカーを確認できます。
- 画面上部の小さな表示で、マスターデータの取得元（`データ: Supabase` / `データ: 静的fallback` / `データ読込中...`）を確認できます。
- 釣果一覧カードで日付、エリア、場所、魚種、釣果数、サイズ、釣り方、出典を確認できます。釣果一覧カードでは、個別釣果の `SCORE` やスコア根拠は表示しません。
- 釣果一覧は、魚種フィルタ、エリアフィルタ、キーワード検索、開始日/終了日の期間フィルタで絞り込みできます。
- 釣果一覧は、日付が新しい順、日付が古い順で並び替えできます。
- 地点評価一覧では、モック釣果と条件に合う手動外部メモを参考にした平均 `SCORE` を確認できます。
- 条件リセットボタンで、魚種 `all`、エリア `all`、キーワード空、開始日/終了日未指定などの初期状態に戻せます。
- 手動URL登録による外部釣果メモを一覧・フィルタ・地図で確認できます。外部メモ単体には個別 `SCORE` を付けず、条件に合う場合だけ既存地点の `SCORE` へ小さく参考反映します。
- Open-Meteo Weather / Marine APIによる天気・海況の参考データを表示できます。公式潮汐表、安全判断、航行判断の代替にはしません。
- ダーク／ネオン／ガラス風のダッシュボードUIでPC・スマホから確認できます。

## 現在やらないこと

- ユーザー自身の実釣果登録、釣果日記、個人釣行ログ。
- 外部釣果サイトの自動取り込み、スクレイピング、定期実行ジョブ、AI解析。
- Supabase/DBを唯一の正本にすること、外部釣果メモのDB書き込み、ログイン/認証。マスターデータの読み取りは任意で、未設定時は静的fallbackで動作します。外部釣果メモDB保存は設計・SQL案・repository土台までで、UI保存先はまだlocalStorageです。
- 公式潮汐表、安全判断、航行判断としての利用。
- 3D海底地形表示。
- 外部釣果メモ単体への個別SCORE付与、実績ベースの高度な予測、複雑な機械学習。
- ページネーション、URLクエリ同期。
- 有料API、有料地図サービス、有料ホスティングの追加導入。

## 使用技術

- フロントエンド: Next.js + TypeScript
- UI: CSS（`src/app/globals.css`）
- 地図: MapLibre GL JS
- データ: Supabase master read層 + 静的fallbackの釣り場/魚種/外部情報源マスター、ローカルのモック釣果データ、ブラウザに手動保存する外部釣果メモ
- 品質確認: ESLint、TypeScript、Next.js build

## ローカル起動方法

依存関係は `package-lock.json` に固定しているため、通常は `npm ci` を使います。

```bash
npm ci
npm run dev
```

`npm run dev` を実行したら、ブラウザで `http://localhost:3000` を開きます。

## 品質確認コマンド

```bash
npm run lint
npm run typecheck
npm run build
```

## データ方針

MVP v0.1の基本データはモック釣果データです。Post-MVP-005 / 006以降は、外部サイトを自動収集せず、ユーザーが手動でURLと必要最小限の事実情報を登録する外部釣果メモも表示対象にしています。外部メモ単体には個別 `SCORE` を付けませんが、`acquisitionMethod: manual` など条件に合うメモだけを既存地点の `SCORE` へ小さく参考反映します。釣果情報には出典名と出典URLのフィールドを持たせますが、第三者サイト本文の転載、画像保存、コメント全文保存、プロフィール詳細保存、自動収集は行いません。

将来的に外部情報の自動取り込みを検討する場合は、利用規約、robots.txt、著作権、アクセス負荷を確認し、公式API、RSS、許可を得た情報源、ユーザー提供情報を優先します。アプリ上の釣れそう度は参考情報であり、実際の釣果を保証するものではありません。


## Supabaseマスターデータ準備

`fish_species` / `fishing_spots` / `source_registry` のDB化準備として、テーブル定義SQLとseed SQLをリポジトリに配置しています。実DBへの適用はまだ行わず、ユーザーが必要なタイミングでSupabase SQL Editorから手動実行します。

- テーブル定義: `supabase/sql/002_master_data_tables.sql`
- seed SQL: `supabase/sql/003_master_data_seed.sql`
- 手動実行手順: `docs/SUPABASE_MASTER_DATA_SETUP.md`
- seed差分確認: `npm run check:master-seed`

画面側は `fetchMasterData()` 経由でマスターデータを初期化します。Supabaseから読み取れる場合はSupabaseの `fish_species` / `fishing_spots` / `source_registry` を使い、未設定・SQL未実行・通信失敗・0件時は既存の静的データへfallbackします。UIには `データ: Supabase`、`データ: 静的fallback`、`データ読込中...` の控えめな取得元表示を出します。

Supabaseを実際に使う場合の確認順序は次の通りです。

1. `supabase/sql/002_master_data_tables.sql` をユーザーがSupabase SQL Editorで手動実行する。
2. `supabase/sql/003_master_data_seed.sql` をユーザーがSupabase SQL Editorで手動実行する。
3. `.env.example` を参考に `.env.local` へ `NEXT_PUBLIC_SUPABASE_URL` と `NEXT_PUBLIC_SUPABASE_ANON_KEY` を設定する。
4. `npm run check:master-read` で取得元と件数を確認する。
5. アプリ画面で取得元表示を確認する。

DBを唯一の正本にはまだ切り替えていません。既存静的データとfallbackは保持します。

## 外部釣果メモDB保存の準備

Post-MVP-023では、現在localStorageに保存している外部釣果メモを将来Supabaseへ保存するための設計、SQL案、mapper/repository土台、安全確認コマンドを追加しています。Post-MVP-025では、DB writeをUIへ接続する前の安全確認として、authenticatedユーザーが `owner_id = auth.uid()` の自分のメモだけを扱えるowner scoped RLS policy SQL案を追加しています。まだSupabase SQL Editorでの実行、実DB反映、UI保存先のDB完全切替、自動移行、repositoryのDB write有効化、anon write開放は行いません。

- 設計: `docs/SUPABASE_EXTERNAL_MEMO_DESIGN.md`
- テーブルSQL案: `supabase/sql/004_external_catch_memos.sql`
- owner scoped RLS policy SQL案: `supabase/sql/005_external_catch_memos_owner_policies.sql`
- テーブル設計安全確認: `npm run check:external-memo-db`
- owner policy安全確認: `npm run check:external-memo-owner-policy`

外部メモはユーザー入力データのため、認証なしで `anon` に広い `insert` / `update` / `delete` を許可しません。owner policy案でも `grant all` は使わず、物理delete policyは追加せず、`is_deleted = true` による論理削除を優先します。次の候補は、owner policy SQLの手動実行チェックポイントと、SQL実行後に外部メモrepositoryをAuth user前提のDB read/writeへ接続する作業です。

## 今後の候補

- Open-Meteo以外の環境データ連携や、公式潮汐表への参照・リンクの検討。ただし、安全判断・航行判断の代替にはしない。
- 3D海底地形や水深レイヤーの検討。
- 釣れそう度スコアの高度化と理由表示の改善。
- 公式API、RSS、許可済み情報源を前提にした釣果情報取り込み。
- Supabase/PostgreSQLによるデータ永続化。ローカル環境変数は `.env.example` をコピーした `.env.local` に設定し、詳細は `docs/SUPABASE_SETUP_PLAN.md` を参照します。読み取り専用の最小疎通確認は `docs/SUPABASE_READONLY_CONNECTION_CHECK.md` を参照します。
- 公開範囲を広げる場合の地点座標丸め、詳細地点非公開化、利用規約整備。

## 関連ドキュメント

- `AGENTS.md`
- `docs/REQUIREMENTS.md`
- `docs/MVP_SCOPE.md`
- `docs/ARCHITECTURE.md`
- `docs/DATA_POLICY.md`
- `docs/DATA_PERSISTENCE_PLAN.md`
- `docs/LOCAL_STORAGE_BACKUP_PLAN.md`
- `.env.example`（Supabase環境変数のダミーテンプレート）
- `docs/SUPABASE_SETUP_PLAN.md`
- `docs/SUPABASE_READONLY_CONNECTION_CHECK.md`
- `docs/SUPABASE_MASTER_DATA_DESIGN.md`
- `docs/SUPABASE_MASTER_DATA_SETUP.md`
- `docs/CODEX_WORKFLOW.md`
- `docs/MVP_COMPLETION.md`

## Supabase master data read check

Post-MVP-021では、Supabaseから `fish_species` / `fishing_spots` / `source_registry` を読める場合だけ読み、未設定・SQL未実行・テーブル未作成・read error時は既存静的データへfallbackするread層を追加しています。

```bash
npm run check:master-read
```

この確認コマンドは `.env.local` がない環境でも失敗扱いにせず、`Source: static-fallback` と静的データ件数を表示します。実キー、service role key、DB URL、DB passwordは使いません。詳細は `docs/SUPABASE_MASTER_DATA_READ.md` を参照してください。
