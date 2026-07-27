# 魚種生態調査 v2 Batch 05 レビュー

Issue #346。`ecology-v2-05` の9 taxonを `docs/research/FISH_SPECIES_ECOLOGY_RESEARCH_V2_SPEC.md` に従って再調査したレビュー記録。

確認日: 2026-07-28

## 対象

- ゴマサバ (`gomasaba`)
- マイワシ (`maiwashi`)
- カタクチイワシ (`katakuchiiwashi`)
- ウルメイワシ (`urumeiwashi`)
- アカメバル (`akamebaru`)
- クロメバル (`kuromebaru`)
- シロメバル (`shiromebaru`)
- アイゴ (`aigo`)
- ヒラスズキ (`hirasuzuki`)

## 共通方針

- 旧v1.2/v1.3値は機械変換せず、species単位の直接根拠で再評価した。
- `stableGeneral` と `regionalCatchability` を分離し、一般生態を対象地域の釣れやすさへ転用しない。
- `regionalCatchability` は糸島西岸〜唐津湾〜伊万里湾〜平戸の陸っぱりに直接結び付く根拠がない属性をunknownとした。
- species_group・近縁種からの継承を行っていない。
- SCORE v2、魚種master、地点魚種、Supabase、RLS/Auth、CI workflowは変更していない。

## 重要判断

- マイワシは `Sardinops melanostictus` とし、`Sardinops sagax` の世界的生態値を自動転用しない。
- ウルメイワシは現行資料に合わせ `Etrumeus micropus` とし、旧 `Etrumeus teres` をそのまま継承しない。九州周辺で周年、日本海北部で春〜夏という情報は産卵文脈のみに保持する。
- アカメバル `Sebastes inermis`、クロメバル `Sebastes ventricosus`、シロメバル `Sebastes cheni` は別taxonとして個別管理し、メバルgroupや兄弟種から値を継承しない。
- アイゴは1〜50m、礁性、海水/汽水、主に昼行性、毒棘・誤同定情報を一般生態/安全情報として用途限定で採用した。モデル温度は一般生息水温として採用しない。
- ヒラスズキは `Lateolabrax latus`。成魚の浅場・岩礁利用は一般生態としてのみ採用し、対象地域の釣れやすさへ転用しない。

## regionalCatchability

9 taxonすべてについて、対象地域の陸っぱりで各属性と釣れやすさを直接結び付ける上位tier根拠を確定できなかったため、具体値を補完していない。

## 本番接続

- SCORE v2: 変更しない
- fish species master: 変更しない
- fishing spots / target species: 変更しない
- Supabase既存データ: 変更しない
