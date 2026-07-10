# Supabase Auth最小土台（外部メモDB保存の前提）

## 目的

外部釣果メモはユーザー入力データのため、匿名ユーザーにDB writeを開放せず、将来 `owner_id = auth.uid()` で自分のメモだけを扱えるようにする。今回の範囲は、アプリ側でSupabase Authのログイン状態を扱える最小土台を入れることに限定する。

## 今回追加する範囲

- Supabaseの公開クライアント設定がある場合だけAuthを利用する。
- session/user取得とAuth state購読を行う。
- 状態は `loading` / `signed-in` / `signed-out` / `unavailable` として扱う。
- メールOTP/magic linkでログインリンクを送信する。
- ログアウトできる。
- Supabase未設定時はアプリを壊さず、認証利用不可として控えめに表示する。

## 今回やらないこと

- DB writeの有効化。
- `external_catch_memos` のRLS policy実DB反映。Post-MVP-025ではSQL案のみ追加し、SQL Editor実行はしない。
- `anon` へのinsert/update/delete許可。
- アプリから呼び出す `authenticated` write有効化。
- 外部メモUI保存先のDB切替。
- localStorage key変更、削除、自動移行。
- service role key、DB URL、DB passwordの利用やコミット。

ログインしても外部釣果メモは引き続きlocalStorage保存のままにする。

## `owner_id = auth.uid()` 方針

Post-MVP-025では、`external_catch_memos.owner_id` とSupabase Authの `auth.uid()` を一致させ、自分のメモだけselect/insert/updateできるRLS policy SQL案を `supabase/sql/005_external_catch_memos_owner_policies.sql` に追加する。匿名writeを広く開ける構成にはせず、物理delete policyも追加しない。削除は `is_deleted = true` へ更新する論理削除を優先する。

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

1. `supabase/sql/005_external_catch_memos_owner_policies.sql` の手動SQL実行チェックポイントを設ける。
2. SQL実行後にRLS挙動を確認する。
3. 外部メモrepositoryをAuth user前提のDB read/writeへ接続する。

いずれも、UI保存先のDB切替や本番DB反映は別作業として扱う。
