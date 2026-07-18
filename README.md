# fish-forecast-map

釣果予測マップは、福岡県糸島市西岸から唐津湾、伊万里湾、平戸方面までの陸っぱり釣り情報を地図で確認するための個人利用Webアプリです。地図・地点評価・SCORE用のモック釣果と、ユーザー自身の釣果記録、魚種、エリア、釣り方、地点ごとの参考SCOREを確認できます。釣果一覧は自分の釣果記録のみを表示します。

- 公開URL: https://fish-forecast-map.vercel.app/#map
- 利用目的: 個人利用向けのMVP検証
- データ: モック釣果は地図・地点評価・SCORE用。釣果一覧は自分の釣果記録のみ。マスターデータはSupabase read層を経由し、未設定時は静的fallbackで表示します。

## 現在できること

- MapLibre GL JSの地図でモック釣果地点と、自分の釣果記録由来のマーカーを確認できます。
- マスターデータの取得元を `データ: Supabase` / `データ: 静的fallback` / `データ読込中...` で確認できます。
- 自分の釣果記録を登録・編集・削除し、魚種、エリア、キーワード、期間で絞り込めます。
- ログイン中はSupabaseへ保存し、未ログイン・未設定・DBエラー時はlocalStorageへfallbackします。
- 既存localStorageデータはユーザー操作による明示移行のみ行い、自動移行・自動削除はしません。
- 地点評価一覧では、モック釣果と条件に合う本人記録を参考にした平均SCOREを確認できます。
- Open-Meteo Weather / Marine APIによる7日間の天気・風・波・水温・潮位参考値・海流を表示できます。
- 選択日の潮回り参考、満潮・干潮参考時刻、気象庁公式潮位表へのリンクを表示します。
- 画面下部の外部サイト参考リンクを別タブで開けます。自動取得は行いません。
- `通常地図 / 航空写真 / 水深・3D地形` の3モードを切り替えられます。
- 水深モードではGEBCO_2026 15秒を第一source、ETOPO 2022 60秒をfallbackとして、2D水深色分け、等深線、hillshade、対応端末でのMapLibre terrainを表示します。
- GEBCO TID Gridを用いて、現在の地図中心周辺17×17セルのデータ由来を表示します。
- GEBCO 0m境界の海岸線ラインと完全不透明の落ち着いた緑の陸地マスクを任意ON/OFFできます。
- ダーク／ネオン／ガラス風のUIをPC・スマホで利用できます。

## 現在やらないこと

- 釣果日記、公開投稿、SNS的な個人釣行ログ、画像投稿。
- 外部釣果サイトの自動取り込み、スクレイピング、定期実行、AI解析。
- 既存localStorageの自動DB移行。
- 公式潮汐表、安全判断、航行判断としての利用。
- 自分の釣果記録単体への個別SCORE付与。
- 有料API、有料地図サービス、有料ホスティングの追加導入。

## 使用技術

- フロントエンド: Next.js + TypeScript
- UI: CSS（`src/app/globals.css`）
- 地図: MapLibre GL JS
- 環境データ: Open-Meteo Weather / Marine API
- データ: Supabase Auth / Postgres / RLS + 静的fallback + localStorage
- 品質確認: ESLint、TypeScript、`npm test`、Next.js build

## ローカル起動方法

```bash
npm ci
npm run dev
```

ブラウザで `http://localhost:3000` を開きます。

## 品質確認コマンド

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

## データ方針

MVP v0.1の基本データはモック釣果です。モック釣果は地図・地点評価・既存SCORE用の参考データとして維持し、釣果一覧は `acquisitionMethod === "manual"` のユーザー自身の記録のみを表示します。本人記録単体には個別SCOREを付けず、条件に合う場合だけ既存地点SCOREへ小さく参考反映します。

外部サイト本文、画像、コメント全文、プロフィール詳細を保存しません。スクレイピング、自動取得、定期アクセス、AI解析も行いません。将来の取り込みは公式API、RSS、許可済み情報源、ユーザー提供情報を優先します。現在 `crawlPolicy === "allowed"` のサイトはありません。

## Supabase / DBの現在状態

Supabase連携はmaster read、Auth、ログインユーザー単位のowner-scoped read/write、論理削除RPC、localStorage明示移行、migration安全チェックと本番反映自動化まで完了しています。新しいDB変更の正本は `supabase/migrations/` です。現時点でSQL Editorから手動実行すべきSQLはありません。

Supabaseから `fish_species` / `fishing_spots` / `source_registry` を読み取り、未設定・通信失敗・0件時は静的データへfallbackします。調査済み17地点は安全な最小本番値として、未確認の魚種・釣法を空配列、立入状態を `不明` に揃え、代表点の限界を地点別notesで表示します。

## 水深・3D地形モード

### 採用source

- 第一source: `GEBCO_2026 Grid 15 arc-second`
- データ由来: `GEBCO_2026 TID Grid`
- fallback: `NOAA NCEI ETOPO 2022 60 Arc-Second Bedrock`
- 海岸線補助: GEBCO 0m境界から生成した海岸線ライン + 完全不透明の落ち着いた緑の陸地マスク

GEBCO正本の対象範囲は west `128.5` / south `32.5` / east `130.8` / north `34.0`、shapeは `552 x 360`、DEM nodataは `-32767`、min/maxは `-277 / 1346`、TID nodataは `127`、出現コードは `0/11/17/40/43/44` です。

GEBCO metadata、tile decode、terrain初期化等が失敗した場合はETOPOへ切り替えます。ETOPOも失敗した場合は水深layer、terrain、海岸線overlay、各水深出典を解除し、通常地図へ戻します。

水深は参考表示であり、航海・安全判断には使用できません。15秒メッシュでも港内、岩礁、根、瀬、航路の正確な位置・水深を保証しません。

### データ生成

Git管理する正本:

- `data/bathymetry/gebco-2026-crop.json`
- `data/bathymetry/gebco-2026-tid-crop.json`
- `data/bathymetry/etopo-2022-crop.json`

生成物はGit管理せず、dev/test/build前に生成します。

```bash
npm run generate:bathymetry
```

公式GEBCO NetCDFから正本を更新する手動変換手順:

```bash
python -m pip install netCDF4
node tools/bathymetry/convert-gebco-netcdf.mjs /local/gebco.nc /local/gebco_tid.nc
```

通常のNext.js/Vercel buildやruntimeからGEBCO/NOAAの外部取得は行いません。詳細は `docs/BATHYMETRY_AND_3D_TERRAIN_DESIGN.md`、`docs/COASTAL_BATHYMETRY_DATA_RESEARCH.md`、`tools/bathymetry/README.md` を参照してください。

## 今後の候補

- 環境予報を既存SCOREへ安全に反映するPhase 2。
- 釣り場属性調査仕様に沿った実地点データの段階的追加。
- 釣れそう度スコアの高度化と理由表示の改善。
- 公式API、RSS、許可済み情報源、ユーザー提供情報を前提にした将来の釣果情報取り込み設計。
- 公開範囲を広げる場合の地点座標丸め、詳細地点非公開化、利用規約整備。

## 関連ドキュメント

- `AGENTS.md`
- `docs/REQUIREMENTS.md`
- `docs/MVP_SCOPE.md`
- `docs/ARCHITECTURE.md`
- `docs/DATA_POLICY.md`
- `docs/ROADMAP.md`
- `docs/BATHYMETRY_AND_3D_TERRAIN_DESIGN.md`
- `docs/COASTAL_BATHYMETRY_DATA_RESEARCH.md`
- `docs/FISHING_SPOT_RESEARCH_SPEC.md`
- `docs/開発引き継ぎ書.md`
- `tools/bathymetry/README.md`
