# Supabase master data read + static fallback

Post-MVP-021では、`fish_species` / `fishing_spots` / `source_registry` をSupabaseから読み取れる場合だけ読み取り、失敗時は既存の静的データで動き続ける安全なread経路を追加しました。

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
5. エラーや0件が出る場合でも、`Source: static-fallback` と表示されればアプリは既存静的データで継続できます。

## 現時点の接続範囲

今回の主目的は、DBを正本に切り替えることではなく、安全なread層、mapper、fallback、確認コマンドを用意することです。既存画面は引き続き静的データを直接利用しており、UIデザインやスコア計算は変更していません。

既存画面への接続候補は次の通りです。

- 地図マーカーと地点詳細で使う `fishingSpots`。
- 魚種フィルタで使う `fishSpeciesNames` / `fishSpecies`。
- 外部メモ入力補助や出典表示で使う `externalSources`。

ただし、現在の `FishingDashboard` はクライアントコンポーネントで複数の同期的な静的importを前提にしているため、非同期readを画面へ接続する場合はloading/error表示や初期選択地点の扱いを小さく設計してから行います。

## 今回やらないこと

- 実DBテーブル作成、seed投入、Supabase SQL Editorでの実行。
- DBを正本に切り替えること。
- 既存静的データやfallbackの削除。
- 外部サイトアクセス、スクレイピング、定期実行、AI解析。
- 認証、型生成、PostGIS、中間テーブル作成。
- external catch memoのDB保存。

## 次の候補

- UI上でDB取得状態を軽く確認できる表示を追加する。
- 外部メモDB保存の設計または実装を検討する。
