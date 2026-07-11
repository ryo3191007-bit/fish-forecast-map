# localStorageバックアップ/復元導線設計

## 目的

このドキュメントは、Supabase導入前にブラウザlocalStorageへ保存している手動外部釣果メモを、ユーザーが安全にバックアップ/復元できるようにするための設計メモです。

このIssueでは設計のみを扱い、実装ファイル変更、UI変更、エクスポート/インポート機能実装、JSONバリデーション実装、localStorage key変更、localStorageデータ構造変更、Supabase導入、npmパッケージ追加、外部サイトアクセス、スクレイピング、定期実行ジョブ、AI解析、新API追加は行いません。

## 対象データ

対象は、ユーザーが手動で登録した外部釣果メモに限定します。

- 対象localStorage key: `fish-forecast-map.external-catch-memos`
- 対象データ: `acquisitionMethod: "manual"` の手動外部釣果メモ
- 現在の保存場所: ブラウザlocalStorage
- バックアップ単位: 対象keyに保存されている外部メモ配列

### 対象外

以下はバックアップ/復元対象に含めません。

- 地図レイヤー設定。
- フィルタ状態。
- Open-Meteo環境データ。
- SCORE計算結果。
- モック釣果データ。
- 釣り場マスター。
- 魚種マスター。
- SupabaseやDB上のデータ。
- 外部サイト本文、画像、コメント全文、プロフィール詳細。

まずユーザーが手動で登録したデータの保護を優先し、UI状態や都度取得・算出データを含めて設計が膨らむことを避けます。

## エクスポートJSON形式案

エクスポートはJSONファイルをユーザー端末へダウンロードする想定です。

- ファイル名候補: `fish-forecast-map-external-catch-memos-YYYYMMDD.json`
- 文字コード: UTF-8
- MIME type候補: `application/json`
- ルートはオブジェクトとし、メタ情報と `items` を分けます。
- `items` には現在の手動外部釣果メモ配列を格納します。

```json
{
  "schemaVersion": 1,
  "exportedAt": "2026-07-10T00:00:00.000Z",
  "appName": "fish-forecast-map",
  "sourceLocalStorageKey": "fish-forecast-map.external-catch-memos",
  "items": [
    {
      "id": "external-memo-example",
      "species": "アジ",
      "caughtDate": "2026-07-01",
      "areaName": "唐津湾",
      "estimatedSpotName": "例示用の推定地点",
      "spotId": "example-spot-id",
      "coordinatePrecision": "approximate",
      "method": "サビキ",
      "catchCount": 5,
      "sizeCm": 20,
      "sourceId": "manual",
      "sourceName": "手入力",
      "sourceUrl": "https://example.com/report",
      "acquisitionMethod": "manual",
      "confidence": "medium",
      "environmentMatchNotes": [],
      "createdAt": "2026-07-01T00:00:00.000Z",
      "updatedAt": "2026-07-01T00:00:00.000Z",
      "userMemo": "任意の短い手元メモ"
    }
  ]
}
```

### JSONスキーマ案

実装時の最低限チェック候補です。このIssueではJSON Schemaファイルやバリデーション処理は追加しません。

| フィールド | 必須 | 方針 |
| --- | --- | --- |
| `schemaVersion` | 必須 | 数値。初期値は `1` とし、後方互換性の判断に使う。 |
| `exportedAt` | 必須 | ISO 8601文字列。エクスポート日時の表示と復元確認に使う。 |
| `appName` | 必須 | `fish-forecast-map` を期待値にする。 |
| `sourceLocalStorageKey` | 必須 | `fish-forecast-map.external-catch-memos` を期待値にする。 |
| `items` | 必須 | 配列。各要素は手動外部釣果メモとして検証する。 |

`items` の各要素は、少なくとも `id`、`species`、`caughtDate`、`areaName`、`sourceId`、`sourceName`、`sourceUrl`、`acquisitionMethod`、`confidence`、`createdAt`、`updatedAt` を確認します。`acquisitionMethod` は初期実装では `manual` のみ受け入れます。

## バージョン管理方針

- `schemaVersion` は必須にします。
- 初期のバックアップ形式は `schemaVersion: 1` とします。
- `schemaVersion` が未指定、未対応、または将来版の場合は、既存localStorageを変更せずエラーとして扱います。
- 後方互換変換が必要になった場合は、別Issueで変換方針とテストを設計します。
- localStorage内の既存データ構造は、このバックアップ設計だけでは変更しません。
- Supabase移行時も、バックアップJSONの `schemaVersion` をインポート元形式の判定に使えるようにします。

## インポート/復元の安全フロー

インポートは、ユーザーが選択したJSONファイルを読み込む手動操作として設計します。インポート時に外部URLへアクセスせず、JSON内のURLを自動取得、クロール、スクレイピングしません。

1. ユーザーがJSONファイルを選択する。
2. ファイルサイズや拡張子を安全側に確認する。
3. JSONとしてパースする。
4. ルートオブジェクト、`schemaVersion`、`appName`、`sourceLocalStorageKey`、`items` 配列を確認する。
5. 各itemの最低限バリデーションを行い、受け入れ可能件数、重複候補件数、除外件数、エラー件数を集計する。
6. 復元前に、対象key、エクスポート日時、読み込み件数、追加予定件数、除外予定件数をユーザーへ表示する。
7. 既存localStorageを即時上書きせず、ユーザーが復元方法を明示的に選ぶまで保存しない。
8. 初期実装では「重複候補を除外して追加」を第一候補にする。
9. 保存直前に必要なら復元前自動バックアップを作成する。
10. 新しい配列をメモリ上で組み立て、最後に1回だけ `fish-forecast-map.external-catch-memos` へ保存する。
11. 保存成功後に、追加件数、除外件数、注意事項を表示する。

### 復元方法の選択肢

| 選択肢 | 方針 | 初期実装での優先度 |
| --- | --- | --- |
| 重複候補を除外して追加 | 既存データを残し、明らかな重複だけ除いて追加する。 | 高 |
| 追加 | 既存データを残し、読み込めたデータを追加する。重複が増える可能性がある。 | 中 |
| 上書き | 既存データをバックアップ内容へ置き換える。誤操作リスクが高いため強い確認が必要。 | 低 |

初期実装では安全側に倒し、上書きは実装しない、または復元前自動バックアップと二段階確認を必須にする方針を検討します。

## 失敗時の扱い

- JSONパース失敗、`schemaVersion` 不一致、`items` 不正、item検証失敗、保存失敗のいずれの場合も、既存localStorageを変更しません。
- 検証中はメモリ上の一時データとして扱い、検証が完了するまで `fish-forecast-map.external-catch-memos` へ書き込みません。
- 一部itemだけが不正な場合は、全体を中止するか、不正itemを除外して確認画面に明示するかを後続Issueで決めます。初期実装では、ユーザーに除外件数と理由を示したうえで保存前確認を必須にします。
- 保存処理の直前に復元前自動バックアップを作る案を検討します。ただし、自動バックアップの保存先、世代数、容量上限は別Issueで扱います。
- 復元失敗後も既存データでアプリを継続利用できることを優先します。

## 重複検知方針

完全な一意性判定は難しいため、初期実装では「重複候補」として安全側に扱います。完全一致だけで既存データを自動削除しません。

### 候補キー

以下の組み合わせで同一または重複候補を判定します。

- `sourceUrl`
- `caughtDate`
- `species` または将来の `speciesId`
- `areaName`
- `spotId`
- `method`
- `createdAt`

### 判定方針

- `id` が同じで主要フィールドも同じ場合は、明らかな重複候補として除外します。
- `sourceUrl`、`caughtDate`、`species`、`areaName`、`spotId`、`method` が一致する場合は、重複候補として扱います。
- `sourceUrl` だけの一致では、同一ページに複数釣果がある可能性があるため、自動削除しません。
- 判断できない場合は、ユーザー確認または別件として追加する方針にします。
- 重複検知の結果は、将来Supabase移行時のDBインポート重複判定にも流用できるようにします。

## 保存してよい情報 / 保存しない情報

バックアップファイルにも、既存方針で保存してよい情報だけを含めます。

### 保存してよい情報

- 魚種。
- 釣果日。
- エリア。
- 推定地点名、または `spotId`。
- 座標を扱う場合の座標精度区分。
- 釣り方。
- 匹数。
- サイズ。
- 情報元名。
- 情報元URL。
- `acquisitionMethod`。
- `confidence`。
- 作成日時、更新日時。
- ユーザーが手動入力した短い手元メモ。ただし、外部サイト本文全文、コメント全文、不要な個人情報を貼り付けない前提にします。

### 保存しない情報

- 外部サイト本文全文。
- 第三者サイトの記事本文の長文転載。
- 画像コピー。
- コメント全文。
- 投稿者プロフィール詳細。
- スクレイピングで自動取得した本文。
- アプリ利用に不要な個人情報。
- 同意のない正確なユーザー現在地。

## セキュリティ/プライバシー注意

- エクスポートファイルはユーザーの端末に保存されます。
- ファイルには出典URL、釣果日、エリア、釣り方、ユーザーの短い手元メモ相当の情報が含まれる可能性があります。
- 共有、クラウド保存、第三者へのアップロード時は、出典URLや個人メモが含まれる可能性に注意します。
- アプリ側で外部サイト本文全文や画像は保存しません。
- インポート時に外部URLへアクセスしません。
- インポートJSON内のURLを自動取得、クロール、スクレイピングしません。
- バックアップファイルは釣果を保証するデータではなく、公式な安全判断、航行判断、潮汐判断のデータでもありません。
- 不明なJSONファイルを取り込む場合は、件数、出典URL、対象keyを確認してから復元します。

## Supabase移行との関係

- バックアップJSONは、将来Supabase移行時の手動インポート元になり得ます。
- Supabase移行後は、ログイン後の正本をDB、未ログイン時や移行前の一時保存をlocalStorageとする方針にします。
- localStorageとDBを長期的に二重の正本にしません。
- `schemaVersion` は、DBインポート時にバックアップ形式を判定するためにも利用します。
- 今回の重複検知方針は、DBインポート時の `source_url`、`caught_date`、`species`、`area_name`、`spot_id` などの重複候補判定へ流用します。
- Supabase導入、認証、RLS、DBマイグレーション、SQL、API Routeは、このドキュメントでは実装しません。
- DB移行に成功した後も、localStorageの削除は即時自動実行せず、ユーザー確認と復旧導線を優先します。

## 後続実装Issueへの分割案

1. 外部メモのエクスポートJSON生成を実装する。
2. 外部メモのインポート前バリデーションを実装する。
3. 復元確認モーダルを実装する。
4. 重複候補除外/追加ロジックを実装する。
5. 復元前自動バックアップを実装する。
6. 上書き復元を実装するか判断し、必要なら二段階確認を設計する。
7. バックアップ/復元のユーザー向け注意文言を整備する。
8. Supabase移行時のDBインポートに接続する。

## 今回の対象外

- 実装ファイル変更。
- UI変更。
- エクスポート機能実装。
- インポート機能実装。
- JSONバリデーション実装。
- localStorage key変更。
- localStorageデータ構造変更。
- Supabaseプロジェクト作成。
- Supabaseクライアント導入。
- npmパッケージ追加。
- `.env` / 環境変数追加。
- DBマイグレーション作成。
- SQL実装。
- API Route追加。
- SCORE計算ロジック変更。
- 外部サイトアクセス。
- スクレイピング。
- 定期実行ジョブ。
- AI解析。
- 新API追加。

## Supabaseへの明示的移行時のlocalStorage保持方針

Supabase利用可能後も、既存localStorage外部メモは自動移行しません。移行はログイン済みユーザーが候補を確認し、選択したlocalStorage由来メモだけを明示的に実行する操作です。

移行時も、DB保存前に `fish-forecast-map.external-catch-memos` の対象メモを削除しません。DB保存後にSupabaseから再取得し、対象メモを確認できた場合だけ、その対象メモをlocalStorage配列から外します。DB保存失敗、再取得確認失敗、同一ID重複、DB利用不可、未ログイン、一部失敗などのケースでは、ユーザーデータを失わないため未移行メモをlocalStorageに残します。

移行後の確認手順は、対象メモがSupabase保存として表示されること、ページ再読込後も重複・復活がないこと、未選択または失敗したlocalStorageメモが引き続き残ることを確認します。localStorage keyの変更、key削除、全件一括削除、配列全件upsertは行いません。

### 本番仕上げ確認: tombstoneと未移行localメモの表示分離

削除失敗時などにユーザー別local tombstone metadataが残っている場合でも、`fish-forecast-map.external-catch-memos` 内の現在ユーザー向けlocalメモが0件なら、ユーザー向け保存先表示は `外部メモ: Supabase` として扱います。tombstoneはDB行の再表示を防ぐ内部メタ情報であり、未移行localStorageメモとは別概念です。tombstone対象のDB行は引き続き画面上で非表示にし、tombstoneを無条件削除して復活させません。

最後の未移行localメモを明示移行した場合は、候補が0件になっても直近の移行結果（成功・スキップ・失敗件数）を表示し、ユーザーが成功を確認できる状態を保ちます。
