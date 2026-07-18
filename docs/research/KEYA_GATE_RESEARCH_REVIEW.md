# 芥屋大門周辺 Schema v1.1.0 調査レビュー

## 対象

- Issue: #172
- 調査JSON: `data/research/fishing-spots/keya-gate.json`
- spotId: `keya-gate`
- scopeType: `district`
- 本番採用判断: `hold`

## source採否

| source | 採否 | 用途 | 注意 |
|---|---:|---|---|
| 糸島市 天然記念物一覧 | 採用 | `芥屋大門`名称、国指定天然記念物、玄武岩洞窟の確認 | 地区全体の釣り場種別・立入可否・魚種・釣法へ転用しない |
| 糸島市 引津校区の紹介 | 採用 | `芥屋の大門`表記、糸島市/引津校区の文脈確認 | 観光紹介を釣り場属性へ転用しない |
| 糸島市 主な公園の案内 | 採用（checkedのみ） | `芥屋の大門公園`の公園施設確認 | 駐車場・トイレは公園施設であり釣り場施設として採用しない |
| 国土地理院 地理院地図 | 採用 | district概略代表点の机上測定・周辺照合 | 危険箇所、入口、洞窟、岩場、駐車位置、実釣ピンを示さない |

検索結果、トップページ、placeholder URL、`keya-port.json`のsourceは正式根拠として採用していません。

## canonical name / alias

- canonical name: `芥屋大門周辺`
- aliases: `芥屋大門`, `芥屋の大門`

`芥屋大門周辺`はリポジトリ内で安全に丸めた内部canonical district表示名です。公式sourceが直接確認できる表記は`芥屋大門`と`芥屋の大門`であり、内部canonical district表示名そのものが公式ページに記載された名称であるとは扱いません。`芥屋漁港`は別spotIdのfacilityであり、本調査ではaliasにも含めません。

## district代表座標

`33.5967, 130.1106`を地理院地図の机上測定によるdistrict概略代表点として記録しました。公式座標ではないため`map_measurement / inferred / low`です。洞窟入口、海上位置、岩場への進入口、遊歩道入口、危険箇所、駐車場、芥屋漁港、防波堤先端、実釣ピンは代表点にしていません。

## 現行地点マスターとの比較

| 項目 | 現行地点マスター | 今回調査 | 判断 |
|---|---|---|---|
| 名称 | 芥屋大門周辺 | 芥屋大門周辺 | 内部canonical district表示名は維持可能。ただし公式に確認できる表記は`芥屋大門` / `芥屋の大門`まで |
| 座標 | `33.596, 130.109` | `33.5967, 130.1106` | 現行値は流用せず再測定。どちらも安全判断不可 |
| spotType | 磯場 | unknown | 天然記念物の地質説明だけでdistrict全体を磯場分類しない |
| shoreAccess | 注意必要 | unknown | 管理者の現行立入情報がないため採用不可 |
| 魚種 | アオリイカ、青物、根魚 | なし | 直接根拠がないため追加しない |
| 釣法 | エギング、ジギング、キャスティング、その他 | なし | 魚種・実釣根拠がないため追加しない |

## 公園施設と釣り場施設の範囲差

糸島市公園案内は`芥屋の大門公園`の駐車場・トイレを確認できるsourceです。ただしこれは公園利用者向け施設の一覧であり、芥屋大門周辺の海岸・岩場・釣り利用者向け施設や利用可否を直接示すものではありません。そのためSchema上の`facilities.parking`と`facilities.toilet`は`unknown`のままです。

## 公式sourceで確定できた値

- `identity.spotName`: `芥屋大門周辺`（内部canonical district表示名。公式ページにそのまま記載された名称としては扱わない）
- `identity.aliases`: `芥屋大門`, `芥屋の大門`（公式に確認できる表記）
- `identity.prefecture`: `福岡県`
- `identity.municipality`: `糸島市`
- `identity.coordinates`: district概略代表点（低確度の机上測定）

## unknownのまま残した値

- `attributes.*`: 釣り場属性として直接支える公式・公的sourceがないため。
- `fishSpecies`: 日付・地点・出典が確認できる直接根拠を採用していないため。
- `facilities.parking` / `facilities.toilet`: 公園施設を釣り場施設へ転用しないため。
- `restrictions.*`: 釣り禁止、立入禁止、工事・閉鎖の現行管理者情報を確認できないため。
- `restrictions.officialContact`: 釣り利用を直接案内する公式連絡先が未確定のため。

## 本番採用判断

`hold`。名称・自治体・低確度のdistrict概略代表点は参考にできる一方、spotType、shoreAccess、魚種、釣法、施設、釣り可否がほぼunknownです。本番地点マスター、Supabase、UI、SCOREへ反映するには、管理者の現行情報または直接根拠を別途確認する必要があります。
