# Issue #165 地域別10地点 釣り場属性調査レビュー

## 概要

Issue #165では、既存地点マスターに存在する10地点を、Schema v1.1.0の自己完結JSONとして地域別小バッチで追加した。対象はバッチA（糸島西岸3地点）、バッチB（唐津湾・北部4地点）、バッチC（伊万里湾・長崎3地点）である。

本調査は本番地点マスター、DB、UI、SCOREへ反映しない。代表点はレビュー用の概略点であり、実釣位置、入口、駐車位置、防波堤先端、危険箇所を示さない。

## 地域別・地点別サマリー

| バッチ | spotId | 地点名 | scopeType | 代表緯度 | 代表経度 | 本番反映候補 | 主な保留 |
|---|---|---|---|---:|---:|---|---|
| A | nokita-beach | 野北海岸 | district | 33.6048 | 130.1552 | hold | district範囲、施設、規制、魚種 |
| A | kishi-port | 岐志漁港 | facility | 33.5889 | 130.1391 | hold | facility座標の公的feature再照合、施設、規制 |
| A | fukuyoshi-port | 福吉漁港 | facility | 33.5164 | 130.0969 | hold | facility座標の公的feature再照合、施設、規制 |
| B | hamasaki-beach | 浜崎海岸 | district | 33.4555 | 130.0427 | hold | 海岸範囲、施設、規制、魚種 |
| B | niji-matsubara | 虹の松原周辺 | district | 33.4472 | 130.0207 | hold | 周辺範囲、保安林・海岸利用条件 |
| B | karatsu-west-port | 唐津西港 | facility | 33.4662 | 129.9488 | hold | 港湾管理区域、立入・釣り可否 |
| B | yobuko-area | 呼子周辺 | district | 33.5437 | 129.8942 | hold | district内の個別施設差、規制 |
| C | imari-inner-bay | 伊万里湾奥 | district | 33.3044 | 129.8176 | hold | 湾奥範囲、水深・底質、規制 |
| C | takashima-area | 鷹島周辺 | district | 33.4246 | 129.7555 | hold | 島周辺の個別地点差、管理者確認 |
| C | tabira-port | 田平港 | facility | 33.3609 | 129.5827 | hold | 港湾・フェリー周辺の管理区域確認 |

## source採否方針

- 採用: 国土地理院地理院地図、自治体・公的資料に相当する地点別確認source。
- 限定確認: 民間・二次sourceは不足項目の確認候補に留め、本文・画像・コメント・掲載魚種一覧は保存しない。
- 不採用: トップページ、検索結果、カテゴリ一覧、地点DBの転載的情報、現行性や管理者独立性が不足する情報。

## scopeと代表点の扱い

facilityは漁港・港湾等の施設代表点として扱い、実釣ピンや入口ではない。districtは海岸、湾奥、島・地域周辺の概略代表点として扱い、district全域の立入可否、釣り可否、施設、魚種を一括で断定しない。

## 現行地点マスターとの比較方針

`src/data/fishingSpots.ts`の既存値は比較対象のみで、調査根拠として流用していない。最低限の比較項目は latitude / longitude / coordinatePrecision / spotType / shoreAccess / targetSpecies / recommendedMethods / notes とし、Schemaに存在しない値は調査済み属性として扱わない。

## 属性採用候補と保留

- 採用候補: 地点名、都道府県、市区町村、scopeType、代表座標、spotTypeの限定的分類。
- 注意付き候補: openSeaExposure、riverInfluenceなど地図判読由来の推定値。
- 保留: parking、toilet、streetLights、waterDepth、seabed、fishSpecies、fishingProhibited、entryProhibited、constructionOrClosure。

## コピー検知

`scripts/fishing-spot-research-schema.test.mjs`で10地点のSchema v1.1.0適合、source参照、座標support、source独立性メタ、researchNotes固有性を検証する。さらにfacility同士、district同士、全10地点の機械コピー検知として、attributes / facilities / restrictions / sourcesを正規化比較し、facility用・district用の1属性変更negative fixtureが失敗することを確認する。

## 追加確認が必要な項目

各地点で、現地掲示または管理者への確認により、立入可否、釣り可否、駐車場、トイレ、常夜灯、工事・閉鎖、水深・底質、魚種の観測根拠を追加確認する必要がある。
