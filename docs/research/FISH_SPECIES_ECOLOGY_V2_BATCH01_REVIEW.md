# 魚種生態調査 v2 Batch 01 レビュー

Issue #340。`data/research/fish-species-v2/batch-manifest.json` の `ecology-v2-01` 10 taxonを、`docs/research/FISH_SPECIES_ECOLOGY_RESEARCH_V2_SPEC.md` に従って再調査したレビュー記録。

確認日: 2026-07-27

## 対象

- シイラ (`shiira`)
- ヒラメ (`hirame`)
- マゴチ (`magochi`)
- スズキ (`seabass`)
- アオリイカ (`aoriika`)
- コウイカ (`kouika`)
- チヌ / クロダイ (`chinu`)
- 真鯛 / マダイ (`madai`)
- キス / シロギス (`kisu`)
- ブリ (`buri`)

## 共通方針

- 旧v1.2/v1.3の値は監査記録として参照するが、v1.4への機械変換はしない。
- `stableGeneral` は一般生態として直接支えられる範囲だけ採用する。
- `regionalCatchability` は糸島市西岸〜唐津湾〜伊万里湾〜平戸の陸っぱりに直接結び付く根拠のみ採用する。
- 産卵期、水揚げ・商業漁期、船釣り、他地域の漁獲を対象地域の釣れやすさへ転用しない。
- BISMaLの出現レコード水深は、生息水深レンジとして自動採用しない。
- `unknown` は0点・不適・非生息を意味しない。調査終了理由を `unknownReason` と `researchNote` に残す。
- 本BatchはSCORE v2、魚種master、地点魚種、Supabase既存データを変更しない。

## 結果概要

| taxon | stableGeneral | 主な採用内容 | 主な注意点 |
|---|---|---|---|
| シイラ | C4 / I1 / U3 | 21–30℃、0–85m、外洋・沿岸表層性、限定的な昼夜鉛直行動 | 標識研究は大型4個体・北部東シナ海に限定。一般季節性・産卵期・遊漁釣法は保留 |
| ヒラメ | C5 / I1 / U2 | 200m以浅、岩礁周辺の砂泥底、浅深の季節移動、2–5月産卵 | 昼夜性は飼育幼魚研究なので限定的。一般水温・釣法は保留 |
| マゴチ | C5 / U3 | 30m以浅、内湾・河口砂泥底、5–7月接岸産卵 | 現行の `Platycephalus sp. 2` は暫定的分類表記。正式二名法名へ推測しない |
| スズキ | C5 / U3 | 沿岸岩礁・河川利用、海水/汽水/淡水、冬産卵、餌釣りの直接記録 | 幼魚季節分布と成魚一般季節性を混同しない。夜釣り人気を昼夜活動性へ変換しない |
| アオリイカ | C3 / I4 / U1 | 春〜夏の産卵接岸、福岡市資料の成体10–30m | 「アオリイカ」は3種を含む分類問題が現在もあるため科学名はblocked。S. lessoniana由来の生態はlow/inferredに限定 |
| コウイカ | C7 / U1 | A. esculentum、100m以浅砂泥底、春の博多湾産卵来遊 | 旧学名Sepia esculenta系資料はWoRMSで同物異名関係を確認してから利用 |
| チヌ | C5 / U3 | クロダイ A. schlegelii、伊勢湾の季節移動、汽水・沿岸利用、春〜初夏産卵 | 約14℃知見は小型魚文脈のため一般適水温にしない。数値水深範囲も作らない |
| マダイ | C6 / U2 | 良好生息域の冬季最低水温9–15℃、30–150m、岩盤/砂礫/泥境界、3–6月産卵 | 水温・水深は「良好な生息域の条件」であり通年最適値・全出現範囲ではない |
| シロギス | C5 / U3 | 0–30m、湾内浅い砂底、館山湾の季節的摂餌活動、6–10月成熟 | 水温モデル値を一般適水温にしない。採集方法を一般遊漁釣法へ転用しない |
| ブリ | C5 / U3 | 季節回遊、100m以浅、海洋回遊性、幼魚の流れ藻利用 | 産卵・仔稚魚水温を成魚一般適水温へ転用しない。商業漁法を遊漁釣法へ変換しない |

`C=confirmed / I=inferred / U=unknown`。ここでの集計は `stableGeneral` 8属性のみ。

## 重要な判断

### アオリイカのscientificName

2026年の日本水産学会誌でも「アオリイカ3種」が別個に扱われており、従来のアオリイカという運用名を単一の `Sepioteuthis lessoniana` に固定するのは危険と判断した。

そのためmaster entry `aoriika` のcanonical表示名は維持する一方、v1.4のscientificNameは `taxonomy_uncertain / blocked` とする。`Sepioteuthis lessoniana` に対する専門DB生態は、アオリイカ複合群全体へは確定値として継承せず、必要箇所のみ `inferred / low` とする。

### マゴチの分類

千葉県の2026年更新資料がマゴチを `Platycephalus sp. 2` として扱っていることを確認した。過去文献にはsp.番号の扱いが異なる記録があるため、正式な二名法学名を推測せず、現行公的資料の暫定表記をそのまま記録する。

### マダイの水温・水深

三重県資源評価の9–15℃・30–150mは、一般的な「最適水温」「全生息水深」ではなく、良好な生息域の条件として記載された値である。値の文脈を `regionScope` / `note` に固定し、SCORE閾値や岸から届く水深へ変換しない。

### regionalCatchability

10 taxon × 8属性について、対象地域の陸っぱりでの釣れやすさを直接支える、公的・研究系の用途適合根拠を本Batchでは確定できなかった。

したがって80属性すべて `unknown` を維持する。これは調査不足を隠すためではなく、一般生態・他地域・商業漁業・船釣り等から予測値を作らないというv2方針による。

## 主なsource

各claimの正本sourceは各JSONの `sources` / `evidenceSources` とする。主に次を利用した。

- JAMSTEC BISMaL
- 水産研究・教育機構（FRA）
- 千葉県水産総合研究センター / 三番瀬自然環境DB
- 三重県水産研究所・三重県資源評価
- 福岡市生物多様性情報サイト
- J-STAGE掲載査読論文
- FishBase / SeaLifeBase
- WoRMS / MolluscaBase
- 新潟大学臨海実験所

## 本番接続

- SCORE v2: 変更しない
- fish species master: 変更しない
- fishing spots / target species: 変更しない
- Supabase既存データ: 変更しない
- v1.4の `productionAdoption.acceptedPaths` は研究記録上の採用属性であり、本BatchだけでSCOREへ接続しない
