# 魚種生態調査 v2 Batch 03 レビュー

Issue #344。`data/research/fish-species-v2/batch-manifest.json` の `ecology-v2-03` 10 taxonを、`docs/research/FISH_SPECIES_ECOLOGY_RESEARCH_V2_SPEC.md` に従って再調査したレビュー記録。

確認日: 2026-07-28

## 対象

- クエ (`kue`)
- ヤリイカ (`kensakiika`)
- スルメイカ (`surumeika`)
- マダコ (`madako`)
- イサキ (`isaki`)
- メジナ (`mejina`)
- タチウオ (`tachiuo`)
- カワハギ (`kawahagi`)
- ウマヅラハギ (`umazurahagi`)
- コノシロ (`konoshiro`)

## 共通方針

- 旧v1.2/v1.3の値は監査記録として参照するが、v1.4への機械変換はしない。
- `stableGeneral` は当該taxonの一般生態を直接支える根拠だけを採用する。
- `regionalCatchability` は糸島市西岸〜唐津湾〜伊万里湾〜平戸の陸っぱりに直接結び付く根拠のみ採用する。
- 産卵・仔稚魚・養殖・商業漁業・他地域・船釣りの情報を一般生態や対象地域の釣れやすさへ転用しない。
- species_groupや近縁種から値を継承しない。
- 本BatchはSCORE v2、魚種master、地点魚種、Supabase既存データ、RLS/Auth、CI workflowを変更しない。

## 結果概要

| taxon | stableGeneral | regionalCatchability | 主な判断 |
|---|---:|---:|---|
| クエ (`kue`) | C3 / U5 | U8 | 20–200m、reef-associated、海水を一般生態として採用。BISMaL出現深度は一般水深へ転用しない。 |
| ヤリイカ (`kensakiika`) | C1 / U7 | U8 | master IDはkensakiikaだが表示名ヤリイカを正本とし、Heterololigo bleekeri。産卵1–6月等は産卵文脈のみに限定。 |
| スルメイカ (`surumeika`) | C3 / U5 | U8 | 北西太平洋2000年6–7月調査の北上・日周鉛直移動を地域・時期限定で採用。 |
| マダコ (`madako`) | C3 / U5 | U8 | Octopus sinensis。潮間帯〜約40m、岩穴・隙間、昼間潜伏・夜間活動を採用。 |
| イサキ (`isaki`) | C5 / U3 | U8 | 岩礁沿岸・高塩分海水、限定地域の季節移動、阿久根の昼夜行動、五島灘の産卵知見を範囲限定で採用。 |
| メジナ (`mejina`) | C2 / U6 | U8 | Girella punctata。沿岸岩礁・marineを採用し、他属性は直接根拠不足として維持。 |
| タチウオ (`tachiuo`) | C3 / U5 | U8 | 現行BISMaLに合わせTrichiurus lepturusを採用しT. japonicusはsynonym注記。0–589m（通常100–350m）と若狭湾の昼夜行動を採用。 |
| カワハギ (`kawahagi`) | C1 / U7 | U8 | Stephanolepis cirrhifer。marine/demersalのみ確定し、漂流藻との稚魚関係を底質へ変換しない。 |
| ウマヅラハギ (`umazurahagi`) | C3 / U5 | U8 | 50–110m、reef-associated、marineを採用。モデル/推定温度は一般適水温へ採用しない。 |
| コノシロ (`konoshiro`) | C3 / U5 | U8 | 沿岸・湾のpelagic-neritic、marine/brackish、浜名湖・有明海の産卵知見を地域文脈限定で採用。 |

`C=confirmed / U=unknown`。`stableGeneral` は8属性内訳。regionalCatchabilityは10 taxon × 8属性すべてunknown。

## 重要な判断

### ヤリイカのmaster ID

`kensakiika` はID文字列からケンサキイカへ読み替えず、active masterの表示名「ヤリイカ」を正本として `Heterololigo bleekeri` を対象とする。ケンサキイカの生態は継承しない。

### タチウオの分類

現行BISMaLで `Trichiurus lepturus` がaccepted、`Trichiurus japonicus` がsynonymとして整理されているため、v1.4では `Trichiurus lepturus` をscientificNameへ採用する。旧記録との差異は注記に残す。

### 温度・水深の用途制限

ヤリイカの12〜14℃・70〜150mは産卵文脈、ウマヅラハギの温度情報はモデル/推定値を含むため、一般適水温やregionalCatchabilityへ転用しない。BISMaLの出現レコード水深も一般生息水深として採用しない。

### regionalCatchability

対象地域の陸っぱりで各属性と釣れやすさを直接結び付ける、公的・研究系の用途適合根拠を確定できなかったため、80属性すべてunknownを維持する。一般生態、他地域、商業漁業、船釣り、民間釣果情報から予測値を作らない。

## 棚卸し

- Batch 03反映後のv1.4移行は30/67 taxon。
- v1.4文書内の `not_researched` は0件。
- 残りv2未移行taxonは37件。

## 本番接続

- SCORE v2: 変更しない
- fish species master: 変更しない
- fishing spots / target species: 変更しない
- Supabase既存データ: 変更しない
- v1.4の `productionAdoption.acceptedPaths` は研究記録上の採用属性であり、本BatchだけでSCOREへ接続しない
