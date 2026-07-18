# 生月島方面 Schema v1.1.0 調査レビュー

## 対象

- Issue: #175
- JSON: `data/research/fishing-spots/ikitsuki-area.json`
- 本番採用判断: `adopt_with_warning`

## canonical name / alias判断

内部canonical表示名は `生月島方面` とした。公式確認表記は `生月島 / 生月町` であり、公式sourceに内部canonicalが直接出るものとしては扱わない。施設、港、橋、灯台、店舗、駐車場、観光地名はdistrict aliasへ追加しない。

## 現行地点マスターとの属性単位比較

現行地点マスターの `spotType=地磯、shoreAccess=上級者向け、魚種・釣法は直接根拠なし`。Issue #175では正解として流用せず、公式・公的sourceで遊漁地点として直接支えられない値は `unknown / low / supportingSourceIds: []` または `fishSpecies: []` に戻した。

## 代表座標の意味と限界

代表座標は `平戸島北西の生月島全体を丸めたdistrict代表点` で、`coordinateScope: district`、`coordinateMethod: map_measurement`、`status: inferred`、`confidence: low` とした。港、橋、橋脚、灯台、磯入口、堤防先端、駐車位置、実釣ピン、危険箇所を示す座標ではない。

## source採否と直接性

公式・公的sourceは名称、自治体文脈、広域地理文脈、または地理院地図による概略座標確認に限定して採用した。漁業、養殖、水揚げ、店舗、観光施設、航路、文化財、統計の説明は、遊漁魚種、推奨釣法、釣り可否、足場、安全性へ転用していない。

## unknownとして残した値

spotType、足場、潮流、水深、底質、外海露出、アクセス、施設、規制、公式釣り連絡先は、地区全体を直接支えるsourceがないためunknownのまま残した。fishSpeciesは日付・地点・遊漁文脈を確認できる直接根拠がないため空配列とした。

## 範囲差の注意

広域districtと個別港湾・漁港・海岸・橋・灯台・観光施設は混同しない。個別地点の設備や危険情報をdistrict全体へ拡張しない。

## 採用判断

`adopt_with_warning`: JSONはSchema v1.1.0の調査記録として採用可能。ただし本番地点マスター、Supabase、UI、SCOREへ反映する前に、人間が最新の管理者情報、立入可否、釣り可否、安全注意、公開座標粒度を再確認する。
