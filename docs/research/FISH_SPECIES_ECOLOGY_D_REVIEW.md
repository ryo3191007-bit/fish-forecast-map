# 魚種生態調査D レビュー

確認日: 2026-07-26

Issue #311 では、沿岸・磯・湾内系9エントリを v1.3.0 の自己完結型調査JSONとして整理した。対象は exact species の `mejina`、`isaki`、`ishidai`、`ishigakidai`、`tachiuo`、`konoshiro`、`sayori`、`bora` と、species_group の `kamasu` である。

## 採用した一般生態

- exact species 8件は、GBIFまたはWoRMSで和名・学名の対応を確認し、identity表示の候補とした。分類DBの用途をidentityに限定し、生態や地域別釣れやすさの根拠にはしていない。
- FishBaseで直接確認できた海水・汽水・淡水の区分だけを `stableGeneral.salinityAndWaterBody` の一般生態説明候補とした。メジナ、イサキ、イシダイ、イシガキダイは海水域、タチウオ、コノシロ、サヨリは海水・汽水域、ボラは海水・汽水・淡水域として記録した。
- FishBaseは編集責任が明確な二次sourceとして一般生態説明に限定する。一般水深、生息環境、産卵情報を岸釣りの条件へ変換しない。

## holdした属性

全エントリで19属性（identity 3属性、`stableGeneral` 8属性、`regionalCatchability` 8属性）を `attributeDecisions` により重複なく分類した。exact speciesではidentity 2属性と一般水域区分のみadoptし、aliasesおよび根拠を直接確認できない一般生態7属性をholdした。対象地域の陸っぱり釣れやすさを直接示す十分な資料は確認できなかったため、`regionalCatchability` 8属性はすべて `unknown / hold` とした。

`unknown` は0点、不適、他魚種の値、漁期、水揚げ時期、産卵期で補完しない。確認済みsourceに対象属性の直接記載がない場合も推測せず、checked sourceとして記録してholdする。

## sourceと用途制約

- GBIF / WoRMS: taxonのidentity確認だけに使用する。DB上の分布レコードを対象地域の出現頻度や釣れやすさへ転用しない。
- FishBase: 種単位の一般的な水域区分の説明だけに使用する。一般生態を対象地域の岸から狙える水深、適水温、釣期、地点相性、SCORE閾値へ変換しない。
- sourceの`supports`と各claimのevidence、attribute decisionの`sourceIds`を双方向に対応させた。confirmed / inferredの値はsupporting sourceを必須とした。

## 分類上の注意点

`kamasu` はアプリ上のspecies_groupであり、単一taxonではない。現行マスターで `akakamasu` と `yamatokamasu` はinactiveであるため、両種をactive化せず、memberにも含めず、canonical和名・学名・生態値・sourceをグループへ継承しない。このため `kamasu` の19属性はすべてrejectまたはholdであり、accepted pathはない。

タチウオはWoRMSでaccepted nameの `Trichiurus japonicus` を確認した。一方、分類DB間で取扱いが異なる可能性があるため、identity用途を越えた自動同一視や近縁taxonからの値継承は行わない。

## regionalCatchability / SCOREへ転用しない理由

一般生態sourceが説明する生息水域は、糸島西岸〜唐津湾〜伊万里湾〜平戸の特定護岸・堤防・磯からの到達可能性、季節別釣果、釣法別成功率を直接測定したものではない。産卵期・産卵水温・漁獲期・水揚げ時期も遊漁上の釣期や適水温とは異なる。そのため、採用値はidentity表示または一般生態説明への投影候補に限定し、SCORE v2、地点相性、`regionalCatchability`、UI、DBには接続しない。

## 本番影響と再確認条件

本Issueは調査JSONとレビュー正本の追加のみで、SCORE v2、UI、Supabase、migration、seed、地点 `target_species`、inactive魚種を変更しない。地域別の採用は、対象海域・陸っぱり・対象魚種・属性が直接対応する公的調査または品質管理された実地記録を取得した時点で再レビューする。
