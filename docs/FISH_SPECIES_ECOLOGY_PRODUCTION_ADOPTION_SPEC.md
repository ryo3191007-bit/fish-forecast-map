# 魚種生態マスター 本番採用仕様 v1.2.0

## 境界と単位

調査JSONは根拠・候補・不採用判断を含む監査記録であり、本番正本そのものではない。採用単位は`speciesId`とSchema pathの組で、`species_group`と`exact_species`を同一の生態単位にしない。`aji`は`maaji`と`maruaji`を構成種として列挙するグループ定義専用で、単一のcanonical和名、学名、個別種固有値を持たない。未特定の`aji`を個別種へ自動解決せず、個別種の値を親または兄弟へ暗黙継承しない。

## 属性別採否

`canonicalNameJa / scientificName / aliases`と全ecology属性について、各`review.attributeDecisions`はpath、`adopt / adopt_with_warning / hold / reject`、用途、source ID、地域範囲、confidence、理由、再確認条件を必須とする。

- `adopt`: identity等、記載用途へ直接使える。
- `adopt_with_warning`: 一般生態の説明等には使えるが、地域・文脈・用途制約を守る。
- `hold`: 根拠や用途適合性が不足し、値を投影しない。`purposes`は利用可能用途を示すため`score_excluded`だけとする。
- `reject`: 誤転用となるため投影しない。`purposes`は`score_excluded`だけとする。

`adopt`と`adopt_with_warning`には対応sourceが必要である。後続の機械可読出力は各JSONの`review.productionAdoption.acceptedPaths`だけを同じ`speciesId`へ明示投影し、決定の`purposes`に含まれない用途へ流用しない。`hold`、`reject`、`unknown`は出力値なしとし、既存fallbackで補完しない。`entityType / parentGroupId / memberSpeciesIds`は投影候補属性ではなく、レコードの関係と検証境界を定める構造情報なので`attributeDecisions`と`acceptedPaths`の採否対象外とする。

## 誤転用防止

`stableGeneral`と`regionalCatchability`を分離する。広域の一般生態は対象地域の釣れやすさにならない。地域依存値には地域範囲を必須とする。産卵水温は適水温、一般生息水深は岸釣り水深、産卵期・漁期・水揚げ時期は遊漁の釣期として採用しない。単一点や片側境界から閉区間を作らない。直接根拠のない昼夜傾向や釣法は`unknown`または`hold`とする。

`unknown`、未調査、根拠不足は情報欠損であり、0点、不適、釣れないを意味しない。SCOREへ接続する後続Issueでも中立値への暗黙変換を行わず、情報不足として扱う。

## Schema互換方針

全対象JSONとexampleはv1.2.0へ移行済みである。現行Schemaは`const: 1.2.0`とし、SCORE固有purposeを認識しない旧v1.1.0文書を同じ契約として扱わない。v1.1.0はnegative fixture、v1.2.0はpositive fixtureで検証する。

## 適用範囲

本仕様は調査・採否と後続出力方針だけを確定する。SCORE v2の計算コード、配点、重み、閾値、本番魚種マスター、UI、DBは変更しない。

SCORE v2へ渡す軸固有purpose、魚種解決、欠損計算、固定値移行分類は`docs/FISH_SPECIES_ECOLOGY_SCORE_V2_CONNECTION_SPEC.md`を正本とする。広い用途値や`acceptedPaths`だけではSCORE利用を許可しない。
