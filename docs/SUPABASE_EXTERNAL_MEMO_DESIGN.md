# 外部釣果メモDB保存設計

## 目的

現在の外部釣果メモはブラウザの `localStorage` にだけ保存している。将来Supabaseへ保存できるように、Post-MVP-023では設計、SQL案、mapper/repository土台、安全確認コマンドを追加する。ただし、この段階では実DB操作、UI保存先のDB完全切替、匿名write開放は行わない。

## 現行localStorage仕様

- 保存キーは `fish-forecast-map.external-catch-memos` のまま維持する。
- 保存型は `ExternalCatchRecord` に `userMemo?: string` を加えた `ExternalCatchMemo`。
- IDはUI作成時に `external-memo-${Date.now()}` で生成する。
- 作成時は `createdAt` と `updatedAt` に同じISO文字列を入れ、編集時は既存 `createdAt` を維持して `updatedAt` を更新する。
- 削除はlocalStorage配列から対象IDを除外する物理削除相当。
- 必須入力は情報元URL、情報元、魚種、釣果日、エリア。匹数とサイズは0以上。ユーザーメモはUIで240文字まで。
- URL先の自動取得、外部サイト本文の保存、スクレイピングは行わない。

## `external_catch_memos` テーブル案

SQL案は `supabase/sql/004_external_catch_memos.sql` に置く。主な方針は次の通り。

| DBカラム | 既存型 | 方針 |
| --- | --- | --- |
| `id` | `id` | 既存localStorage IDを保持し、重複移行を避ける主キーにする。 |
| `species` | `species` | 文字列。初期魚種以外の将来拡張も考えFKにはしない。 |
| `caught_date` | `caughtDate` | `date`。 |
| `area_name` | `areaName` | 表示・検索用のエリア名。 |
| `estimated_spot_name` | `estimatedSpotName` | 任意の推定地点名。 |
| `spot_id` | `spotId` | `fishing_spots.id` への任意FK。削除時は `null`。 |
| `latitude` / `longitude` | `latitude` / `longitude` | 任意。公開前に丸めや非公開化を再確認する。 |
| `coordinate_precision` | `coordinatePrecision` | `exact` / `approximate` / `rounded` / `unknown`。 |
| `method` | `method` | 任意の釣法文字列。 |
| `catch_count` | `catchCount` | 0以上の任意整数。 |
| `size_cm` | `sizeCm` | 0以上の任意数値。 |
| `source_id` | `sourceId` | `source_registry.source_id` へのFK。 |
| `source_name` | `sourceName` | 表示の安定性のためスナップショットとして保持。 |
| `source_url` | `sourceUrl` | `http/https` のURL。本文は保存しない。 |
| `acquisition_method` | `acquisitionMethod` | 当面は `manual`。 |
| `confidence` | `confidence` | `high` / `medium` / `low`。 |
| `environment_match_notes` | `environmentMatchNotes` | 任意の短い根拠配列。 |
| `user_memo` | `userMemo` | 240文字までのユーザー用短文メモ。第三者サイト本文の転載にしない。 |
| `owner_id` | なし | 将来認証導入後に `auth.users.id` と紐づける。現時点では未使用。 |
| `created_by` | なし | `manual_local_storage_migration` / `authenticated_user` / `admin_import` の由来管理。 |
| `is_deleted` | なし | 将来DBでは論理削除を第一候補にする。 |
| `created_at` / `updated_at` | `createdAt` / `updatedAt` | DB保存時も既存時刻を保持できるようにする。 |

## RLSと匿名writeを開けない理由

外部メモはユーザー入力データであり、ログインなしでanonの `insert` / `update` / `delete` を広く許可すると、誰でも投稿、改ざん、削除できる状態になり得る。迷惑投稿、URL悪用、釣り場情報の過剰公開、第三者本文転載の混入を避けるため、今回のSQL案ではRLSを有効化し、anonへのwrite grantやpolicyを定義しない。

`select` も公開範囲を慎重に扱う。現案ではauthenticatedへのselect grantだけを置き、anon公開readは後続Issueで用途、座標丸め、個人メモ非公開化を確認してから判断する。

## repository / mapper土台

- `src/lib/externalCatchMemoMapper.ts` はDB rowと `ExternalCatchMemo` の相互変換を担当する。
- `src/lib/externalCatchMemoRepository.ts` は `fetchExternalCatchMemosFromSupabase()` を提供するが、Supabase未設定時やエラー時はthrowせず、呼び出し側がlocalStorage fallbackできる結果を返す。
- `saveExternalCatchMemoToSupabase()` と `deleteExternalCatchMemoFromSupabase()` は土台のみで、現時点では `write-disabled` を返す。UIからはまだ呼び出さない。
- クライアントコードでは公開前提の `NEXT_PUBLIC_SUPABASE_URL` と `NEXT_PUBLIC_SUPABASE_ANON_KEY` だけを使い、強い権限の秘密情報は使わない。

## fallbackと移行方針

- 現時点の正本は既存localStorageのままにする。
- 既存localStorage keyは変更しない。
- 自動移行はしない。DBテーブル適用、RLS確認、保存方式選定、重複防止手順を後続Issueで合意してから手動または明示操作で移行する。
- DB readを試す段階でも、未設定・エラー・0件などの場合はlocalStorage表示を維持する。
- DB write有効化前後の優先順位は、認証ありならユーザー所有DBメモを優先し、未移行localStorageメモは明示的な移行候補として扱う。

## owner scoped RLS policy SQL案（Post-MVP-025）

外部釣果メモDB保存をUIへ接続する前の安全確認として、`supabase/sql/005_external_catch_memos_owner_policies.sql` にauthenticated owner scoped RLS policy案を追加する。これはSQL Editorへまだ実行しない設計案であり、実DB反映、UI保存先のDB切替、repositoryのDB write有効化は行わない。

方針は次の通り。

- 対象ロールは `authenticated` のみ。`anon` には `select` / `insert` / `update` / `delete` policyを定義しない。
- `grant select, insert, update on table public.external_catch_memos to authenticated` に限定し、`grant all` は使わない。
- `select` は `owner_id = auth.uid()` かつ `is_deleted = false` の自分の未削除メモだけに限定する。
- `insert` は `owner_id = auth.uid()`、`is_deleted = false`、`created_by = 'authenticated_user'` の行だけを許可する。DB保存時はログイン中のSupabase user idを `owner_id` としてinsert payloadへ入れる必要がある。
- `update` は `owner_id = auth.uid()` の自分の行だけを対象にし、更新後も `owner_id = auth.uid()` と `created_by = 'authenticated_user'` を満たす必要がある。
- 物理delete policyは追加しない。削除は `is_deleted = true` へ更新する論理削除を優先し、復旧や監査の必要性を後続Issueで確認する。
- 既存localStorage IDをDB主キーとして使う場合は、同一IDの重複insertを避けるため、後続Issueでupsert条件、移行済み判定、失敗時のlocalStorage fallbackを明確にする。
- DB write失敗時は既存localStorage表示・保存を維持するfallback方針を優先し、DBを唯一の正本にする切替は別Issueで扱う。

追加した安全確認コマンドは `npm run check:external-memo-owner-policy`。DB接続や外部アクセスなしで、policy SQLがauthenticated対象であること、`owner_id = auth.uid()` 条件を含むこと、anon writeや `grant all`、service role key、DB URL、DB passwordらしき文字列を含まないことを確認する。

## 後続候補

1. 本番環境で、ユーザーA/Bのメモが相互に見えないことを確認する。
2. DB 0件かつlocalStorage既存メモありの表示方針をユーザーに説明し、必要なら明示的な移行UIを設計する。
3. localStorageからDBへの移行はユーザー操作を伴う別Issueとして扱う。

## Auth前提のDB保存方針（Post-MVP-024）

外部釣果メモをSupabaseへ保存する前に、Supabase Authでログイン状態を扱う最小土台を整備する。外部メモはユーザー入力データのため、匿名writeを開放せず、将来は `owner_id = auth.uid()` をRLS policyの条件にして自分のメモだけ扱える構成にする。

Post-MVP-024の範囲では、DB write、RLS policy追加、UI保存先のDB切替は行わなかった。Post-MVP-025でRLS policy SQL案を追加し、Post-MVP-026ではそのSQLの手動実行成功を前提に、ログイン中ユーザー向けのDB read/writeを接続した。Auth設定手順は `docs/SUPABASE_AUTH_SETUP.md` を参照する。

## Auth user前提のDB read/write接続（Post-MVP-026）

`supabase/sql/005_external_catch_memos_owner_policies.sql` はSupabase SQL Editorで手動実行済みという前提で、外部釣果メモrepositoryをログイン中のSupabase Authユーザー向けDB read/writeへ接続した。

- ログイン中のみ、`owner_id = user.id` と `is_deleted = false` をクエリ条件に入れて、自分の未削除メモだけを読む。
- 登録・編集時は対象の1件だけをDBへ保存し、payloadへ `owner_id = user.id`、`created_by = 'authenticated_user'`、`is_deleted = false` を必ず設定する。
- 削除は物理deleteを呼ばず、対象IDかつ自分の行へ `is_deleted = true` を設定する論理削除にする。
- 未ログイン、Supabase未設定、DB read/writeエラー時は既存localStorageへfallbackする。DB write失敗時も入力済みメモをlocalStorageへ保存し、画面表示を維持する。
- 既存localStorage key `fish-forecast-map.external-catch-memos` は変更しない。既存localStorageデータの削除や自動DB移行は行わない。
- DBが0件でlocalStorageに既存メモがある場合は、データが消えたように見えないことを優先してlocalStorageメモを表示し、保存先状態に「ローカルデータは未移行」と控えめに表示する。これは自動移行ではなく表示維持のみであり、DBへの一括upsertは行わない。
- Auth状態確認中やユーザー切替時は一度メモ表示を空にし、別ユーザーのメモが画面に残らないようにする。

追加確認コマンドは `npm run check:external-memo-auth-repository`。repository/hookがAuth user idを前提にowner scoped read/writeを行うこと、論理削除であること、物理delete、service role key、DB URL、DB password、`.env.local` 混入がないことを静的に確認する。

後続候補は、本番環境でのログインユーザー別動作確認と、既存localStorageメモをユーザーが明示的に選んで移行するフローの設計・実装である。
