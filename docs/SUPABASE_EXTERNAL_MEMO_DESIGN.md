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

## 後続候補

1. SQLを手動実行してよいかのチェックポイントを設ける。
2. 認証導入、管理者だけの保存、またはサーバー側API経由の保存方式を選ぶ。
3. `owner_id = auth.uid()` を前提にしたauthenticated read/write policyを別Issueで追加する。
4. UIからDB readを任意接続し、失敗時はlocalStorage fallbackを維持する。
5. 明示的な移行操作を設計し、重複登録と削除方針を確認する。
