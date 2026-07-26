# 魚種生態調査E レビュー

確認日: 2026-07-26

Issue #312 の正本レビュー。頭足類5エントリを v1.3.0 の自己完結型調査記録として整理する。

## 対象と採否

19属性（identity 3、`stableGeneral` 8、`regionalCatchability` 8）は各JSONの `attributeDecisions` で `adopt` / `adopt_with_warning` / `hold` に完全分類する。対象地域の陸っぱりで釣れやすさを直接示す十分な根拠は採用していないため、`regionalCatchability` 8属性は全5エントリで `unknown / hold` とする。SCORE v2、UI、DB、地点 `target_species` は変更しない。

| species | 採用した一般生態 | hold・分類上の制約 |
|---|---|---|
| `aoriika` | identity、分類上の注意 | 従来「アオリイカ」とされた集団は複数種を含むとの研究機関資料がある。`Sepioteuthis lessoniana` はmaster上の便宜的対応として警告付き採用とし、水深・水温・釣期等は個別種へ安全に固定できないためhold |
| `kensakiika` | identity、ヤリイカの産卵条件とID混同防止情報 | active masterの表示名は「ヤリイカ」であり、internal ID文字列からケンサキイカへ読み替えない。産卵時の12〜14℃・70〜150mを一般適水温・一般水深・釣れやすさへ転用しない |
| `surumeika` | identity、表層〜中層の一般分布、海洋域、北上期の限定的な日周鉛直移動 | 調査海域・成長段階・時期に依存する日周情報を対象地域の釣れる時間帯へ転用しない |
| `kouika` | identity、水深100m以浅、砂泥底、海水域、現行/旧学名と博多湾での産卵情報 | 春の産卵来遊や漁期を対象地域の遊漁上の釣期へ転用しない |
| `madako` | identity、岩礁・砂泥底、海水域、昼夜行動、現行/旧同定情報 | 資料間で一般水深の幅が大きいため代表的な水深はhold。産卵時期や漁獲情報は遊漁の釣期へ転用しない |

## Source と制約

- 分類・名称はJAMSTEC BISMaL、WoRMS/MolluscaBase、自治体・大学・水産研究機関などの公開資料を優先する。
- `aoriika` は福岡市資料とWoRMSで `Sepioteuthis lessoniana` との対応を確認できる一方、新潟大学資料では従来「アオリイカ」とされた集団が3種に分かれると説明されている。このためscientificNameは `inferred / low`、`adopt_with_warning` とし、他系統へ生態値を暗黙継承しない。
- `kensakiika` は現行master上の表示名「ヤリイカ」を正本とする。BISMaLではヤリイカ `Heterololigo bleekeri` とケンサキイカ `Uroteuthis (Photololigo) edulis` が別taxonとして扱われるため、inactiveな `yariika` を復活させず、internal IDからケンサキイカの値を継承しない。
- `surumeika` の日周鉛直移動は水産研究資料の北上期・調査海域で確認された限定条件の記述として採用し、一般的な「釣れる時間帯」として扱わない。
- `kouika` は現行accepted name `Acanthosepion esculentum` を採用し、旧 `Sepia esculenta` / `Sepia (Platysepia) esculenta` は同種の旧組合せとしてのみ扱う。
- `madako` は現行accepted name `Octopus sinensis` を採用する。日本近海で従来 `Octopus vulgaris` と呼ばれた集団との分類上の混同を明示し、旧学名から生態値を無条件に継承しない。
- 一般生態の水深・水温・産卵条件・昼夜行動を、岸から届く水深、対象地域の釣れやすさ、SCORE v2の閾値へ変換しない。

## regionalCatchability をholdする理由

対象地域は福岡県糸島市西岸から唐津湾、伊万里湾、平戸方面の陸っぱりを想定する。今回確認した資料は分類、一般生態、資源・生物学的知見が中心であり、対象地域・地点・遊漁・時期・環境条件を直接結び付けて「釣れやすさ」を示す根拠としては不足する。このため5エントリとも `regionalCatchability` は `unknown / hold`、`scoreV2Status` は `unsupported` のままとする。

## 再確認条件

地域別属性は、対象地域の陸っぱり釣果・出現を魚種、場所、時期、水温、水深、時間帯、釣法等と直接結び付けられる公的・研究機関資料、または利用許諾を確認した信頼できる資料が得られた場合に再評価する。分類については `aoriika` のmaster粒度が個別系統へ分割される場合、または `kensakiika` のID/表示名定義が変更される場合に再評価する。
