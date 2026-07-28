# 魚種生態調査 v2 Batch 06 レビュー

Issue #347。`ecology-v2-06` の9 taxonを `docs/research/FISH_SPECIES_ECOLOGY_RESEARCH_V2_SPEC.md` に従って再調査したレビュー記録。

確認日: 2026-07-28

## 対象

- カツオ (`katsuo`)
- キュウセン (`kyusen`)
- キチヌ (`kichinu`)
- ジンドウイカ (`jindouika`)
- ムツ (`mutsu`)
- ダツ (`datsu`)
- ホウボウ (`houbou`)
- ヨコフエダイ (`yokofuedai`)
- フエダイ (`fuedai`)

## 共通方針

- 旧v1.3値は機械変換せず、species単位の直接根拠で再評価した。
- `stableGeneral` と `regionalCatchability` を分離し、一般生態・出現記録・商業漁業を対象地域の岸釣りへ転用しない。
- BISMaLのoccurrence depthは一般生息水深として採用しない。
- `regionalCatchability` は糸島西岸〜唐津湾〜伊万里湾〜平戸の陸っぱりに直接結び付く根拠を確定できない属性をunknownとした。
- species_group・近縁種から生態を継承していない。
- SCORE v2、魚種master、地点魚種、Supabase既存データ、RLS/Auth、CI workflowは変更していない。

## 重要判断

- キュウセンは現行 `Parajulis poecileptera` とし、旧 `Halichoeres poecilopterus` は同物異名として扱う。
- キチヌは `Acanthopagrus latus` とし、近縁 `A. sivicolus` へ置換しない。
- ジンドウイカは `Loliolus (Nipponololigo) japonica` をspecies単位で扱い、近縁ジンドウイカ類の生態を継承しない。
- ダツは `Strongylura anastomella`、ホウボウは `Chelidonichthys spinosus` とし、旧名・近縁種から値を継承しない。
- ヨコフエダイは `Lutjanus malabaricus` とし、`Lutjanus madras`（イモトフエダイ）と混同しない。
- フエダイは `Lutjanus stellatus` として個別管理する。

## regionalCatchability

9 taxonすべてについて、対象地域の陸っぱりで各属性と釣れやすさを直接結び付ける用途適合根拠を確定できなかった。一般生態からの推測補完は行っていない。

## 本番接続

- SCORE v2: 変更しない
- fish species master: 変更しない
- fishing spots / target species: 変更しない
- Supabase既存データ: 変更しない

## 2026-07-28 再開時確認

- PR #360による `README.md` / `docs/ROADMAP.md` / `docs/開発引き継ぎ書.md` の更新後も、Batch 06の研究差分は対象9 taxon JSON、inventory、Batch 06 reviewに限定されることを再確認した。
- 直前HEADのGitHub Actions CIは成功済み。Vercel failureはbuild rate limit由来で、Next.js build失敗ではない。
- 本追記後の最新HEADでCI / Vercelを再確認し、merge可否は最新statusと全diffを基準に判断する。
- PR #357のmergeおよびIssue #347のcloseはユーザー明示承認前に行わない。
