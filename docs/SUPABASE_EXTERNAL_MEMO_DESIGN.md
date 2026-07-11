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
- 登録・編集時は対象の1件だけをDBへ保存し、payloadへ `owner_id = user.id`、`created_by = 'authenticated_user'`、`is_deleted = false` を必ず設定する。DB更新で対象行が0件の場合は成功扱いにせず、localStorage fallbackとして扱う。
- 削除は物理deleteを呼ばず、対象IDかつ自分の行へ `is_deleted = true` を設定する論理削除にする。DB削除更新で対象行が0件の場合も成功扱いにしない。
- 未ログイン、Supabase未設定、DB read/writeエラー時は既存localStorageへfallbackする。DB write失敗時も入力済みメモをlocalStorageへ保存し、画面表示を維持する。
- 既存localStorage key `fish-forecast-map.external-catch-memos` は変更しない。既存localStorageデータの削除や自動DB移行は行わない。
- DB readが成功してDBメモが存在する場合でも、localStorageにメモが残っていればDB/localStorageをIDで重複排除して併存表示する。IDが同じ場合は、DB write失敗や未同期編集を隠さないためlocalStorage側を優先する。これは自動移行ではなく表示維持のみであり、DBへの一括upsertは行わない。
- hook内部ではDB由来IDとlocalStorage由来IDを分けて保持し、Supabase read成功状態も表示statusとは別に保持する。localStorage由来メモの登録・編集・削除はlocalStorageだけへ反映し、DB readが成功している場合はDB/localStorage併存表示中でもDB由来メモの編集・論理削除をDBへ反映する。DB write失敗時のみ、対象メモをlocalStorage fallbackとして保存する。
- localStorageへ保存する際はlocalStorage由来またはfallback対象のメモだけを保存し、併存表示中のDB由来メモ全体を丸ごとコピーしない。DB write失敗で作成したfallbackメモにはユーザー所有情報をsidecar metadataとして保持し、ログアウト後や別ユーザーのログイン時に前ユーザーのDB由来fallbackメモを表示しない。
- DB/localStorageで同一IDがある場合にlocalStorage版を削除したとき、DB版が次回読込で意図せず復活しないよう、ユーザー別のDB削除tombstoneをsidecar metadataに保存してDB版を非表示にする。Supabase read成功時にtombstone対象IDがDB取得結果に存在しない場合は、そのstale tombstoneを整理し、以降のDB由来メモCRUDを継続できるようにする。明示移行・競合解決UIは後続Issueで扱う。
- DB/localStorage併存中やDB read/write error後の `local-storage-fallback` 状態でも、DB readが成功しているDB由来メモはDBへ編集・論理削除し、localStorage由来メモと新規メモは明示的な移行操作が入るまでlocalStorageへ固定する。操作をきっかけに新規メモだけをDBへ入れたり、localStorage由来メモを暗黙にDBへ移したりしない。
- Auth状態確認中やユーザー切替時は一度メモ表示を空にし、別ユーザーのメモが画面に残らないようにする。DB mutation中にログアウトまたはユーザー切替が起きた場合は、開始時のuser id / generationと一致しない完了結果を画面へ反映しない。

追加確認コマンドは `npm run check:external-memo-auth-repository`。repository/hookがAuth user idを前提にowner scoped read/writeを行うこと、論理削除であること、物理delete、service role key、DB URL、DB password、`.env.local` 混入がないことを静的に確認する。`npm run check:external-memo-state-transitions` では、DB=[A]・localStorage=[B]でDB由来Aの編集がDB updateへ向くこと、DB由来Aを削除するとDB論理削除へ向き再読込しても復活しないこと、DB操作失敗時だけ対象メモのlocal shadowまたはtombstoneへfallbackしユーザー分離されること、stale tombstoneを整理してDB由来CRUDを継続できること、localStorage由来Bの編集やC追加でDB由来AがlocalStorageへコピーされないこと、DB/localStorage同一IDのlocalStorage版削除後にDB版が意図せず再出現しないこと、DB update/delete 0件の失敗扱いを確認する。

後続候補は、本番環境でのログインユーザー別動作確認と、既存localStorageメモをユーザーが明示的に選んで移行するフローの設計・実装である。

## 論理削除の成功判定（Post-MVP-028 / Issue #81）

本番確認で、ログインユーザーのDB由来メモ削除時に画面上は非表示になっても、DB行の `is_deleted` が `false` のまま残り、localStorage tombstone fallbackで隠しているだけの状態が確認された。原因は、`is_deleted = true` へ更新した後に `.select("id")` / RETURNINGで削除後行を取得しようとすると、通常SELECT policyの `is_deleted = false` 条件と競合し、UPDATE全体が失敗またはロールバックされ得るためである。

修正後の削除repositoryは、削除後行のRETURNING/SELECTやPostgRESTの更新件数取得に依存しない。手動SQL `supabase/sql/006_soft_delete_external_catch_memo_rpc.sql` で `public.soft_delete_external_catch_memo(p_memo_id text)` を追加し、RPC内部で `id = p_memo_id`、`owner_id = auth.uid()`、`is_deleted = false` の行だけを `is_deleted = true` へ論理削除する。`GET DIAGNOSTICS ... ROW_COUNT` により更新件数を取得し、1件更新できた場合だけ `true` を返す。repository側は `.rpc("soft_delete_external_catch_memo", { p_memo_id: memoId })` を呼び、`data === true` の場合だけDB削除成功と判定する。

RPCは `security invoker`、`set search_path = public` とし、`public` / `anon` から実行権限を剥奪して `authenticated` にだけ `execute` を付与する。service roleは使わず、既存のowner scoped RLS、`owner_id = auth.uid()`、通常SELECTの `is_deleted = false` 制約、物理delete禁止を維持する。

DB削除成功時はlocal tombstoneを作らず保存先表示をSupabaseのまま維持する。本当にRPCエラー、RPC戻り値 `false`、対象行0件、別ユーザー行、既削除行、競合更新などで削除できなかった場合だけ、従来どおりユーザー別local tombstone fallbackで画面上の非表示を維持する。

本番確認のため、削除RPC失敗時は通常ユーザー向けUIに生のDBエラーを表示せず、URL、JWT、長いキーらしき値、UUID、`owner_id` 条件値を伏せた短い診断だけを `console.warn` と `result.meta.message` に残す。この診断経路は本番ビルドでも無効化しない。Supabase/PostgRESTが短いエラーコードを返した場合は、コードとサニタイズ済みメッセージだけを保持する。

手動適用手順:

1. Supabase DashboardのSQL Editorを開く。
2. `supabase/sql/006_soft_delete_external_catch_memo_rpc.sql` の内容を確認して実行する。
3. 本番アプリでログインし、DB由来の外部メモを新規作成する。
4. そのメモを削除し、画面の保存先表示がSupabase利用可能状態のままであること、通常UIに生DBエラーが出ないことを確認する。
5. Supabase Dashboardで対象行の `is_deleted = true` を確認する。
6. 画面を再読込し、対象メモが復活しないことを確認する。
7. 失敗時だけ、ブラウザコンソールにサニタイズ済みの短い診断が出ることを確認する。実URL、JWT、キー、`owner_id`、ユーザーUUIDはログへ貼り付けない。

### 追加ハードニング（Issue #85 follow-up）

`supabase/sql/006_soft_delete_external_catch_memo_rpc.sql` を本番へ適用後も、`security invoker` のままでは削除後行が通常SELECT policyから外れるタイミングでRLSに拒否され、`42501: new row violates row-level security policy for table "external_catch_memos"` になることを本番で確認した。このため、追加適用用SQLとして `supabase/sql/007_harden_soft_delete_external_catch_memo_rpc.sql` を作成した。

`007` は既存関数 `public.soft_delete_external_catch_memo(p_memo_id text)` を最小権限の `security definer` として再定義する。`search_path` は空文字に固定し、更新対象テーブルは `public.external_catch_memos`、日時関数は `pg_catalog.now()` として完全修飾する。呼び出し元ユーザーは関数内で `auth.uid()` から `caller_id` に取得し、NULLの場合は更新せず `false` を返す。更新対象は `id = p_memo_id`、`owner_id = caller_id`、`is_deleted = false` に限定し、更新内容は `is_deleted = true` と `updated_at = pg_catalog.now()` だけにする。`GET DIAGNOSTICS ... ROW_COUNT` で1件更新時のみ `true`、0件時は `false` を返す。

権限は従来どおり、`PUBLIC` と `anon` から実行権限を剥奪し、`authenticated` のみに `execute` を付与する。service role keyは使わず、既存RLS policyも緩めない。特に通常SELECT policyで `is_deleted = true` 行を読めるようにはしない。

追加手動適用手順:

1. Supabase DashboardのSQL Editorを開く。
2. `supabase/sql/007_harden_soft_delete_external_catch_memo_rpc.sql` の内容を確認して実行する。
3. 本番アプリを再読込する。
4. ログイン中にDB由来の外部メモを新規作成する。
5. そのメモを削除し、保存先表示がSupabase利用可能状態のままであること、通常UIに生DBエラーが出ないことを確認する。
6. Supabase Dashboardで対象行の `is_deleted = true` を確認する。
7. 画面を再読込し、対象メモが復活しないことを確認する。
8. 失敗した場合は、ブラウザコンソールの `[external-catch-memo] safe delete diagnostic:` に続く短いサニタイズ済み診断だけを確認し、実URL、JWT、キー、`owner_id`、ユーザーUUIDは共有しない。
