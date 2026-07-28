# 魚種生態調査 v2 Batch 07 レビュー

Issue #348。`ecology-v2-07` の9 taxonを `docs/research/FISH_SPECIES_ECOLOGY_RESEARCH_V2_SPEC.md` に従って再調査したレビュー記録。

確認日: 2026-07-28

## 対象

- マコガレイ (`makogarei`)
- ネズミゴチ (`nezumigochi`)
- マハゼ (`mahaze`)
- ウロハゼ (`urohaze`)
- マエソ (`maeso`)
- ワニエソ (`wanieso`)
- トカゲエソ (`tokageeso`)
- アカヤガラ (`akayagara`)
- アオヤガラ (`aoyagara`)

## 共通方針

- 旧値やspecies_groupの代表値を機械継承せず、species単位の直接根拠から新規に記録した。
- BISMaLのoccurrence depthは一般生息水深レンジに転用していない。
- FishBase等のspecies-level一般生態は、直接記載の範囲だけ `stableGeneral` に採用した。
- `regionalCatchability` は糸島西岸〜唐津湾〜伊万里湾〜平戸の陸っぱりに直接結び付く根拠がないため、具体値を推測補完していない。
- SCORE v2、魚種master、地点魚種、Supabase、RLS/Auth、CI workflowは変更していない。

## 重要判断

- マコガレイは `Pseudopleuronectes yokohamae`。一般生態と対象地域の岸釣り情報を分離する。
- ネズミゴチは `Repomucenus curvicornis`。近縁ネズッポ類の値を継承しない。
- マハゼは `Acanthogobius flavimanus`。海水/汽水利用は一般生態としてのみ扱う。
- ウロハゼは `Glossogobius olivaceus`。BISMaL出現水深0.1〜3mを一般分布水深へ転用しない。
- マエソは `Saurida macrolepis`。1〜100m、100m以浅の砂泥底、海水・底生をspecies-level一般生態として用途限定で採用した。
- ワニエソは `Saurida wanieso`。浅海の砂底、海水・底生を一般生態として用途限定で採用した。
- トカゲエソは `Saurida elongata`。20〜100m、浅い砂底、海水・底生を一般生態として用途限定で採用した。
- アカヤガラは `Fistularia petimba`。10〜200m（通常18〜57m）、reef-associated/沿岸軟底、海水/汽水を一般生態として用途限定で採用し、BISMaL occurrence 0〜4418mは不採用とした。
- アオヤガラは `Fistularia commersonii`。現行taxonomyは確定し、生態属性は用途適合する直接根拠が不足するものを調査済みunknownとして記録した。

## regionalCatchability

9 taxonについて、対象地域の陸っぱりで各属性と釣れやすさを直接結び付ける上位tier根拠を確定できなかったため、一般生態からの補完を行っていない。

## 本番接続

- SCORE v2: 変更しない
- fish species master: 変更しない
- fishing spots / target species: 変更しない
- Supabase既存データ: 変更しない

## PR再構成後の確認

- PR #357 / Batch 06のmerge後、PR #358は最新`main`直上へ再構成した。
- 旧stacked historyはPR差分から除外し、Batch 07の9 JSON、inventory、レビュー記録だけを保持する。
- merge前にinventory整合、lint、typecheck、test、buildを新しいHEADで再確認する。