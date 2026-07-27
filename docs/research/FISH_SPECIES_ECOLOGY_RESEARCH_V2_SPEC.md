# 魚種生態調査 v2 仕様

Issue #335 の正本仕様。active master 80件のうち `species_group` 13件を除く 67 taxon を、同一基準で再調査するための調査・採否・unknown判定・batch運用を定義する。

## 1. 目的

- `unknown` の削減自体をKPIにせず、根拠の取れる一般生態を取り切る。
- `stableGeneral` と `regionalCatchability` を分離し、一般論を対象地域の釣れやすさへ転用しない。
- 「未調査」と「十分調べたが確定できない」を機械的に区別する。
- 67 taxonを一括変更せず、同一ルールの複数batchで段階的にv2へ移行する。

## 2. 対象

対象はactive masterのうち `species_group` を除く67 taxon。

- `exact_species`: 61
- `squid_species`: 5
- `cephalopod_species`: 1

`species_group` 13件は生態再調査対象外。親groupへ子speciesの生態を継承しない。groupのunknownを子speciesの代表値で補完しない。

今回追加した11 exact species（アカカマス、ヤマトカマス、マコガレイ、ネズミゴチ、マハゼ、ウロハゼ、マエソ、ワニエソ、トカゲエソ、アカヤガラ、アオヤガラ）も67 taxonの一部として同じ基準で扱う。

## 3. Schema移行方針

既存v1.2.0 / v1.3.0 JSONは調査時点の監査記録として保持し、一括変換しない。

再調査したtaxonから新Schema v1.4.0へ移行する。v1.4.0では各identity/ecology claimに、値と根拠に加えて調査完了状態を記録する。

### 3.1 researchState

- `not_researched`: 規定の探索をまだ完了していない
- `complete`: 採用可能な根拠を得た、または規定範囲まで探索を完了した
- `blocked`: 信頼できる根拠の矛盾、分類上の不確実性等により現時点で確定不能
- `not_applicable`: そのclaim自体が対象外

### 3.2 unknownReason

unknownの場合は理由を必須とする。

- `not_researched`: 未調査または探索途中
- `source_not_found`: 規定の探索範囲を確認したが直接根拠を確認できない
- `insufficient_evidence`: 関連資料はあるが、値を採用できる強さ・直接性に達しない
- `conflicting_evidence`: 信頼できる独立source同士が矛盾し、解消できない
- `scope_mismatch`: 産卵・養殖・商業漁業・別地域・沖釣り等、必要な用途/地域/生活史段階と一致しない
- `taxonomy_uncertain`: 同定・学名・分類整理が未確定でspecies単位の採用が危険

`not_applicable` はclaim status自体で表現し、unknownReasonにはしない。

ready_for_review / approved のv1.4.0文書には `not_researched` を残さない。

## 4. source探索tier

探索順は以下を基本とする。属性によって採用可能sourceは異なるが、最初の1資料に記載がないだけでunknownにしない。

1. `official_primary`
   - 国、自治体、水産試験研究機関、公的研究機関の直接資料
2. `peer_reviewed`
   - 査読論文、研究報告、大学等の一次研究
3. `authoritative_database`
   - BISMaL等の専門DB、FishBase / SeaLifeBase等の専門データベース
4. `institutional_reference`
   - 大学、博物館、水族館、専門団体等の解説・データ
5. `trusted_secondary`
   - 出典を追跡でき、内容を検証可能な信頼できる二次資料

同一原典の転載・派生ページは独立根拠として重複カウントしない。

外部釣果サイト、SNS、動画、ブログ等の自動取得・スクレイピングは行わない。これらを `regionalCatchability` の採用根拠にしない。

## 5. 属性別の採用・調査終了条件

### seasonality

採用対象は季節的な分布、活動、移動等。産卵期、水揚げ時期、商業漁期を遊漁の釣期へ変換しない。

一般季節性を直接述べる資料をtier 1〜4中心に探索し、必要に応じtier 5まで確認する。直接根拠がなければunknown。

### waterTemperature

一般生息・活動に関する水温だけを一般値として採用する。産卵水温、仔稚魚のみの水温、養殖適温を成魚の一般適水温へ変換しない。生活史段階や文脈が限定される場合はnoteに保持し、別文脈へ拡張しない。

### depthRange

speciesの生息・分布水深として明示された範囲のみ採用する。単一観察深度、標本採集深度、漁獲深度から閉区間を作らない。一般生息水深を岸から届く水深へ変換しない。

### substrateHabitat

砂、砂泥、岩礁、藻場、サンゴ礁等、speciesレベルで明示された生息環境を採用する。近縁種、親group、釣法から推測しない。

### salinityAndWaterBody

marine / brackish / freshwater / estuary等を、speciesの利用環境として直接確認できる場合だけ採用する。

### dayNightTiming

活動、摂餌、移動等の昼夜傾向を直接述べる生態資料のみ採用する。「朝まずめがおすすめ」等の釣り情報から生態を推測しない。

### fishingMethods

生態そのものではなく釣法情報として扱う。食性、生息環境、体型から釣法を推測しない。直接的かつ用途適合する釣法根拠がない場合はunknown。

### spawningOrConfusableInfo

現行Schema互換のためfieldは維持する。産卵情報と類似種/誤同定情報を混同せず、どちらを記録しているかnoteで明確にする。産卵期を一般seasonalityやregionalCatchabilityへ自動転用しない。

## 6. regionalCatchability

対象範囲は福岡県糸島市西岸〜唐津湾〜伊万里湾〜平戸方面の陸っぱり。

採用には、対象地域かつ陸っぱりの出現・釣れやすさと当該属性を直接結び付ける根拠を必要とする。一般生態、他地域、船釣り、商業漁業、水揚げ、養殖情報から補完しない。

対象地域の公的/研究資料や、将来利用可能なユーザー自身の承認済み実績等で直接根拠を確認できない場合はunknownを維持する。

対象外地域・船釣り等の資料しか見つからない場合は `scope_mismatch` とする。規定範囲まで探して直接資料自体がない場合は `source_not_found` とする。

## 7. status / confidence整合

- `confirmed`: supporting source必須。researchState=`complete`。unknownReason=null。
- `inferred`: supporting source必須。researchState=`complete`。confidence=`high`は禁止。
- `unknown`: value=null、confidence=`unknown`、unknownReason必須。
- `not_applicable`: researchState=`not_applicable`、unknownReason=null。

confidence目安:

- `high`: 複数の独立した高品質な直接根拠、または用途を直接確定できる強い一次根拠
- `medium`: 1つの高品質な直接根拠等、採用には十分だが独立確認が限定的
- `low`: 間接的・二次的で用途制限が必要
- `unknown`: 値を採用していない

## 8. 調査終了条件

confirmed/inferredとして十分な直接根拠を得た属性は、その値の確認に必要な範囲で探索終了してよい。

unknownで終了する場合は、少なくとも属性に適合する上位tierを複数確認し、「どこまで探したか」を `searchedSourceTiers` に記録する。最初のsourceに記載がない、検索結果が少ない、といった理由だけでは `source_not_found` にしない。

`conflicting_evidence` と `taxonomy_uncertain` は、矛盾または分類問題を説明できるsourceを記録したうえで `blocked` とする。

## 9. batch運用

67 taxonは一括PRにしない。

- 1 batch: 8〜10 taxonを基本、最大12 taxon
- 1 Issue = 1 PR
- taxonの類似性とsource探索効率を考慮して分ける
- batch manifestはactive masterから `species_group` を除いた集合と完全一致させる
- 重複・欠落をCIで検出する
- 各batchでv1.4 JSON、review、inventoryを更新する

各batchの完了条件:

- 対象taxon全件がv1.4.0
- ready_for_review以上で `not_researched` が0件
- confirmed/inferredはsupporting sourceあり
- unknownは理由と探索tierあり
- groupからの生態継承なし
- regionalCatchabilityの一般生態からの補完なし
- lint / typecheck / test / build成功

## 10. 役割分担

### ChatGPT

- 調査方針・source採否・属性判定
- Web調査と根拠解釈
- unknown理由の最終判断
- batchごとの内容レビュー

### Codex

- v1.4 Schema / fixture / テスト
- inventory拡張
- batch manifest / テンプレート / 機械検証
- 反復的な構造整備

Codexに生態値の根拠解釈や推測補完を委ねない。

## 11. 非スコープ

- 本仕様Issueで67 taxonの実データ再調査はしない
- species_groupの生態補完
- SCORE v2の配点・対応魚種変更
- fishing_spots / target_species / historical_target_species変更
- RLS / Auth変更
- 外部釣果サイトの自動取得・スクレイピング

## 12. 次工程

1. Issue #336でv1.4 Schema・共通テスト・inventory・batch manifestを整備
2. 67 taxonを複数batchへ分割
3. ChatGPT主導で各batchを再調査
4. 各PRをレビューし、ユーザー承認後にmerge
