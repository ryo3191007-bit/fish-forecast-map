# Issue #165 地域別10地点 釣り場属性調査レビュー

最終更新: 2026-07-18 JST

## 結論

Issue #165の10地点JSONは、初回作成内容にplaceholder URLとsourceの過大な`supports`指定が含まれていたため、全件を再監査した。

- 10地点に含まれていた`example.com`の自治体source・二次source計20件を削除した。
- 地理院地図だけでは直接支えられない自治体、河川影響、外海露出、施設、規制等の断定を撤回した。
- 座標は公式座標ではなく、レビュー用の`map_measurement / inferred / low`の概略代表点へ変更した。
- 直接根拠を確認できない属性は`unknown / low / supportingSourceIds: []`へ戻した。
- バッチAの3地点は実在する公式・公的sourceを再調査し、名称・現行自治体・spotTypeの直接根拠を追加した。
- バッチB・Cの7地点は公式source再調査前のため`needs_revision`を維持する。
- 現時点では本番地点マスター、Supabase、UI、SCOREへ採用しない。

## 地点別状態

| バッチ | spotId | 地点名 | scopeType | spotType | 公式調査 | reviewStatus | 主な追加確認 |
|---|---|---|---|---|---|---|---|
| A | `nokita-beach` | 野北海岸 | district | sandy_beach（confirmed / medium） | completed | draft | district範囲、管理者、規制、施設 |
| A | `kishi-port` | 岐志漁港 | facility | fishing_port（confirmed / medium） | completed | draft | C09 feature座標、管理者、規制、施設 |
| A | `fukuyoshi-port` | 福吉漁港 | facility | fishing_port（confirmed / medium） | completed | draft | C09 feature座標、管理者、規制、施設 |
| B | `hamasaki-beach` | 浜崎海岸 | district | sandy_beach（inferred） | incomplete | needs_revision | 海岸範囲、管理者、規制、施設 |
| B | `niji-matsubara` | 虹の松原周辺 | district | sandy_beach（inferred） | incomplete | needs_revision | district範囲、保安林・海岸利用条件 |
| B | `karatsu-west-port` | 唐津西港 | facility | port（inferred） | incomplete | needs_revision | 港湾管理区域、立入・釣り可否 |
| B | `yobuko-area` | 呼子周辺 | district | unknown | incomplete | needs_revision | district内の個別地点・施設差、規制 |
| C | `imari-inner-bay` | 伊万里湾奥 | district | unknown | incomplete | needs_revision | 湾奥範囲、水深・底質、管理者、規制 |
| C | `takashima-area` | 鷹島周辺 | district | unknown | incomplete | needs_revision | 島内の個別地点差、危険箇所、管理者 |
| C | `tabira-port` | 田平港 | facility | port（inferred） | incomplete | needs_revision | 港湾・フェリー管理区域、立入・釣り可否 |

## バッチA 公式・公的source採否

### 野北海岸

- 採用: 糸島市「桜野校区の紹介」。本文で野北海岸を明記し、砂浜の海岸線として説明しているため、`identity.spotName`、`identity.municipality`、`attributes.spotType.value`を直接支える。
- 採用: 国土地理院地理院地図。district概略代表点の緯度・経度だけを支える。
- 保留: 駐車場、トイレ、常夜灯、立入・釣り可否、工事・閉鎖、水深、底質、潮流、魚種。校区紹介や地図表現から推定しない。

### 岐志漁港

- 採用: 福岡県Data Web「筑前海区の漁港」。岐志を漁港一覧へ掲載しているため、名称、都道府県、`fishing_port`を直接支える。
- 採用: 糸島市「市営渡船ひめしまの運航」。岐志漁港と現行自治体を直接確認する。
- 採用: 国土地理院地理院地図。facility概略代表点の緯度・経度だけを支える。
- checked限定: 市営渡船利用者向け無料駐車場。一般の釣り利用者が使用可能とは確認できないため、`facilities.parking`は`unknown`を維持する。
- 保留: C09実データの岐志feature座標、一般利用施設、規制、魚種。

### 福吉漁港

- 採用: 福岡県Data Web「筑前海区の漁港」。福吉を漁港一覧へ掲載しているため、名称、都道府県、`fishing_port`を直接支える。
- 採用: 糸島市「福井行政区」。福吉漁港と現行自治体を直接確認する。
- 採用: 国土地理院地理院地図。facility概略代表点の緯度・経度だけを支える。
- 保留: C09実データの福吉feature座標、一般利用施設、規制、魚種。

## 現行地点マスターとの比較（バッチA）

`src/data/fishingSpots.ts`の値は比較対象のみであり、調査根拠には使用しない。距離差はHaversine式による概算である。

| spotId | マスター座標 | 調査代表座標 | 概算差 | coordinatePrecision | spotType比較 | shoreAccess / 魚種 / 釣法の扱い |
|---|---|---|---:|---|---|---|
| `nokita-beach` | 33.625, 130.158 | 33.6048, 130.1552 | 約2.26 km | approximate | サーフ ↔ sandy_beachは概念上近いが、調査JSONは公式記述に限定 | マスター値は根拠未確認のため採用しない |
| `kishi-port` | 33.568, 130.151 | 33.5889, 130.1391 | 約2.57 km | rounded | 漁港 ↔ fishing_portは一致 | 「足場良い」、魚種、釣法は調査根拠に使用しない |
| `fukuyoshi-port` | 33.517, 130.058 | 33.5164, 130.0969 | 約3.61 km | rounded | 漁港 ↔ fishing_portは一致 | 「足場良い」、魚種、釣法は調査根拠に使用しない |

岐志・福吉はマスター座標との差が大きく、現時点の調査座標も地図計測による概略点である。C09実データの該当featureを直接取得・照合するまで、本番座標候補にはしない。

## source採否ルール

### supportingとして使用できるもの

source本文・実データ・地図表現が対象Schema pathを直接支える場合だけ、`supports`と`supportingSourceIds`へ登録する。

### checkedに限定するもの

確認はしたものの、対象値を直接支えないsourceは`checkedSourceIds`へ置き、値は推測で確定しない。特定用途の施設情報を一般の釣り利用へ転用しない。

### 使用禁止

- placeholder、架空、到達不能、内容不一致のURL
- 検索結果、トップページ、カテゴリ一覧だけのURL
- publisherや内容を確認していないURL
- 地図上で見えるという理由だけで、立入可否、釣り可否、駐車場、トイレ、常夜灯、水深、底質、潮流、魚種を確定すること

## scopeと代表点

- `facility`: 港・漁港等の施設全体を示す概略代表点。岸壁先端、入口、駐車位置、実釣ピンではない。
- `district`: 海岸、湾奥、島・地域周辺を示す概略代表点。district全域の施設・規制・魚種を一括で断定しない。
- 現在の10地点の座標は、地理院地図上のレビュー用測定点であり、公式座標として扱わない。

## 本番反映候補

| バッチ | 判定 | 理由 |
|---|---|---|
| A | hold | 名称・自治体・spotTypeは公式根拠を追加したが、座標、管理者、規制、施設、魚種が未確定 |
| B | hold | 公式source再調査前 |
| C | hold | 公式source再調査前 |

## 今後の完了条件

1. バッチB・Cの各地点に対して実在する公式・公的sourceを調査する。
2. 岐志・福吉はC09実データの該当featureを直接照合し、座標採否を再判断する。
3. URL、publisher、sourceType、sourceGroup、内容を一件ずつ確認する。
4. sourceが直接支えるSchema pathだけを`supports`へ登録する。
5. `value / status / confidence / evidence / note`を一致させる。
6. 管理者・自治体等の現行情報がない施設・規制項目はunknownを維持する。
7. Schema検証、copy検知、source品質検査、lint、typecheck、test、build、GitHub Actionsを再実行する。
8. 全要件を満たした場合のみDraft解除を検討し、利用者判断なしにマージ・本番反映は行わない。
