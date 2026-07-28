# ロードマップ

最終更新: 2026-07-28 JST

この文書は中長期の方向性と現在の優先順位を示します。GitHubのOpen Issue / PRと食い違う場合はGitHubを正本とします。

---

## Phase 0: プロジェクト初期化

完了。

- GitHubリポジトリ作成。
- GitHub / ChatGPT / Codexの作業フロー整備。
- README、AGENTS.md、docs配下の初期ドキュメント整備。
- 1 Issue = 1 PR、ユーザー承認後merge等の運用ルール確立。

## Phase 1: MVPアプリ基盤

完了。

- Next.js + TypeScript。
- MapLibre GL JS。
- 基本レイアウト・ナビゲーション。
- ドメイン型・静的fallback。
- GitHub Actions CI。

## Phase 2: 釣果情報UI・本人釣果

主要機能は完了。

- 本人釣果の登録・編集・論理削除。
- Supabase owner-scoped保存とlocalStorage fallback。
- 1件の釣果に複数魚種明細を保存。
- 魚種ごとの釣り方を保存。
- コンパクト釣果カード。
- 魚種・地点・期間・キーワード等のフィルタ。
- アプリ同梱のモック釣果・モックマーカー・モックSCOREは削除済み。

## Phase 3: 地図・地点UI

主要機能は完了。

- 通常地図は国土地理院淡色地図。
- 航空写真、水深・3D地形の切替。
- 地点marker、popup、地点評価との双方向導線。
- raw地点masterは52件。
- 広域地点監査後、通常の新規行き先として表示する地点は47件。
- 地点代表座標は実釣位置、安全な足場、入口、駐車位置を保証しない。

## Phase 4: 潮汐・天気・水温・安全情報

主要機能は完了。

- Open-Meteo Weather / Marineによる7日間予報。
- 気温、降水、風、波、水温、潮位参考、海流。
- 日出・日入、満潮・干潮参考時刻。
- 気象庁警報・注意報を優先するfail-closed安全ゲート。
- JMA `blocked / unknown` 時は総合点を表示しない。
- 取得失敗を「安全」と扱わない。

Issue #195は主要実装済みだがOpenのため、残作業・close可否を別途確認する。

## Phase 5: 水深・3D海底地形

広域baseは実装済み。高精細化は継続検討。

- GEBCO_2026 15秒を第一source。
- ETOPO 2022 60秒をfallback。
- 2D水深色分け、等深線、hillshade、MapLibre terrain。
- 高さ誇張、視点preset、参考水深。
- 低性能端末・取得失敗時fallback。
- 航海・安全判断には使用しない。

### 海しる

2026-07-16に公式問い合わせを送信し、その後公式回答を受領してサブスクリプションキーが発行済み。

次工程:

- キーをGitHub・Issue・PR・ソースへ記載しない。
- 安全なローカル環境から疎通確認する。
- 実際に取得可能なデータ、エンドポイント、対象海域、レスポンス形式を確認する。
- 利用規約・API利用規約、出典要件、加工・保存・公開条件を確認する。
- 確認結果をもとに、高精細3Dや地点情報へ採用するか別Issueで判断する。

疎通・利用条件の確認前に、高精細データ投入、派生Terrain-RGB / PNG / GeoJSON生成、Vercel配信を開始しない。

## Phase 6: 地点情報の品質向上

大幅に進展し、主要な再調査工程は完了。

### 完了済み

- 地点masterを全52件へ拡張。
- Issues #278〜#292 / PRs #279〜#293で全52地点の地形・構造・足場・設備・規制等を再調査。
- `weak_evidence / low` と `researched_unknown` を区別。
- 再調査値は古いSupabase値より優先し、承認済みユーザー投稿は再調査値より優先。
- Issue #294 / PR #295で唐津東港・前津吉漁港の座標を補正。
- Issue #296 / PR #297で残り50地点を監査し、13地点を補正、37地点を維持。
- Issue #298 / PR #299で広域地点を監査し、5件を通常の新規選択から除外。
- Issue #300 / PR #301で釣場・地形タブの表示項目を全地点共通化。
- Issue #302 / PR #303で魚種タブを追加。
- Issue #304 / PR #305で本人釣果魚種を魚種タブへ表示。
- Issue #306 / PR #307で本人実地調査の追加・編集・削除を実装。

### 維持方針

- raw地点master 52件を削除・ID再利用しない。
- 広域5件は既存参照互換のため保持する。
- 不明値を0・false・安全へ推測変換しない。
- 本人実地調査はcurated researchを直接上書きしない。
- 本人実地調査は現時点でSCOREへ接続しない。

## Phase 7: 魚種master・魚種生態

現在の主要進行フェーズ。

### master整備: 完了

- active master: 80件。
- exact_species: 61件。
- species_group: 13件。
- squid_species: 5件。
- cephalopod_species: 1件。
- generic groupを特定speciesへ自動昇格しない。
- aliasはresolverでcanonical IDへ解決する。

### 生態調査A〜F: 完了

Issues #308〜#312 / #327等でv1.3.0までの生態調査を拡張済み。

### 生態調査v2: 進行中

目的:

- species_groupを除く67 taxonを同一基準で再調査する。
- `stableGeneral` と `regionalCatchability` を厳格に分離する。
- `not_researched` と「調査済みunknown」を区別する。
- source探索tier、unknown理由を機械可読にする。
- group / species間の暗黙継承を禁止する。

進捗:

- Batch 01: 完了。
- Batch 02: 完了。
- Batch 03: 完了。
- Batch 04: 完了。stacked PRの反映漏れを補正PR #353で修復。
- Batch 05: 完了。`main`で **49 / 67 taxon**。
- Batch 06: Issue #347 / PR #357、進行中。
- Batch 07: Issue #348 / PR #358、進行中。Batch 06依存。

PR #357 / #358がmergeされるまでは67 / 67完了と扱わない。

## Phase 8: 説明可能なSCOREの高度化

基盤は実装済み。次段階は保守的に進める。

現在の原則:

- 地点固定特性、魚種生態、選択日時環境、本人釣果を分離する。
- 根拠のない値を採点しない。
- unknownを0点へ変換しない。
- 魚種生態JSONを存在だけでSCOREへ自動投影しない。
- `stableGeneral` を地域の釣れやすさへ読み替えない。
- 本人実地調査・`historical_target_species` を現時点でSCOREへ入れない。

Issue #197の水深・常夜灯追加は、採点仕様、coverage、confidence、二重加点防止をユーザー承認後に実装する。

魚種生態v2完了後、SCOREへ採用可能な属性だけを別Issueで再評価する。

## Phase 9: 認証・Supabase運用

コード側の主要機能は完了。外部設定1件が未対応。

### 完了済み

- Supabase Auth。
- owner-scoped本人釣果保存。
- 本人実地調査用owner-scoped RPC。
- forward-only migration運用。
- migration safety check / production deploy workflow。
- Issue #318 / PR #319でメールアドレス + パスワード認証へ刷新。
- Issue #320 / PR #321でrate limitエラー日本語化、SMTP運用手順、安全なAdmin API手順を追加。

### 未対応

- Issue #322: 本番Supabase Custom SMTP設定。

Custom SMTPは外部設定であり、secretをGitHubやブラウザコードへ追加しない。

## Phase 10: 将来の情報取り込み・公開拡張

現時点では保留・検討フェーズ。

- 民間釣りサイトの自動巡回・スクレイピングを行わない。
- 記事本文、画像、地図ピン、コメント、プロフィールの転載・DB再現を行わない。
- 公式API、RSS、許可済みsource、本人入力を優先する。
- 公開範囲を拡大する場合は地点座標の丸め、詳細地点非公開化、規約、安全注記を再検討する。

---

# 現在の優先順位

## 1. 魚種生態v2 Batch 06 / 07

PR #357 → PR #358の順で確認する。

完了条件は67 taxonすべてのv1.4移行だけではなく、`not_researched` 0、source/evidence整合、inventory整合、lint / typecheck / test / build成功を含む。

## 2. 海しるAPI疎通・取得可能データ確認

発行済みキーはsecretとして扱う。APIの実データ、利用条件、出典条件を確認し、高精細3D等への採用判断はその後に別Issue化する。

## 3. 本番Custom SMTP

Issue #322。新規登録確認・password recoveryを安定運用するため外部SMTPを設定し、キャリアメールを含む実機受信を確認する。

## 4. SCOREへの魚種生態接続方針

v2再調査完了後、projection仕様に従い、採用可能な属性だけを別Issueで検討する。一般生態から地域釣れやすさを推測しない。

## 5. Issue #195 / #197の整理

- #195: 主要実装済み。残作業とclose可否を確認。
- #197: 将来SCORE拡張。仕様承認前に実装しない。

---

# 運用ルール

- 1タスク = 1 Issue = 1 PR。
- `main`へ直接変更しない。
- 無関係な変更を混ぜない。
- Codex起動はユーザー承認後。
- PR mergeはユーザー最終承認後。
- Issue closeはmerge確認後、ユーザー明示指示に従う。
- remote Supabaseを無断で手動操作しない。
- 不明値を推測でconfirmedにしない。
- API key、password、secretをrepo / Issue / PR / chatへ記載しない。
