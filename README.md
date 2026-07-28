# fish-forecast-map

釣果予測マップは、福岡県糸島市西岸から唐津湾、伊万里湾、平戸方面までの陸っぱり釣り情報を地図で確認するための個人利用Webアプリです。釣り場地点、ユーザー自身の釣果記録、魚種、地点詳細、環境予報、地点ごとの参考SCOREを確認できます。

- 公開URL: https://fish-forecast-map.vercel.app/#map
- 利用目的: 個人利用向けのMVP / Post-MVP検証
- データ: マスターデータはSupabase read層を経由し、未設定・取得失敗時は静的fallbackを使用します。本人釣果・本人実地調査はowner-scopedで扱います。

## 現在できること

- MapLibre GL JSの地図で釣り場地点と、自分の釣果記録由来のマーカーを確認できます。
- 地点masterはraw 52件を保持し、広域地点監査後の通常の新規行き先としては47地点を表示します。非表示の広域地点も既存データ互換のためIDを削除しません。
- マスターデータの取得元を `データ: Supabase` / `データ: 静的fallback` / `データ読込中...` で確認できます。
- 自分の釣果記録を登録・編集・削除し、魚種、地点、キーワード、期間等で絞り込めます。
- 1件の釣果に複数魚種を登録でき、魚種ごとに釣り方・数・サイズを保持できます。
- ログイン中はSupabaseへ保存し、未ログイン・未設定・DBエラー時はlocalStorageへfallbackします。
- 既存localStorageデータはユーザー操作による明示移行のみ行い、自動移行・自動削除はしません。
- 認証はメールアドレス + パスワード方式です。既存Magic Linkユーザーはパスワード設定・再設定導線から既存user idを維持して移行できます。
- 地点評価は `環境 / 釣場 / 地形 / 魚種 / 評価` の5タブで確認できます。
- 釣場・地形タブは通常表示地点で項目構成を共通化し、確認できない値も隠さず `未確定` と表示します。
- 魚種タブでは、その地点で自分が登録した釣果魚種と事前調査情報を分離して確認できます。
- ログイン中は、釣場・地形・魚種について自分が現地で確認した情報を追加・編集・削除できます。本人情報は調査済み値とは別レイヤーで保持し、SCOREや安全・規制情報を上書きしません。
- 全52地点の地形・構造・足場・設備・規制等の再調査データを保持しています。低信憑性参考情報は明示し、調査済みでも確定できない値は `researched_unknown` として扱います。
- 全52地点の代表座標を監査済みです。座標は地点を識別する概略代表点であり、実釣位置、入口、駐車位置、安全な足場、立入可能範囲を保証しません。
- 地点評価では、地点情報、環境データ、登録済み釣果を根拠にした参考SCOREを確認できます。情報不足時は未評価として扱い、架空の釣果や不明値では補完しません。
- Open-Meteo Weather / Marine APIによる7日間の天気・風・波・水温・潮位参考値・海流を表示できます。
- 選択日の日の出・日の入り、満潮・干潮参考時刻、気象庁公式潮位表へのリンクを表示します。
- 気象庁の警報・注意報を優先する安全ゲートを使用し、取得不能や判定不能を「安全」と扱いません。
- 画面下部の外部サイト参考リンクを別タブで開けます。自動取得は行いません。
- `通常地図 / 航空写真 / 水深・3D地形` の3モードを切り替えられます。
- 水深モードではGEBCO_2026 15秒を第一source、ETOPO 2022 60秒をfallbackとして、2D水深色分け、等深線、hillshade、対応端末でのMapLibre terrainを表示します。
- GEBCO TID Gridを用いて、現在の地図中心周辺のデータ由来を確認できます。
- ダーク／ネオン／ガラス風のUIをPC・スマートフォンで利用できます。

## 現在やらないこと

- 外部釣果サイトの自動取り込み、スクレイピング、定期巡回、AIによる自動転載。
- 民間サイトの記事本文、画像、地図ピン、コメント、プロフィール、地点DBの複製。
- 既存localStorageの自動DB移行。
- 公式潮汐表、安全判断、航行判断としての利用。
- 不明値・未調査値を0点や確定値へ推測変換すること。
- 魚種生態調査JSONを存在だけでSCORE v2へ自動接続すること。
- 本人実地調査や `historical_target_species` をSCORE v2へ自動反映すること。
- 有料API、有料地図サービス、有料ホスティングの追加導入。

## 使用技術

- フロントエンド: Next.js + TypeScript
- UI: CSS（`src/app/globals.css`）
- 地図: MapLibre GL JS
- 環境データ: Open-Meteo Weather / Marine API
- 安全情報: 気象庁防災情報XML
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

DB migrationを変更する場合は、migration safety / bootstrap schema diff等の専用チェックも実行します。

## データ方針

MVP v0.1で使用した同梱モック釣果は、Post-MVP-085でアプリ実行コードから削除しました。地図には釣り場地点と地点へ紐づくユーザー自身の釣果記録を表示し、釣果一覧は本人の手入力記録を中心に扱います。実データがない場合に架空の釣果やSCOREで補完しません。

外部サイト本文、画像、コメント全文、プロフィール詳細を保存しません。スクレイピング、自動取得、定期アクセスも行いません。将来の取り込みは公式API、RSS、許可済み情報源、ユーザー提供情報を優先します。

地点詳細では、確認状態を区別します。

- `unresearched`: 未調査。
- `researched_unknown`: 調査したが確定できない。
- `weak_evidence / low`: 低信憑性の参考情報。
- `has_evidence / medium|high`: 採用可能な根拠あり。

本人実地調査は `user_contribution` として調査値とは分離し、本人だけが編集・削除できるowner-scopedデータとして扱います。本人投稿が未承認のまま一般調査値や規制・安全情報を上書きすることはありません。

## 地点masterの現在状態

- raw master: 52地点。
- 通常の新規選択・地図・地点評価で表示する行き先: 47地点。
- 広域5地点は新規行き先から除外していますが、既存参照互換のためspotIdを保持しています。
- 52地点すべての地形・足場等の再調査と代表座標監査を完了しています。

再調査データは `data/curation/fishing-spots/` で管理し、runtimeでは `src/lib/fishingSpotDetailFallback.ts` を通して利用します。

## 魚種master・生態調査

active魚種masterは80件です。

- exact_species: 61
- species_group: 13
- squid_species: 5
- cephalopod_species: 1

魚種生態調査v2ではspecies_groupを除く67 taxonをSchema v1.4.0で再調査しています。

2026-07-28の文書更新開始時点では、Batch 05までが `main` へ入り **49 / 67 taxon** がv1.4.0です。Batch 06 / 07はOpen PRで進行中のため、mergeされるまでは完了扱いしません。

魚種生態では、一般生態 `stableGeneral` と対象地域の陸っぱり釣れやすさ `regionalCatchability` を分離します。一般生態、他地域、船釣り、商業漁業等から地域の釣れやすさを推測しません。

## Supabase / Auth

Supabase連携はmaster read、Auth、ログインユーザー単位のowner-scoped read/write、論理削除RPC、localStorage明示移行、migration安全チェックと本番反映workflowまで整備しています。新しいDB変更の正本は `supabase/migrations/` です。

現在の認証はメールアドレス + パスワードです。詳細な外部設定手順は `docs/AUTH_SETUP.md` を参照してください。

本番Custom SMTPの実設定はIssue #322として未対応です。SMTP password、Supabase secret key、DB password等をrepo・Issue・PR・ブラウザコードへ記載しません。

## 水深・3D地形モード

### 採用source

- 第一source: `GEBCO_2026 Grid 15 arc-second`
- データ由来: `GEBCO_2026 TID Grid`
- fallback: `NOAA NCEI ETOPO 2022 60 Arc-Second Bedrock`

水深は参考表示であり、港内、岩礁、根、瀬、航路の正確な位置・水深を保証しません。航海・安全判断には使用できません。

### データ生成

Git管理する正本:

- `data/bathymetry/gebco-2026-crop.json`
- `data/bathymetry/gebco-2026-tid-crop.json`
- `data/bathymetry/etopo-2022-crop.json`

生成物はGit管理せず、dev/test/build前に生成します。

```bash
npm run generate:bathymetry
```

通常のNext.js/Vercel buildやruntimeからGEBCO/NOAAを外部取得しません。詳細は `docs/BATHYMETRY_AND_3D_TERRAIN_DESIGN.md`、`docs/COASTAL_BATHYMETRY_DATA_RESEARCH.md`、`tools/bathymetry/README.md` を参照してください。

## 海しるAPI

公式問い合わせへの回答を受領し、サブスクリプションキーは発行済みです。キーはsecretとして扱い、repo・Issue・PR・文書へ記載しません。

次工程は、安全な環境からのAPI疎通確認と、実際に取得可能なデータ・エンドポイント・利用条件・出典条件の確認です。確認前に海しるデータを本番3D表示やSCOREへ接続しません。

## 今後の優先候補

1. 魚種生態調査v2 Batch 06 / 07を完了し、67 taxonを同一基準へ揃える。
2. 海しるAPIの疎通・取得可能データ・利用条件を確認する。
3. 本番Supabase Custom SMTPを設定する（Issue #322）。
4. 魚種生態v2のうちSCOREへ安全に採用可能な属性を、projection仕様に従って別Issueで検討する。
5. Issue #195の残作業・close可否、Issue #197の将来SCORE拡張を整理する。

## 関連ドキュメント

- `AGENTS.md`
- `docs/REQUIREMENTS.md`
- `docs/MVP_SCOPE.md`
- `docs/ARCHITECTURE.md`
- `docs/DATA_POLICY.md`
- `docs/ROADMAP.md`
- `docs/AUTH_SETUP.md`
- `docs/BATHYMETRY_AND_3D_TERRAIN_DESIGN.md`
- `docs/COASTAL_BATHYMETRY_DATA_RESEARCH.md`
- `docs/FISHING_SPOT_RESEARCH_SPEC.md`
- `docs/FISH_SPECIES_ECOLOGY_SCORE_V2_CONNECTION_SPEC.md`
- `docs/research/FISH_SPECIES_ECOLOGY_RESEARCH_V2_SPEC.md`
- `docs/research/FISH_SPECIES_ECOLOGY_INVENTORY.md`
- `docs/開発引き継ぎ書.md`
- `tools/bathymetry/README.md`
