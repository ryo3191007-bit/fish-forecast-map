# Supabaseマスターデータ手動セットアップ手順

## 目的

`fish_species` / `fishing_spots` / `source_registry` のマスターデータDB化準備として、SQL定義、seed SQL、差分確認の手順をまとめます。

このPRでは、Supabase SQL Editorでの実行、実DBテーブル作成、実DBへのseed投入、SupabaseへのDB接続、アプリ画面連携は行いません。実行が必要になった段階で、ユーザーがSupabase DashboardのSQL Editorから手動で実行します。

## 対象ファイル

1. `supabase/sql/002_master_data_tables.sql`
   - 3テーブルの定義、制約、index、RLS、select権限を定義します。
2. `supabase/sql/003_master_data_seed.sql`
   - 既存静的データ相当のseedを投入します。
   - `insert ... on conflict ... do update` により再実行しやすい形にしています。

## 手動実行順序

Supabase SQL Editorでユーザーが以下の順に手動実行します。

1. `supabase/sql/002_master_data_tables.sql`
2. `supabase/sql/003_master_data_seed.sql`

現在の正本は `supabase/migrations/` です。Issue #196の別名マスターは既存remote履歴の同期後、通常のmigration適用順で `20260720150000_add_fish_species_aliases.sql` を適用します。旧 `supabase/sql/*.sql` を本番へ再実行しないでください。

別名migrationはテーブル・関数・RLS・read-only policyとcanonical 15件、チヌ別名2件をadditiveに追加します。既存の `target_species`、外部メモの `species`、釣果文字列は更新しません。アプリを先に配布してもstatic fallbackが同じ安定IDと別名を持ち、DB適用後はSupabase readへ切り替わります。

実行前に、`.env.local`、実Project URL、実anon key、service role key、DB URL、DB passwordをGitHub、Issue、PR、チャットへ貼らないでください。SQLファイルにも実キーや実DB接続情報は書きません。

## 実行後の確認項目

- `fish_species` / `fishing_spots` / `source_registry` が作成されている。
- 3テーブルでRLSが有効になっている。
- `anon` / `authenticated` はselectのみ許可されている。
- `anon` にinsert/update/deleteが許可されていない。
- seed件数が既存静的データと一致している。
  - `fish_species`: `src/domain/fishing.ts` の `fishSpeciesNames` と一致。
  - `fishing_spots`: `src/data/fishingSpots.ts` の `fishingSpots` と一致。
  - `source_registry`: `src/data/externalSources.ts` の `externalSources` と一致。

## ローカル差分確認

DB接続、外部アクセス、実キーなしでseed SQLと既存静的データのID/件数を確認できます。

```bash
npm run check:master-seed
npm run check:fish-species-alias-seed
```

この確認はSQLを実行せず、`supabase/sql/003_master_data_seed.sql` を簡易パースして、静的データ側のIDと比較します。

## 失敗時の切り戻し・再実行方針

- SQL Editorで失敗した場合は、エラーメッセージと実行したSQLファイル名・行付近だけを確認し、秘密情報は共有しません。
- `003_master_data_seed.sql` は再実行可能なupsertとしているため、seed内容の修正後に再実行できます。
- テーブル定義の修正が必要な場合は、無理に本番データを手作業で直さず、後続PRでSQL定義を更新します。
- 破棄してやり直す必要がある場合も、実DB操作はユーザーがSupabase Dashboardで手動判断します。
- Issue #196 migrationはforward-onlyです。不具合時はまず対象別名を `is_active = false` にする追加migration、またはアプリ側をstatic/従来文字列経路へ戻して解決を停止します。既存文字列は保持されるためデータ復元は不要です。物理削除が必要な場合も、このPRを逆実行せず、権限を閉じてバックアップを確認したうえで別の復旧migrationを作成します。

## 次の候補

- 手動実行後の実DB確認手順を追加する。
- アプリ側でSupabase readを試し、失敗時は既存静的データへfallbackする実装を後続Issueで検討する。

## 対象外

- Supabase SQL Editorでの実行。
- 実DBテーブル作成、実DBへのseed投入。
- Supabaseクライアント変更、API Route追加、UI変更。
- localStorage key変更、localStorage移行実装。
- 外部サイトアクセス、スクレイピング、定期実行ジョブ、AI解析。
- 実Project URL、実anon key、service role key、実DB URL、DB password、`.env.local` の追加。
