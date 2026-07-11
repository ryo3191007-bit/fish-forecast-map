# Supabase migrations

このディレクトリを、今後のDBスキーマ変更の正本にします。

- 新規DB変更は `supabase/migrations/<timestamp>_<description>.sql` として追加します。
- 既存の `supabase/sql/*.sql` は、過去にSQL Editorで手動適用した可能性がある参照資料です。既存SQLを無条件にmigrationへコピーして本番へ再適用してはいけません。
- 初回remote履歴同期が完了するまで、本番 `supabase db push` は実行しません。
- 本番seed投入、DB reset、service role key利用、anon writeの安易な追加は禁止です。
