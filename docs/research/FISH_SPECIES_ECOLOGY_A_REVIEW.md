# 魚種生態調査A レビュー

確認日: 2026-07-26

Issue #308 の正本レビュー。既存の `aji / maaji / maruaji / seabass / chinu` は変更せず、回遊魚・小型回遊魚13エントリを v1.3.0 の自己完結型調査記録として追加する。

## 対象

| group | entries |
|---|---|
| サバ系 | `saba`, `masaba`, `gomasaba` |
| イワシ系 | `iwashi`, `maiwashi`, `katakuchiiwashi`, `urumeiwashi` |
| 青物系 | `aomono`, `buri`, `hiramasa`, `kanpachi`, `sawara` |
| その他回遊魚 | `shiira` |

## 採用方針

- `saba / iwashi / aomono` は釣り上の表示グループであり、単一taxonのcanonical名・学名や構成種の生態値を持たせない。
- 個別種のcanonical名・学名は、公的資料または編集責任の明確な生物DBから直接確認できたものだけを候補にする。
- 水温・水深・水域・産卵等の一般生態は `stableGeneral` に保持できるが、地点相性や釣れやすさへ自動変換しない。
- 一般生息水深は岸から狙える水深ではない。産卵水温・産卵期は適水温・釣期ではない。
- 本Issueでは対象地域（糸島〜唐津湾〜伊万里湾〜平戸）を直接支える遊漁根拠を十分に確保していないため、全13エントリの `regionalCatchability` は `unknown / hold` とする。
- 全13エントリの `scoreV2Status` は現行実装に合わせて `unsupported`。SCORE v2の定数・重み・対象魚種は変更しない。

## エントリ別要点

| species | 今回の根拠付き候補 | 主な制約 |
|---|---|---|
| `saba` | グループ定義のみ | マサバ・ゴマサバを集約しない |
| `masaba` | 分類、水温、一般水深、水域、昼夜鉛直行動、産卵水温 | 産卵水温を釣れやすさ水温へ転用しない |
| `gomasaba` | 分類、一般水深、沿岸・外洋利用 | マサバと同じ値にしない |
| `iwashi` | グループ定義のみ | 3構成種の差を保持 |
| `maiwashi` | 分類 | 三重県の来遊時期を対象地域の釣期へ転用しない |
| `katakuchiiwashi` | 分類、内湾・沿岸利用、ほぼ周年の産卵 | 産卵時期は釣期ではない |
| `urumeiwashi` | 分類 | 熊野灘の成熟・来遊情報は対象地域へ一般化しない |
| `aomono` | グループ定義のみ | 単一taxonではない |
| `buri` | 分類、一般水深上限、幼魚の浮遊藻利用、海洋性 | 片側水深情報から下限を補わない |
| `hiramasa` | 分類、一般水温、岩礁・リーフ、沿岸・外洋利用 | 地点相性やSCORE閾値へ自動変換しない |
| `kanpachi` | 学名、一般水深、沖合岩礁、沿岸湾利用、夏の産卵 | 日本語canonical名は公的taxonomy根拠不足で保留 |
| `sawara` | 学名、一般水深、沿岸・半閉鎖性海域、瀬戸内海の産卵回遊 | 瀬戸内海の季節を対象地域へ転用しない |
| `shiira` | 分類、水温、一般水深、外洋・沿岸利用、三重県の夏産卵 | 夏産卵を対象地域の釣期へ変換しない |

## v1.3.0 検証基盤

既存5エントリの v1.2.0 は互換維持する。新規展開用 v1.3.0 は `data/research/fish-species/*.json` を自動発見し、`src/domain/fishing.ts` の現行masterと次を照合する。

- speciesId / displayName / entityType / parentGroup
- groupのactive子魚種
- inactive/legacy魚種の除外
- sourceとclaimの双方向参照
- 19属性の採否完全分類
- adopted pathと `productionAdoption.acceptedPaths` の一致
- current SCORE v2 support状態

B〜EはAのマージ後、v1.3.0でJSONを追加するだけで同じ共通検証へ乗せる。
