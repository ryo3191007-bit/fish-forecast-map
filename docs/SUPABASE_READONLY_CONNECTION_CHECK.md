# Supabase読み取り専用接続の最小確認

## 目的

Post-MVP-017では、Post-MVP-016で追加したSupabaseクライアント初期化層を使い、ローカル環境からSupabaseの読み取り専用テーブルを1件だけ取得できることを確認します。

この手順は疎通確認のみです。アプリ画面からSupabaseを呼び出す処理、API Route、認証、型生成、魚種・地点・source registry・外部釣果メモのDB化は行いません。

## 使う環境変数

疎通確認スクリプトが参照するのは、以下の2つだけです。

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

`SUPABASE_SERVICE_ROLE_KEY`、`SUPABASE_DB_URL`、DB passwordは使いません。実Project URLや実anon keyはGitHub、Issue、PR、チャット、スクリーンショット、ログへ貼らず、Git管理対象外の `.env.local` にだけ設定します。

## 1. SQL Editorで確認用SQLを手動実行する

Supabase DashboardのSQL Editorで、リポジトリ内の以下SQLを手動実行します。

```text
supabase/sql/001_readonly_connection_check.sql
```

このSQLは、`public.app_connection_checks` に `readonly-smoke-test` 1件を用意し、RLSを有効化したうえでanon roleにはselectのみを許可します。anon roleへinsert/update/deleteは許可しません。

実行後も、anon roleで書き込みできるポリシーや権限を追加しないでください。

## 2. `.env.local` に実Project URLと実anon keyを設定する

`.env.example` をコピーして、Git管理対象外の `.env.local` を作ります。

```bash
cp .env.example .env.local
```

`.env.local` の以下2項目だけを、Supabase Dashboardで確認した実値へ置き換えます。

```dotenv
NEXT_PUBLIC_SUPABASE_URL="https://your-project-ref.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key"
```

`.env.local` はコミットしません。`SUPABASE_SERVICE_ROLE_KEY`、`SUPABASE_DB_URL`、DB passwordはこの確認では不要です。

## 3. ローカル疎通確認スクリプトを実行する

Node.jsの `--env-file=.env.local` で環境変数を読み込み、以下を実行します。

```bash
npm run check:supabase
```

このスクリプトは `app_connection_checks` から `readonly-smoke-test` の `id` と `message` だけを取得します。CIでは自動実行しません。

## 成功時の見方

成功すると、実URLや実anon keyを表示せずに以下のような概要だけを出力します。

```text
Supabase readonly connection check succeeded.
Fetched row: readonly-smoke-test
```

## 失敗時の見方

環境変数が未設定の場合は、足りないキー名だけを表示します。値は表示しません。

```text
Supabase connection check failed: missing environment variables.
Missing: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY
```

SQL未実行、RLS/権限不足、Project URLやanon keyの誤りなどの場合は、Supabaseクライアントから返されたエラーメッセージ概要だけを表示します。実キーやDB URLをログへ出さないでください。

## 今回の対象外

- アプリ画面からSupabaseを呼び出すこと。
- API Route追加。
- 認証導入。
- 型生成。
- `fish_species` / `fishing_spots` / `source_registry` のDB化。
- `external_catch_memos` のDB保存。
- service role key、DB URL、DB passwordの使用。
- 外部サイトアクセス、スクレイピング、定期実行ジョブ、AI解析、新API、有料API。

次の候補は、`fish_species` / `fishing_spots` / `source_registry` のDB化設計です。
