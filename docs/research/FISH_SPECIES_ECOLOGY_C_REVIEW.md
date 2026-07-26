# 魚種生態調査C レビュー

確認日: 2026-07-26

Issue #310 では、根魚・メバル・ハタ類13エントリを v1.3.0 の自己完結型調査JSONとして整理する。`rockfish` と `mebaru` は釣り上の表示グループであり単一taxonではないため、構成種の生態値をグループ共通値へ暗黙継承しない。

## 対象

- group: `rockfish` / 根魚、`mebaru` / メバル
- exact species: `kasago`, `oniokoze`, `kijihata`, `oomonhata`, `akahata`, `mahata`, `aohata`, `kue`, `akamebaru`, `kuromebaru`, `shiromebaru`

## 採用方針

- identity は JAMSTEC BISMaL、自治体、水族館、GBIF/Catalogue of Life 等で直接確認できたtaxonだけを採用候補とする。
- FishBase等の二次sourceによる水深・生息環境は一般生態の説明限定で `adopt_with_warning` とし、岸から狙える水深、地点適性、SCOREへ直接変換しない。
- 糸島西岸〜唐津湾〜伊万里湾〜平戸の `regionalCatchability` は、今回その地域の遊漁上の釣れやすさを直接支える十分な根拠を確認していないため全属性 `unknown / hold` とする。
- 産卵期・一般生息水深・モデル推定水温・出現レコード水深を、釣期・適水温・岸釣り水深へ読み替えない。

## 分類上の注意

### マハタ

現行accepted taxonとして `Hyporthodus septemfasciatus` を採用する。FishBaseにも属配置の注記があるため、旧表記 `Epinephelus septemfasciatus` を無条件に固定値へしない。

### メバル3種

`アカメバル / クロメバル / シロメバル` は `Sebastes inermis / S. ventricosus / S. cheni` として個別に保持する。BISMaLが参照する分類レビューを踏まえ、未特定の「メバル」からいずれかへ自動解決せず、兄弟種間で値やsourceを継承しない。

## 主な一般生態の確認

- オニオコゼ: 砂泥底、日中は砂に潜み夜間に捕食、産卵期6〜8月。産卵期は釣期として扱わない。
- キジハタ: 沿岸浅所の岩礁性。一般生息水深は岸釣り適性へ転用しない。
- オオモンハタ: 岩礁付近の細粒底・海草場等。
- アカハタ、マハタ、アオハタ、クエ: 岩礁性の一般生態と水深情報は説明限定。
- シロメバル: 岸近くの岩礁・藻場という一般生息環境を説明用途に限定。

## 本番影響

本Issueは調査記録と採否の整備のみ。SCORE v2、UI、Supabase、地点 `target_species`、ユーザー釣果・実地調査には接続しない。`unknown` は0点や不適へ変換しない。
