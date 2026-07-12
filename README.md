# fish-forecast-map

釣果予測マップは、福岡県糸島市西岸から唐津湾、伊万里湾、平戸方面までの陸っぱり釣り情報を地図で確認するための個人利用Webアプリです。堤防・磯場などでルアー釣り／エサ釣りを検討するときに、地図・地点評価・SCORE用のモック釣果と、ユーザー自身の釣果記録、魚種、エリア、釣り方、地点ごとの釣れそう度スコアを確認できます。釣果一覧は自分の釣果記録のみを表示します。

- 公開URL: https://fish-forecast-map.vercel.app/#map
- 利用目的: 個人利用向けのMVP検証
- データ: モック釣果は地図・地点評価・SCORE用、釣果一覧は自分の釣果記録のみ。マスターデータはSupabase read層を経由し、未設定時は静的fallbackで表示します

## 現在できること

- MapLibre GL JSの地図でモック釣果地点マーカーと、釣り場に紐づけた自分の釣果記録由来のマーカーを確認できます。地図用候補は既存の外部メモデータを維持し、一覧だけを自分の釣果記録に限定します。
- 画面上部の小さな表示で、マスターデータの取得元（`データ: Supabase` / `データ: 静的fallback` / `データ読込中...`）を確認できます。
- 釣果一覧カードでは、ユーザー自身が記録した釣果だけについて日付、エリア、場所、魚種、釣果数、サイズ、釣り方、メモを確認でき、各カードの「編集」ボタンから編集できます。個別カードには `SCORE` やスコア根拠は表示しません。
- 釣果一覧は、魚種フィルタ、エリアフィルタ、キーワード検索、開始日/終了日の期間フィルタで絞り込みできます。
- 釣果一覧は、日付が新しい順、日付が古い順で並び替えできます。
- 地点評価一覧では、モック釣果と条件に合う本人の釣果記録を参考にした平均 `SCORE` を確認できます。
- 条件リセットボタンで、魚種 `all`、エリア `all`、キーワード空、開始日/終了日未指定などの初期状態に戻せます。
- ヘッダーのログインボタンから認証モーダルを開き、Supabase Authの状態確認、ログイン、ログアウトを操作できます。常設の認証パネルは表示しません。
- 「釣果を登録」モーダルは入力フォームだけを表示し、ユーザー自身の釣果記録を保存します。情報元URL・情報元・信頼度は画面入力せず、既存DB互換のため新規登録時に内部固定sourceを付与します。ログイン中はSupabaseへ保存し、未ログイン・未設定・DBエラー時は既存localStorageへfallbackします。既存localStorageの釣果記録はモーダル外の別導線からユーザー操作で明示移行します。
- 画面下部の外部サイト参考リンク4件を別タブで開けます。リンクは参考閲覧用で、自動取得ではありません。
- 自分の釣果記録単体には個別 `SCORE` を付けず、条件に合う場合だけ既存地点の `SCORE` へ小さく参考反映します。
- Open-Meteo Weather / Marine APIによる天気・海況の参考データを表示できます。公式潮汐表、安全判断、航行判断の代替にはしません。
- 水深・3D地形モードで、NOAA NCEI ETOPO 2022 60 arc-second BedrockのテキストDEMからbuild前に生成したTerrain-RGB、色別水深、等深線、hillshadeを参考表示できます。
- ダーク／ネオン／ガラス風のダッシュボードUIでPC・スマホから確認できます。

## 現在やらないこと

- 釣果日記、公開投稿、SNS的な個人釣行ログ、画像投稿。
- 外部釣果サイトの自動取り込み、スクレイピング、定期実行ジョブ、AI解析。
- Supabase/DBを唯一の正本にすること、既存localStorageの釣果記録の自動DB移行。マスターデータの読み取りは任意で、未設定時は静的fallbackで動作します。自分の釣果記録はログイン中のみ自分のDB行へread/writeし、未ログイン・未設定・DBエラー時は既存localStorageへfallbackします。
- 公式潮汐表、安全判断、航行判断としての利用。
- 自分の釣果記録単体への個別SCORE付与、実績ベースの高度な予測、複雑な機械学習。
- ページネーション、URLクエリ同期。
- 有料API、有料地図サービス、有料ホスティングの追加導入。

## 使用技術

- フロントエンド: Next.js + TypeScript
- UI: CSS（`src/app/globals.css`）
- 地図: MapLibre GL JS
- データ: Supabase master read層 + 静的fallbackの釣り場/魚種/外部情報源マスター、ローカルのモック釣果データ、ログイン中のSupabase Authユーザー所有DB行またはブラウザlocalStorageへ手動保存する自分の釣果記録
- 品質確認: ESLint、TypeScript、`npm test`、Next.js build

## ローカル起動方法

依存関係は `package-lock.json` に固定しているため、通常は `npm ci` を使います。

```bash
npm ci
npm run dev
```

`npm run dev` を実行したら、ブラウザで `http://localhost:3000` を開きます。

## 品質確認コマンド

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

## データ方針

MVP v0.1の基本データはモック釣果データです。モック釣果は地図・地点評価・既存SCORE用の参考データとして維持し、釣果一覧は `acquisitionMethod === "manual"` のユーザー自身の釣果記録のみを表示します。自分の釣果記録単体には個別 `SCORE` を付けませんが、条件に合う本人の釣果記録だけを既存地点の `SCORE` へ小さく参考反映します。釣果情報には内部互換用の出典名と出典URLのフィールドを持たせますが、第三者サイト本文の転載、画像保存、コメント全文保存、プロフィール詳細保存、自動収集は行いません。将来的に外部情報の取り込みを検討する場合は、利用規約、robots.txt、著作権、アクセス負荷を確認し、公式API、RSS、許可を得た情報源、ユーザー提供情報を優先します。アプリ上の釣れそう度は参考情報であり、実際の釣果を保証するものではありません。

## Supabase / DBの現在状態

Supabase連携は、master read、Supabase Auth、ログインユーザー単位のowner-scoped DB read/write、論理削除RPC、既存localStorageの釣果記録のユーザー明示移行、migration安全チェックと本番反映自動化まで完了しています。新しいDB変更の正本は `supabase/migrations/` です。現時点でSQL Editorから手動実行すべきSQLはありません。

画面側は `fetchMasterData()` 経由でマスターデータを初期化します。Supabaseから読み取れる場合はSupabaseの `fish_species` / `fishing_spots` / `source_registry` を使い、未設定・通信失敗・0件時は既存の静的データへfallbackします。UIには `データ: Supabase`、`データ: 静的fallback`、`データ読込中...` の控えめな取得元表示を出します。

自分の釣果記録はログイン中ユーザーの手入力データとしてSupabaseへ保存します。未ログイン、Supabase未設定、DBエラー時は既存localStorageへfallbackし、既存localStorage keyの変更、削除、自動DB移行、一括upsertは行いません。

## 自分の釣果記録の扱い

MVP v0.1の基本データはモック釣果データです。モック釣果は地図・地点評価・既存SCORE用の参考データとして維持します。一方、釣果一覧は、`acquisitionMethod === "manual"` のユーザー自身の釣果記録のみを対象にします。登録モーダル内に登録済み一覧は表示しません。`ai_assisted` / `auto` の外部メモがDBやlocalStorageに存在しても、自分の釣果記録一覧の件数・フィルタ・カード表示には含めません。
内部実装では後方互換のため `ExternalCatchMemo` 型、`external_catch_memos` テーブル、既存localStorage keyを維持しています。これらは利用者向け名称ではなく、DB schema/RLS/RPC/既存レコードとの互換維持用の内部名称です。

外部サイト本文、画像、コメント、プロフィール情報の取得・保存や、スクレイピング、自動取得、定期アクセス、AI解析は行いません。画面下部の外部サイトリンクは参考閲覧用であり、本アプリが情報を自動取得しているわけではありません。

## 今後の候補

- Open-Meteo以外の環境データ連携や、公式潮汐表への参照・リンクの検討。ただし、安全判断・航行判断の代替にはしない。
- 釣れそう度スコアの高度化と理由表示の改善。
- 公式API、RSS、許可済み情報源、ユーザー提供情報を前提にした将来の釣果情報取り込み設計。
- 公開範囲を広げる場合の地点座標丸め、詳細地点非公開化、利用規約整備。

## 関連ドキュメント

- `AGENTS.md`
- `docs/REQUIREMENTS.md`
- `docs/MVP_SCOPE.md`
- `docs/ARCHITECTURE.md`
- `docs/DATA_POLICY.md`
- `docs/DATA_PERSISTENCE_PLAN.md`
- `docs/LOCAL_STORAGE_BACKUP_PLAN.md`
- `.env.example`（Supabase環境変数のダミーテンプレート）
- `docs/SUPABASE_SETUP_PLAN.md`
- `docs/SUPABASE_READONLY_CONNECTION_CHECK.md`
- `docs/SUPABASE_MASTER_DATA_DESIGN.md`
- `docs/SUPABASE_MASTER_DATA_SETUP.md`
- `docs/CODEX_WORKFLOW.md`
- `docs/MVP_COMPLETION.md`

## Supabase master data read check

Post-MVP-021では、Supabaseから `fish_species` / `fishing_spots` / `source_registry` を読める場合だけ読み、未設定・SQL未実行・テーブル未作成・read error時は既存静的データへfallbackするread層を追加しています。

```bash
npm run check:master-read
```

この確認コマンドは `.env.local` がない環境でも失敗扱いにせず、`Source: static-fallback` と静的データ件数を表示します。実キー、service role key、DB URL、DB passwordは使いません。詳細は `docs/SUPABASE_MASTER_DATA_READ.md` を参照してください。

### 自分の釣果記録UI

Post-MVP-035では、画面上の登録UIを外部情報メモではなくユーザー自身の釣果記録として整理しました。新規登録と編集は同じフォームモーダルを使い、編集は釣果一覧カードの明示的な「編集」ボタンから開始します。削除操作は編集モーダル内だけに表示します。既存の型・repository・テーブル名に `ExternalCatchMemo` / `external_catch_memos` が残るのは後方互換のためです。localStorageからSupabaseへの移行は自動化せず、登録モーダル外のコンパクトな明示導線で実行します。

## 水深・3D地形モード

マップのレイヤー切替は `通常地図 / 航空写真 / 水深・3D地形` の3モードです。水深・3D地形モードでは NOAA NCEI ETOPO 2022 の対象地域のみから生成した静的タイルを使い、2D水深色分け、等深線、hillshade、対応端末でのMapLibre terrainを表示します。スマホ、低性能端末、reduced motion、3D初期化失敗時は2D水深表示へフォールバックします。

水深はETOPO 2022 DEMに基づく参考表示であり、航海・安全判断には使用できません。全世界データとPNGバイナリはGit管理対象にせず、開発・テスト・ビルド前に `data/bathymetry/etopo-2022-crop.json` のテキストDEMから静的PNG/GeoJSON/metadataを生成します。Next.js/Vercel実行時の外部取得・スクレイピング・リクエストごとのタイル生成も行いません。生成手順とライセンスは `docs/BATHYMETRY_AND_3D_TERRAIN_DESIGN.md` と `tools/bathymetry/README.md` を参照してください。
