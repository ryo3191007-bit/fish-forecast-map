## 変更内容

## 変更理由

## 動作確認方法

## ファイル確認

- [ ] 未承認のバイナリファイルを追加・変更していない

## DB migration確認

- [ ] DB変更なし
- [ ] DB変更は `supabase/migrations/<timestamp>_<description>.sql` に追加した
- [ ] `supabase/sql/*.sql` の手動適用済みSQLを無条件に再実行していない
- [ ] `npm run check:migration-safety` を実行した
- [ ] 正規表現チェックだけを安全保証にせず、RLS/権限/復旧方針をレビューした
- [ ] 破壊的変更がある場合、ユーザー承認前にマージしない
- [ ] rollback方法またはforward-onlyの復旧方針を記載した

## 既知の制約

## ドキュメント更新の有無
