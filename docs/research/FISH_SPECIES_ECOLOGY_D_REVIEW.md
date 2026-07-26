# 魚種生態調査D レビュー

確認日: 2026-07-26

Issue #311 では、沿岸・磯・湾内系9エントリを v1.3.0 の自己完結型調査JSONとして整理した。対象は exact species の `mejina`、`isaki`、`ishidai`、`ishigakidai`、`tachiuo`、`konoshiro`、`sayori`、`bora` と、species_group の `kamasu` である。

## 採用した一般生態

- exact species 8件は、対象地域の自治体・水産試験研究機関、FRA、大学・博物館/水族館、公的DBの順で再探索した。検索結果だけで属性を埋めず、種と属性を本文で直接確認できた公的・研究機関sourceだけを追加採用した。
- イサキは佐賀県公式資料から、成魚（水深20m前後の岩礁域）と稚魚（内湾の水深5〜10m程度の藻場付近）を分けた水深、成長段階別の藻場・岩礁利用、昼間は海藻の間・海底付近、夜間は海面近くへ浮上する行動を採用した。生活段階と一般生態のscopeを保持する。
- FishBaseで直接確認できた海水・汽水・淡水の区分だけを `stableGeneral.salinityAndWaterBody` の一般生態説明候補とした。メジナ、イサキ、イシダイ、イシガキダイは海水域、タチウオ、コノシロ、サヨリは海水・汽水域、ボラは海水・汽水・淡水域として記録した。
- FishBaseは編集責任が明確な二次sourceとして一般生態説明に限定する。一般水深、生息環境、産卵情報を岸釣りの条件へ変換しない。

### 再探索結果

| entry | 公的・研究機関sourceの再確認 | `stableGeneral` の判断 |
| --- | --- | --- |
| `mejina` | 自治体・FRA・研究教育機関・公的DBを優先して再探索 | 種と属性を直接結ぶ追加根拠を確定できず、既存の水域区分以外はhold |
| `isaki` | 佐賀県公式「イサキ」を本文確認 | `depthRange`、`substrateHabitat`、`dayNightTiming` を生活段階・一般生態に限定してadopt |
| `ishidai` | 自治体・FRA・研究教育機関・公的DBを優先して再探索 | 既存の水域区分以外はhold |
| `ishigakidai` | 自治体・FRA・研究教育機関・公的DBを優先して再探索 | 既存の水域区分以外はhold |
| `tachiuo` | WoRMSとJAMSTEC BISMaLを本文照合 | taxonomy差を `spawningOrConfusableInfo` に警告付きでadopt。他の生態値には継承しない |
| `konoshiro` | 自治体・FRA・研究教育機関・公的DBを優先して再探索 | 既存の水域区分以外はhold |
| `sayori` | 自治体・FRA・研究教育機関・公的DBを優先して再探索 | 既存の水域区分以外はhold |
| `bora` | 自治体・FRA・研究教育機関・公的DBを優先して再探索 | 既存の水域区分以外はhold |

## holdした属性

全エントリで19属性（identity 3属性、`stableGeneral` 8属性、`regionalCatchability` 8属性）を `attributeDecisions` により重複なく分類した。イサキは3一般生態属性を追加採用し、タチウオはtaxonomy差を警告付き一般注意情報として追加採用した。それ以外は、aliasesおよび根拠を直接確認できない一般生態をholdした。対象地域の陸っぱり釣れやすさを直接示す十分な資料は確認できなかったため、`regionalCatchability` 8属性は9エントリすべて `unknown / hold` のままとした。

`unknown` は0点、不適、他魚種の値、漁期、水揚げ時期、産卵期で補完しない。確認済みsourceに対象属性の直接記載がない場合も推測せず、checked sourceとして記録してholdする。

## sourceと用途制約

- GBIF / WoRMS: taxonのidentity確認だけに使用する。DB上の分布レコードを対象地域の出現頻度や釣れやすさへ転用しない。
- FishBase: 種単位の一般的な水域区分の説明だけに使用する。一般生態を対象地域の岸から狙える水深、適水温、釣期、地点相性、SCORE閾値へ変換しない。
- sourceの`supports`と各claimのevidence、attribute decisionの`sourceIds`を双方向に対応させた。confirmed / inferredの値はsupporting sourceを必須とした。

## 分類上の注意点

`kamasu` はアプリ上のspecies_groupであり、単一taxonではない。現行マスターで `akakamasu` と `yamatokamasu` はinactiveであるため、両種をactive化せず、memberにも含めず、canonical和名・学名・生態値・sourceをグループへ継承しない。このため `kamasu` の19属性はすべてrejectまたはholdであり、accepted pathはない。

タチウオはWoRMS（AphiaID 305414）で `Trichiurus japonicus` をacceptedとして確認した。一方、JAMSTEC BISMaLは `Trichiurus japonicus` をsynonym、`Trichiurus lepturus` をaccepted asとして掲載する。この差により `/identity/scientificName` は `inferred / low / adopt_with_warning` とし、分類差自体を `stableGeneral.spawningOrConfusableInfo` に記録した。どちらか一方のDBを根拠に他の生態値を継承しない。

佐賀県公式イサキページの「4〜9月」「釣り、ごち網」は商業漁業を含む漁期・漁法情報である。これらは `stableGeneral.fishingMethods` にも、`regionalCatchability.seasonality` / `fishingMethods` にも採用せず、陸っぱりで釣れやすい時期・方法へ変換しない。

## regionalCatchability / SCOREへ転用しない理由

一般生態sourceが説明する生息水域は、糸島西岸〜唐津湾〜伊万里湾〜平戸の特定護岸・堤防・磯からの到達可能性、季節別釣果、釣法別成功率を直接測定したものではない。産卵期・産卵水温・漁獲期・水揚げ時期も遊漁上の釣期や適水温とは異なる。そのため、採用値はidentity表示または一般生態説明への投影候補に限定し、SCORE v2、地点相性、`regionalCatchability`、UI、DBには接続しない。

## 本番影響と再確認条件

本Issueは調査JSONとレビュー正本の追加のみで、SCORE v2、UI、Supabase、migration、seed、地点 `target_species`、inactive魚種を変更しない。地域別の採用は、対象海域・陸っぱり・対象魚種・属性が直接対応する公的調査または品質管理された実地記録を取得した時点で再レビューする。
