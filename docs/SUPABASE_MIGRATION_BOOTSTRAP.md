# Supabase migration初回bootstrap手順

## 目的

既存の本番Supabaseには、SQL Editorで手動適用済みの変更が含まれる可能性があります。初回から `supabase db push` を実行せず、remote migration履歴と現在のpublic schema差分を読み取り専用workflowで確認してから、baselineまたは履歴同期方針を決めます。

## ユーザーが一度だけ行うGitHub設定

Secret値はGitHub画面へ直接入力し、チャット、Issue、PR、スクリーンショット、リポジトリへ貼り付けません。

1. Repositoryの `Settings` を開きます。
2. `Environments` で `production` を作成します。
3. Deployment branchesを `main` のみに制限します。
4. `production` のEnvironment secretsへ次を登録します。
   - `SUPABASE_ACCESS_TOKEN`
   - `SUPABASE_DB_PASSWORD`
   - `SUPABASE_PROJECT_ID`

## 読み取り専用の履歴確認

1. GitHubの `Actions` を開きます。
2. `Supabase Remote History Check` を選択します。
3. `Run workflow` を実行します。
4. 完了後、artifact `supabase-remote-history` を確認します。

artifactには次の2ファイルだけを保存します。

- `migration-list.txt`: local/remote migration履歴
- `remote-schema-diff.sql`: local migration正本とremote public schemaの差分候補

workflowはremote migrationの適用、repair、reset、seed投入を行いません。`migration repair` やbaseline作成が必要な場合は、実スキーマと既存 `supabase/sql/*.sql` を照合した別PRで扱います。

## 本番自動適用を有効にする条件

次の条件をすべて満たした後にだけ、別PRで `supabase/migrations/.remote-history-synced` を追加します。

- remote履歴を確認済み
- 手動適用済みSQLを再実行しない方針が確定済み
- 必要なbaseline migrationまたはmigration履歴同期が完了済み
- local/remoteの不一致が説明可能な状態
- 破壊的なrepairやスキーマ変更が必要な場合はユーザー承認済み

marker追加後は、migration SQLがmainへマージされた場合にproduction workflowが `migration list` → `db push --dry-run` → `db push` の順で実行します。途中で失敗した場合は後続処理を停止します。
