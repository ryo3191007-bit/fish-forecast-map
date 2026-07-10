# Supabase master data read + static fallback

Post-MVP-021では、`fish_species` / `fishing_spots` / `source_registry` をSupabaseから読み取れる場合だけ読み取り、失敗時は既存の静的データで動き続ける安全なread経路を追加しました。Post-MVP-022では、このread経路を `FishingDashboard` の初期化に接続しました。

## 仕組み

- アプリ内の取得層は `src/lib/masterDataRepository.ts` です。
- Supabaseクライアントは既存の `NEXT_PUBLIC_SUPABASE_URL` と `NEXT_PUBLIC_SUPABASE_ANON_KEY` だけを使います。
- `SUPABASE_SERVICE_ROLE_KEY`、`SUPABASE_DB_URL`、DB passwordは使いません。
- import時に環境変数が未設定でもthrowしません。
- DB行のsnake_caseは `src/lib/masterDataMapper.ts` で既存TypeScript型のcamelCaseへ変換します。
- 返却メタ情報の `source` で、取得元が `supabase` か `static-fallback` かを確認できます。

## fallbackするケース

以下の場合は静的データへfallbackします。

- `.env.local` がない。
- `NEXT_PUBLIC_SUPABASE_URL` または `NEXT_PUBLIC_SUPABASE_ANON_KEY` が未設定。
- SQL未実行、テーブル未作成、RLS/権限不備、通信失敗などでselectが失敗する。
- Supabaseから取得できても、対象テーブルの有効行が0件になる。

fallback先は既存の静的データです。

- 魚種: `src/domain/fishing.ts`
- 釣り場: `src/data/fishingSpots.ts`
- 外部情報源: `src/data/externalSources.ts`

## 確認コマンド

```bash
npm run check:master-read
```

出力例:

```text
Supabase configured: no
Source: static-fallback
Fallback reason: missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY
fish_species count: 15
fishing_spots count: 18
source_registry count: 4
```

この確認コマンドは、`.env.local` がない環境やテーブル未作成の環境でも失敗扱いにせず、fallback可能であることを表示します。実キーはログに出しません。

## SQL手動実行後の確認手順

1. Supabase SQL Editorで、別Issueで作成済みのSQL定義とseed SQLをユーザーが手動実行します。
2. ローカルの `.env.local` に `NEXT_PUBLIC_SUPABASE_URL` と `NEXT_PUBLIC_SUPABASE_ANON_KEY` を設定します。
3. `npm run check:master-read` を実行します。
4. `Source: supabase` と3テーブルの件数が表示されることを確認します。
5. アプリ画面を開き、上部の取得元表示が `データ: Supabase` になることを確認します。
6. エラーや0件が出る場合でも、`Source: static-fallback` と画面の `データ: 静的fallback` が表示されればアプリは既存静的データで継続できます。

## 画面側の接続範囲

`FishingDashboard` は初期表示時に `fetchMasterData()` を呼び、取得結果の `fishingSpots`、`fishSpecies`、`externalSources` を画面stateへ保持します。Supabase未設定、SQL未実行、通信失敗、0件などでfallbackした場合も、既存静的データを使って地図マーカー、地点一覧、地点詳細、魚種フィルタ、外部メモの情報元/釣り場選択を表示します。

画面には小さな取得元表示を追加しています。

- `データ読込中...`: `fetchMasterData()` の実行中。初期値には静的データを入れているため、読み込み中でも画面は大きく崩れません。
- `データ: Supabase`: 3つのマスターをSupabaseから取得できた状態。
- `データ: 静的fallback`: Supabase未設定、read error、0件などにより静的データを使っている状態。fallback理由は簡潔な日本語だけを表示し、実キーやURLは表示しません。

この接続はDBを唯一の正本へ切り替えるものではありません。既存静的データ、static fallback、モック釣果、スコア計算ロジックは保持しています。

## 今回やらないこと

- 実DBテーブル作成、seed投入、Supabase SQL Editorでの実行。
- DBを正本に切り替えること。
- 既存静的データやfallbackの削除。
- 外部サイトアクセス、スクレイピング、定期実行、AI解析。
- 認証、型生成、PostGIS、中間テーブル作成。
- external catch memoのDB保存。

## 次の候補

- 外部メモDB保存の設計または実装を検討する。
