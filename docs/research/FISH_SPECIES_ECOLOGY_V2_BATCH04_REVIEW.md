# 魚種生態調査 v2 Batch 04 レビュー

Issue #345。`ecology-v2-04` の10 taxonを、`docs/research/FISH_SPECIES_ECOLOGY_RESEARCH_V2_SPEC.md` に従って再調査したレビュー記録。

確認日: 2026-07-28

## 対象

- サヨリ (`sayori`)
- ボラ (`bora`)
- マアナゴ (`maanago`)
- イシダイ (`ishidai`)
- イシガキダイ (`ishigakidai`)
- アカカマス (`akakamasu`)
- ヤマトカマス (`yamatokamasu`)
- マアジ (`maaji`)
- マルアジ (`maruaji`)
- マサバ (`masaba`)

## 共通方針

- 旧v1.2/v1.3の値は監査記録として参照するが、v1.4への機械変換はしない。
- `stableGeneral` は当該taxonの直接根拠だけを採用する。
- `regionalCatchability` は糸島市西岸〜唐津湾〜伊万里湾〜平戸の陸っぱりに直接結び付く根拠のみ採用する。
- 産卵・仔稚魚・他地域・商業漁業・船釣り・出現レコードを対象地域の釣れやすさへ転用しない。
- species_groupや近縁種から値を継承しない。
- SCORE v2、魚種master、地点魚種、Supabase既存データ、RLS/Auth、CI workflowは変更しない。

## 結果概要

| taxon | stableGeneral | regionalCatchability | 主な判断 |
|---|---:|---:|---|
| サヨリ | C2 / U6 | U8 | `Hyporhamphus sajori`。marine/brackish/freshwater利用と産卵場情報を採用。産卵・仔魚水温は一般適水温へ転用しない。 |
| ボラ | C2 / U6 | U8 | 日本のボラはBISMaLの `Mugil cephalus cephalus` を採用。species complex注意を保持。霞ヶ浦・利根川情報は地域限定。 |
| マアナゴ | C3 / U5 | U8 | `Conger myriaster`。東京湾の成魚10–40m・砂泥底、marineを採用。アナゴ類一般の夜行性を継承しない。 |
| イシダイ | C3 / U5 | U8 | `Oplegnathus fasciatus`。1–10m、沿岸岩礁、marine/reef-associatedを一般生態として採用。 |
| イシガキダイ | C3 / U5 | U8 | `Oplegnathus punctatus`。3–135m、岩礁・サンゴ礁、marine/reef-associatedを採用。 |
| アカカマス | C3 / U5 | U8 | `Sphyraena pinguis`。Field Guideの3–6mは用途限定、沿岸の泥・砂泥・岩底、marine/pelagic-neriticを採用。 |
| ヤマトカマス | C0 / U8 | U8 | `Sphyraena japonica`。BISMaLの出現レコード水深は一般生息水深へ変換せず、identity以外はunknown。 |
| マアジ | C4 / U4 | U8 | `Trachurus japonicus`。東京湾の季節移動、0–275m、marine/pelagic-neritic/oceanodromous、東シナ海〜九州西岸の産卵情報をscope付きで採用。 |
| マルアジ | C3 / U5 | U8 | `Decapterus maruadsi`。usually 0–20mをqualitativeで保持し、reef-associated/亜潮間帯、marine・半閉鎖性海域利用を採用。 |
| マサバ | C6 / U2 | U8 | `Scomber japonicus`。10–27℃、0–300m、冬季の深場移動、marine/pelagic-neritic、昼夜鉛直行動、産卵15–20℃を用途分離して採用。 |

`C=confirmed / U=unknown`。stableGeneralは8属性内訳。regionalCatchabilityは10 taxon × 8属性すべてunknown。

## 重要な判断

### ボラの分類

BISMaLの日本語「ボラ」は `Mugil cephalus cephalus` として扱う。一方、FishBaseは `Mugil cephalus` がspecies complexであることを注意しているため、世界一般の同名情報を日本のボラへ無条件に拡張しない。

### ヤマトカマスの水深

BISMaLに出現レコード水深が存在しても、標本・出現記録の最小最大から一般生息水深を作らない。用途適合する直接根拠を確定できないためstableGeneralは8属性すべてunknownとした。

### マアジの地域研究

2026年FRA電子タグ研究の東京湾季節移動は地域限定のstableGeneralとして記録する。九州西岸を含む産卵場情報も産卵文脈に限定し、対象地域の陸っぱり釣れやすさへ転用しない。

### マサバの水温

10–27℃は一般生息温度、15–20℃は産卵が多い水温として分離する。どちらもそのまま対象地域の釣れやすい水温やSCORE v2閾値へ接続しない。

### regionalCatchability

10 taxonについて、対象地域の陸っぱりで各属性と釣れやすさを直接結び付ける公的・研究系の用途適合根拠を確定できなかったため、80属性すべてunknownを維持する。

## 棚卸し見込み

- Batch 04反映後のv1.4移行: 40/67 taxon。
- 本Batch対象の `not_researched`: 0件。
- アカカマス、ヤマトカマスは新規JSON追加となり、JSON未作成taxonは2件減る。
- 残りv2未移行taxon: 27件。

## 本番接続

- SCORE v2: 変更しない
- fish species master: 変更しない
- fishing spots / target species: 変更しない
- Supabase既存データ: 変更しない
- v1.4 `acceptedPaths` は研究記録上の採用属性であり、本BatchだけでSCOREへ接続しない
