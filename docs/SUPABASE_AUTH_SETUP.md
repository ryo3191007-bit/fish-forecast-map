# Supabase Auth最小土台（外部メモDB保存の前提）

## 目的

外部釣果メモはユーザー入力データのため、匿名ユーザーにDB writeを開放せず、将来 `owner_id = auth.uid()` で自分のメモだけを扱えるようにする。Post-MVP-024では、アプリ側でSupabase Authのログイン状態を扱える最小土台を入れることに限定した。Post-MVP-026では、owner scoped RLS SQLの手動実行成功を前提に、ログイン中ユーザーの外部メモDB read/writeへ接続した。

## Auth土台で追加した範囲

- Supabaseの公開クライアント設定がある場合だけAuthを利用する。
- session/user取得とAuth state購読を行う。
- 状態は `loading` / `signed-in` / `signed-out` / `unavailable` として扱う。
- メールOTP/magic linkでログインリンクを送信する。
- ログアウトできる。
- Supabase未設定時はアプリを壊さず、認証利用不可として控えめに表示する。

## 外部メモDB接続後もやらないこと

- `anon` へのinsert/update/delete許可。
- DBを唯一の正本へ完全切替すること。
- 既存localStorage key変更、削除、自動移行。
- localStorage全件の暗黙一括upsert。
- service role key、DB URL、DB passwordの利用やコミット。

ログイン中は `owner_id = user.id` の自分の未削除メモだけをSupabaseから読み、登録・編集では `created_by = authenticated_user` と `is_deleted = false` を設定する。削除は物理deleteではなく、手動SQL `supabase/sql/006_soft_delete_external_catch_memo_rpc.sql` 適用後、追加SQL `supabase/sql/007_harden_soft_delete_external_catch_memo_rpc.sql` でhardeningした `soft_delete_external_catch_memo` RPCで `owner_id = auth.uid()` かつ未削除の行だけを `is_deleted = true` にする。未ログイン、Supabase未設定、DBエラー時は既存localStorageへfallbackする。削除RPC失敗時の開発者向け診断は本番でも無効化せず、URL、JWT、キー、`owner_id`、ユーザーUUIDを伏せた短いメッセージだけをログへ出す。

## `owner_id = auth.uid()` 方針

`external_catch_memos.owner_id` とSupabase Authの `auth.uid()` を一致させ、自分のメモだけselect/insert/updateできるRLS policy SQLを `supabase/sql/005_external_catch_memos_owner_policies.sql` に配置している。Post-MVP-026では、このSQLが手動実行済みであることを前提にアプリ側のDB read/writeを接続した。匿名writeを広く開ける構成にはせず、物理delete policyも追加しない。削除は `is_deleted = true` へ更新する論理削除を使う。

## Supabase Dashboardで確認する項目

Supabase DashboardのAuthentication settingsで次を確認する。

- Site URL: 本番アプリURLを設定する。
- Redirect URLs: 本番URLとローカル開発URLを登録する。
- Email provider / OTP設定: メールOTPまたはmagic linkが利用できることを確認する。

Redirect URL方針:

- 本番: Vercelなどで公開しているHTTPSの本番URLを登録する。
- ローカル: `http://localhost:3000` を登録する。
- プレビュー環境を使う場合は、必要なプレビューURLだけ追加し、不要になったURLは整理する。

## 環境変数方針

ブラウザ側では以下の公開値だけを利用する。

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

service role key、DB接続文字列、DB passwordはアプリ・docs・PRに載せない。

## 次の候補

1. 本番環境で、ユーザーA/Bのメモが相互に見えないことを確認する。
2. DB 0件かつlocalStorage既存メモありの表示方針をユーザーに説明し、必要なら明示的な移行UIを設計する。
3. localStorageからDBへの移行はユーザー操作を伴う別Issueとして扱う。

## 外部メモ削除RPCの追加適用SQL

`006` 適用後の本番確認でRLS 42501が継続したため、`supabase/sql/007_harden_soft_delete_external_catch_memo_rpc.sql` を追加で手動適用する。`007` はRPCを `security definer`、`set search_path = ''` に変更し、関数内の `auth.uid()` がNULLなら `false` を返す。更新対象は `id = p_memo_id`、`owner_id = auth.uid()` 由来の `caller_id`、`is_deleted = false` の行だけで、更新内容は `is_deleted = true` と `updated_at = pg_catalog.now()` のみに限定する。実行権限は `PUBLIC` / `anon` から剥奪し、`authenticated` のみに付与する。既存RLS policyは緩めず、削除済み行を通常SELECT可能にしない。

本番再確認では、SQL Editorで `007` を実行後、本番アプリを再読込し、ログイン中にDB由来メモを新規作成して削除する。画面がSupabase利用可能状態のまま、対象行がDashboardで `is_deleted = true` になり、再読込後に復活しないことを確認する。失敗時だけ、ブラウザコンソールのサニタイズ済み短文診断を確認する。
