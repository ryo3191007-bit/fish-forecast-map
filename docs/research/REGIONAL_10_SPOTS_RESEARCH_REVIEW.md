# Issue #165 地域別10地点 釣り場属性調査レビュー

最終更新: 2026-07-18 JST

## 結論

Issue #165の10地点JSONは、初回作成内容にplaceholder URLとsourceの過大な`supports`指定が含まれていたため、全件を再監査した。

- `example.com`の自治体source・二次source計20件を全件削除した。
- 地理院地図だけでは直接支えられない自治体、河川影響、外海露出、施設、規制等の断定を撤回した。
- 全10地点で実在する公式・公的sourceを地点別に確認し、`officialResearch: completed`、`reviewStatus: draft`へ更新した。
- 座標は引き続き`map_measurement / inferred / low`の概略代表点であり、公式座標・実釣ピン・入口・駐車位置ではない。
- 直接根拠がない施設、規制、水深、底質、潮流、魚種は`unknown / low / supportingSourceIds: []`を維持した。
- 二次source調査は全地点で`incomplete`。公式調査完了は本番採用可能を意味しない。
- 本番地点マスター、Supabase、UI、SCOREへは反映しない。

## 地点別状態

| バッチ | spotId | 地点名 | scopeType | 採用属性 | 主な公式根拠 | reviewStatus | 主な追加確認 |
|---|---|---|---|---|---|---|---|
| A | `nokita-beach` | 野北海岸 | district | sandy_beach（confirmed / medium） | 桜野校区の紹介 | draft | district範囲、管理者、規制、施設 |
| A | `kishi-port` | 岐志漁港 | facility | fishing_port（confirmed / medium） | 福岡県漁港一覧・糸島市渡船案内 | draft | C09 feature座標、管理者、規制、施設 |
| A | `fukuyoshi-port` | 福吉漁港 | facility | fishing_port（confirmed / medium） | 福岡県漁港一覧・福井行政区 | draft | C09 feature座標、管理者、規制、施設 |
| B | `hamasaki-beach` | 浜崎海岸 | district | sandy_beach（confirmed / medium） | 佐賀県海岸資料・唐津市業務資料 | draft | 海岸範囲、管理者、規制、施設 |
| B | `niji-matsubara` | 虹の松原周辺 | district | unknown | 唐津市保全・文化財資料 | draft | 松原と海岸の範囲、保全規制、利用条件 |
| B | `karatsu-west-port` | 唐津西港 | facility | port（confirmed / medium） | 運輸安全委員会個別事故資料 | draft | 港湾代表座標、管理区域、立入・釣り可否 |
| B | `yobuko-area` | 呼子周辺 | district | unknown | 呼子市民センター・呼子地区資料 | draft | district内の個別地点・施設差、規制 |
| C | `imari-inner-bay` | 伊万里湾奥 | district | unknown / inner_bay（confirmed / medium） | 伊万里市「伊万里湾」 | draft | 湾奥範囲、水深・底質、管理者、規制 |
| C | `takashima-area` | 鷹島周辺 | district | unknown | 松浦市鷹島地区資料 | draft | 島内の個別地点差、危険箇所、管理者 |
| C | `tabira-port` | 田平港 | facility | port（confirmed / medium） | 国交省航路資料・長崎県港湾資料 | draft | 港湾代表座標、管理区域、立入・釣り可否 |

## 公式・公的sourceの採否

### バッチA: 糸島西岸

- **野北海岸**: 糸島市「桜野校区の紹介」が名称・市域・砂浜海岸を直接説明するため採用。地理院地図はdistrict代表座標だけを支える。
- **岐志漁港**: 福岡県Data Webの筑前海区漁港一覧で漁港名・種別を確認し、糸島市の市営渡船ページで現行自治体を照合。渡船利用者向け駐車場は一般釣り利用へ転用しない。
- **福吉漁港**: 福岡県Data Webの筑前海区漁港一覧で漁港名・種別を確認し、糸島市「福井行政区」で現行自治体を照合。
- **保留**: 岐志・福吉のC09実データfeature座標、一般利用施設、規制、魚種。

### バッチB: 唐津湾・北部

- **浜崎海岸**: 佐賀県の海岸侵食対策資料が浜崎海岸を砂浜として直接記載。唐津市の現行業務資料で浜崎海水浴場と唐津市を確認。海水浴場運用を釣り可否へ転用しない。
- **虹の松原周辺**: 唐津市の保全・文化財資料で「虹の松原」と所在地を確認。松原と隣接海岸を含む広域districtのため、単一の`sandy_beach`とはせず`spotType: unknown`。
- **唐津西港**: 運輸安全委員会の個別事故資料で佐賀県唐津市の公式表記「唐津港西港」を確認しaliasへ追加。`port`を採用。トピックス一覧ページはsourceとして不採用・削除。
- **呼子周辺**: 唐津市の呼子市民センターと現行の呼子地区資料で行政districtを確認。港・島・海岸・市街地を含むため`spotType: unknown`。
- **保留**: 港湾・海岸の管理区域、立入・釣り可否、一般利用施設、魚種。

### バッチC: 伊万里湾・長崎

- **伊万里湾奥**: 伊万里市「伊万里湾」が島々により外海の風・波が遮られる「穏やかな内海」と説明するため、`openSeaExposure: inner_bay`を採用。広域districtの`spotType`はunknown。
- **鷹島周辺**: 松浦市の鷹島地区資料と現行避難場所資料で「鷹島」「鷹島地区」と現行市域を確認。島全体を単一の釣り場種別へ分類しない。
- **田平港**: 国土交通省の平戸瀬戸航路資料と長崎県の港湾計画で田平港を港湾として確認。長崎県の平戸瀬戸市場ページで平戸市田平町を照合し、`port`を採用。
- **保留**: 田平港の公式代表座標、港湾管理区域、立入・釣り可否、鷹島の個別地点差、伊万里湾奥の水深・底質。

## 現行地点マスターとの比較

`src/data/fishingSpots.ts`の既存値は比較対象のみで、調査根拠として使用しない。距離差はHaversine式による概算。対象10地点のマスター`notes`はすべて未設定。

| spotId | マスター座標 | 調査代表座標 | 概算差 | precision | マスターspotType / shoreAccess | マスター魚種 | マスター釣法 | 調査での扱い |
|---|---|---|---:|---|---|---|---|---|
| `nokita-beach` | 33.625, 130.158 | 33.6048, 130.1552 | 約2.26 km | approximate | サーフ / 注意必要 | シーバス・ヒラメ・マゴチ・キス | キャスティング・その他 | 比較のみ。shoreAccess・魚種・釣法は直接根拠がないため採用しない |
| `kishi-port` | 33.568, 130.151 | 33.5889, 130.1391 | 約2.57 km | rounded | 漁港 / 足場良い | アジ・サバ・チヌ・アオリイカ | サビキ・コマセ・エギング | 比較のみ。shoreAccess・魚種・釣法は直接根拠がないため採用しない |
| `fukuyoshi-port` | 33.517, 130.058 | 33.5164, 130.0969 | 約3.61 km | rounded | 漁港 / 足場良い | キス・アジ・チヌ・シーバス | その他・サビキ・コマセ・キャスティング | 比較のみ。shoreAccess・魚種・釣法は直接根拠がないため採用しない |
| `hamasaki-beach` | 33.447, 130.039 | 33.4555, 130.0427 | 約1.01 km | approximate | サーフ / 注意必要 | キス・マゴチ・ヒラメ・シーバス | その他・キャスティング・泳がせ | 比較のみ。shoreAccess・魚種・釣法は直接根拠がないため採用しない |
| `niji-matsubara` | 33.462, 130.016 | 33.4472, 130.0207 | 約1.70 km | approximate | サーフ / 注意必要 | キス・マゴチ・ヒラメ | その他・キャスティング・泳がせ | 比較のみ。shoreAccess・魚種・釣法は直接根拠がないため採用しない |
| `karatsu-west-port` | 33.468, 129.978 | 33.4662, 129.9488 | 約2.72 km | rounded | 堤防 / 足場良い | サバ・アジ・青物・チヌ | サビキ・ジギング・コマセ | 比較のみ。shoreAccess・魚種・釣法は直接根拠がないため採用しない |
| `yobuko-area` | 33.543, 129.892 | 33.5437, 129.8942 | 約0.22 km | approximate | 漁港 / 注意必要 | ヤリイカ・アオリイカ・根魚・青物 | エギング・その他・ジギング | 比較のみ。shoreAccess・魚種・釣法は直接根拠がないため採用しない |
| `imari-inner-bay` | 33.281, 129.861 | 33.3044, 129.8176 | 約4.80 km | rounded | 湾岸 / 足場良い | アジ・シーバス・チヌ・ヒラメ | サビキ・キャスティング・コマセ・泳がせ | 比較のみ。shoreAccess・魚種・釣法は直接根拠がないため採用しない |
| `takashima-area` | 33.448, 129.844 | 33.4246, 129.7555 | 約8.61 km | approximate | 堤防 / 注意必要 | 青物・根魚・アオリイカ・真鯛 | ジギング・その他・エギング・コマセ | 比較のみ。shoreAccess・魚種・釣法は直接根拠がないため採用しない |
| `tabira-port` | 33.365, 129.553 | 33.3609, 129.5827 | 約2.80 km | rounded | 漁港 / 足場良い | 真鯛・アジ・チヌ・根魚 | コマセ・サビキ・その他 | 比較のみ。shoreAccess・魚種・釣法は直接根拠がないため採用しない |

### 座標差の判断

- `yobuko-area`は約0.22kmだが、district境界・中心を示す公式座標ではない。
- `nokita-beach`、`kishi-port`、`fukuyoshi-port`、`karatsu-west-port`、`tabira-port`は約2～4kmの差があり、現在の調査座標も地図計測点のため本番候補にしない。
- `imari-inner-bay`は約4.80km、`takashima-area`は約8.61kmの差がある。広域districtであるため単純な正誤比較はできず、公開目的に合う代表点を別途人間判断する。
- すべての座標は実釣位置、入口、駐車位置、堤防先端、危険箇所を示さない。

## attributes / facilities / restrictions / fishSpeciesの採否

### 採用候補

- 公式資料で直接確認した地点・地域名、都道府県、市区町村、aliases。
- `nokita-beach`、`hamasaki-beach`: `sandy_beach`。
- `kishi-port`、`fukuyoshi-port`: `fishing_port`。
- `karatsu-west-port`、`tabira-port`: `port`。
- `imari-inner-bay`: `openSeaExposure: inner_bay`。

### 注意付き候補

- 全地点の代表座標。地理院地図による`map_measurement / inferred / low`であり、本番座標候補ではない。
- `scopeType: district`の地点名は内部のレビュー単位で、行政境界や釣り可能範囲そのものではない。

### 保留

- `waterDepth`、`seabed`、`riverInfluence`、`tidalFlow`、`streetLights`、`obstacles`、`fishingRange`
- `facilities.parking`、`facilities.toilet`
- `restrictions.fishingProhibited`、`entryProhibited`、`constructionOrClosure`
- `fishSpecies`
- 公式sourceが施設の存在を示しても、一般の釣り利用可否を示さない場合はunknownを維持する。

## 二次sourceの採否

- 本PRでは二次sourceをsupporting sourceとして新規採用していない。
- 検索結果、トップページ、カテゴリ・トピックス一覧、転載DB、現行性や管理者独立性が確認できない記事は登録しない。
- 地点別個別記事を確認する場合も、施設・規制・魚種をmedium以上にする単独根拠にはしない。
- `secondaryResearch: incomplete`は、未確認情報を推測で埋めず保留したことを示す。

## source採否ルール

1. source本文・実データ・地図表現が対象Schema pathを直接支える場合だけ`supports`へ登録する。
2. 結論に使えないsourceは`checkedSourceIds`に限定する。ただし検索結果や一覧ページはJSONへ登録しない。
3. 地理院地図は座標測定を支えるが、施設、規制、魚種、水深、底質、潮流を自動的に支えない。
4. 同一運営元・同一原典の派生sourceは独立根拠として重複カウントしない。
5. `unknown`は`confidence: low`、`supportingSourceIds: []`を維持する。

## scopeと代表点

- `facility`: 港・漁港等の施設全体を示す概略代表点。岸壁先端、入口、駐車位置、実釣ピンではない。
- `district`: 海岸、湾奥、島・地域周辺を示す概略代表点。district全域の施設・規制・魚種を一括で断定しない。
- district内の個別施設情報をdistrict全体へ転用しない。
- 現在の10地点の座標は公式座標として扱わない。

## 現地または管理者への追加確認

- 一般立入可能区域と立入禁止区域
- 釣り可否、季節・時間帯・工事等による制限
- 一般釣り利用者が使用できる駐車場・トイレ
- 常夜灯の設置・点灯状況
- 水深・底質・障害物・潮流
- 日付・地点を伴う魚種観測根拠
- 港湾・漁港の正式な代表座標または公的feature

## 本番反映候補

| バッチ | 判定 | 理由 |
|---|---|---|
| A | hold | 名称・自治体・spotTypeは確認済みだが、座標、管理者、規制、施設、魚種が未確定 |
| B | hold | 名称・地域・一部spotTypeは確認済みだが、代表座標、管理区域、規制、施設、魚種が未確定 |
| C | hold | 地域・港湾種別・inner_bayは確認済みだが、広域範囲、代表座標、規制、施設、魚種が未確定 |

## 完了判定に残る作業

1. Schema v1.1.0、source参照、unknownルール、source品質、コピー検知を最新HEADで再実行する。
2. lint、typecheck、test、build、Vercel、Supabase Migration PR Checkを確認する。
3. CI成功後、レビュー資料とPR本文を最終同期する。
4. すべて成功しても、利用者判断なしにマージ、本番反映、Issueクローズは行わない。
