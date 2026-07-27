# 魚種生態調査F レビュー

確認日: 2026-07-27

Issue #327 の正本レビュー。Issue #323で追加・整理した16件について、v1.3.0 の自己完結型調査記録として一般生態・習性を整理する。

## 対象と原則

19属性（identity 3、`stableGeneral` 8、`regionalCatchability` 8）は各JSONの `attributeDecisions` で `adopt` / `adopt_with_warning` / `hold` / `reject` に完全分類する。一般生態と対象地域の陸っぱり釣れやすさは分離し、本調査結果をSCORE v2、UI、DB、地点 `target_species` へ自動接続しない。

`karei` / `megochi` / `haze` / `eso` / `yagara` はアプリ上の `species_group` であり、単一taxonではない。したがって単一のcanonical和名・学名や個別種の生態値を代表値として採用せず、グループの生態属性はすべて `unknown / hold` とする。

## 対象と採否

| species | 採用した一般生態 | hold・分類上の制約 |
|---|---|---|
| `karei` / カレイ | なし | species_group。個別のカレイ類の生態を代表値として継承しない |
| `megochi` / メゴチ | なし | species_group。単一taxonへ固定せず、個別種の底質・水深等を継承しない |
| `aigo` / アイゴ | identity、1〜50m、藻場・海草床・浅い礁域、海水・汽水・河口利用、主に昼行性、毒棘・誤同定注意 | 一般生態を対象地域の釣期・水温閾値へ転用しない |
| `haze` / ハゼ | なし | species_group。淡水・汽水・海水など多様なハゼ類を一括代表しない |
| `hirasuzuki` / ヒラスズキ | identity、成魚の浅い岩礁域利用、海水域 | 数値水深、季節、水温、昼夜、釣法は直接根拠不足のためhold |
| `katsuo` / カツオ | identity、外洋性・群泳、0〜260m、仔魚が確認される表面水温15〜30℃という生活史条件、海水域、熱帯域の周年産卵 | 水温・水深・産卵情報を成魚の一般適水温や日本沿岸の陸っぱり釣れやすさへ変換しない |
| `eso` / エソ | なし | species_group。複数のエソ類を単一学名・単一生態へ固定しない |
| `kyusen` / キュウセン | identity、沿岸の礫底・岩礁・サンゴ礁、海水域 | BISMaLは `Parajulis poecileptera` をaccepted、FishBaseは `P. poecilepterus` を使用。表記差を警告付きで保持 |
| `kichinu` / キチヌ | identity、暖かい浅海・沿岸・河口利用、海水・汽水・淡水 | `Acanthopagrus latus` complexの過去記録には近縁種の誤同定が含まれるため広域分布を安易に継承しない |
| `jindouika` / ジンドウイカ | identity、1〜30m、浅海に多い浮遊性、夏〜秋の1〜10mでの産卵 | BISMaLは `Loliolus (Nipponololigo) japonica`、SeaLifeBaseは `Loliolus japonica`。同一taxonの表記差として保持 |
| `mutsu` / ムツ | identity、20〜400m、成魚は深い岩礁・幼魚は浅場、10〜3月の産卵 | 生活段階差を保持し、一般水深や産卵期を岸釣りの水深・釣期へ変換しない |
| `datsu` / ダツ | identity、海水域の浮魚性、卵の付着構造 | BISMaLの出現水深レコードを一般生息水深として採用しない |
| `houbou` / ホウボウ | identity、25〜615m、砂底・砂泥底、海水域の底生性 | 一般水深を岸から狙える水深へ変換しない |
| `yagara` / ヤガラ | なし | species_group。アカヤガラ等の個別種生態をグループへ継承しない |
| `yokofuedai` / ヨコフエダイ | identity、12〜100m、成魚の礁域・幼魚の浅場/海草床利用、海水・汽水、主に夜間採餌、同定注意 | 生活段階差と同定注意を保持し、夜間採餌を対象地域の釣れる時間帯へ直結しない |
| `fuedai` / フエダイ | identity、サンゴ礁・岩礁周辺、単独〜小群、海水域 | 水深、季節、水温、昼夜、釣法は直接根拠不足のためhold |

## Source と制約

- 分類・名称はJAMSTEC BISMaL、水産研究・教育機構などの公的・研究系sourceを優先する。
- FishBase / SeaLifeBaseは一般生態の補助sourceとして利用し、そこから対象地域の陸っぱり釣れやすさを推測しない。
- BISMaLの生物出現レコードに含まれる水深は、採集・観察レコードの範囲であって種の一般生息水深そのものではないため、一般水深として自動採用しない。
- 産卵水温・産卵期・生活段階別水深は、その条件のまま保持し、一般適水温・釣期・岸から届く水深へ読み替えない。
- private fishing siteや釣果サイトから釣れやすさを補完しない。

## regionalCatchability をholdする理由

対象地域は福岡県糸島市西岸から唐津湾、伊万里湾、平戸方面の陸っぱりを想定する。今回確認した資料は分類、一般生態、資源・生物学的知見が中心であり、対象地域・地点・遊漁・時期・水温・水深・時間帯・釣法を直接結び付けて「釣れやすさ」を示す根拠としては不足する。このため16件すべての `regionalCatchability` 8属性を `unknown / hold`、`scoreV2Status` を `unsupported` のままとする。

## 再確認条件

地域別属性は、糸島〜唐津湾〜伊万里湾〜平戸の陸っぱり出現・釣果を魚種、場所、時期、水温、水深、時間帯、釣法等と直接結び付けられる公的・研究機関資料、または利用許諾を確認した信頼できる資料が得られた場合に再評価する。species_groupはmasterが個別taxonへ分割された場合に再評価する。キュウセンとジンドウイカの学名は分類DBの更新時に表記を再確認する。
