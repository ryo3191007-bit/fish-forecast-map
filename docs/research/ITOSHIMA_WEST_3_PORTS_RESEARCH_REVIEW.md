# 糸島西岸3漁港 Schema v1.1.0 調査レビュー

最終確認日: 2026-07-17
対象Issue: #163

## 共通方針

- 野北漁港、芥屋漁港、船越漁港は別JSONとして自己完結させ、source ID、evidence、noteを地点ごとに分離した。
- 国土数値情報C09-06_GML.zipの実データ内で、`fishingPortName`がそれぞれ芥屋、野北、船越である`FishingPort` featureを直接確認した。C09は旧行政区域コードを含むため、現在の`identity.municipality: 糸島市`はC09ではなく糸島市公式観光ガイドマップ（3漁港名が市内地図に掲載）で地点ごとに直接supportさせた。
- 代表座標はC09の`gml:Point`をfacility代表点として採用し、実釣位置、入口、駐車位置、堤防先端は代表点にしていない。
- 国土地理院地図は同名漁港周辺への位置照合と、河川影響・外海露出の机上判読に限定した。
- 二次sourceは地点別個別ページの直接性・現行性を満たす採用sourceを確認できなかったため、3地点とも`secondaryResearch: incomplete`とした。トップページ、検索結果、カテゴリ一覧はsource登録しない。野北・船越はmeets糸島の個別記事（野北: `https://meets-itoshima.com/post-24077/`, 2024-08-31 / 船越: `https://meets-itoshima.com/post-24079/`, 2024-07-30）を確認したが、私的体験記事で現行性・管理者独立性が不足するためsupportsなしのchecked sourceに留めた。芥屋は地点別個別ページを確認できず、架空sourceを作らない。
- 福岡県計画PDFは芥屋漁港を直接支える記載を確認できなかったため、芥屋のsupporting sourceから外し、checked sourceとして不採用理由をnoteに残した。
- 本レビューは本番値の自動採用を目的とせず、次Issueで人間が反映可否を判断するための整理である。

## C09・地理院地図・既存マスターの座標再照合

| 地点 | C09 feature直接確認 | C09 facility代表点 | 地理院地図との照合 | 既存マスター座標 | 概算差 | 採用判断 |
| --- | --- | --- | --- | --- | --- | --- |
| 野北漁港 | `fishingPortName: 野北`, `fishingPortCode: 4320150`, `administrativeAreaCode: 40463`, `type: 2` | 33.611311, 130.161569 | 同名漁港周辺として照合。既存値より西南西側のC09点を公的facility代表点として優先。 | 33.623, 130.138 | 約2.5km | adopt_with_warning: C09名寄せは直接だが、既存値との差が大きいため本番反映前に人間確認が必要。 |
| 芥屋漁港 | `fishingPortName: 芥屋`, `fishingPortCode: 4310260`, `administrativeAreaCode: 40463`, `type: 1` | 33.58937974, 130.10658056 | 同名漁港周辺として照合。既存値との差は比較的小さい。 | 33.594, 130.112 | 約0.7km | adopt_with_warning: C09を代表点候補にできるが、福岡県計画PDFは直接根拠から除外。 |
| 船越漁港 | `fishingPortName: 船越`, `fishingPortCode: 4320160`, `administrativeAreaCode: 40463`, `type: 2` | 33.55389244, 130.13025931 | 船越湾側の同名漁港周辺として照合。既存値との差が非常に大きい。 | 33.577, 130.177 | 約5.1km | adopt_with_warning: C09名寄せは直接だが、既存値との差が大きいため本番反映前に人間確認が必要。 |

## 野北漁港

- 調査JSON: `data/research/fishing-spots/nokita-port.json`
- 二次source採否: `糸島フィッシュトリップ vol.3｜野北漁港編`（2024-08-31, 個別URL確認）は私的体験記事で現行性・管理者独立性が不足するため、魚種・施設・規制のsupportには採用せずcheckedに留める。地域サイトトップページはsource不採用。
- `riverInfluence: none`: 地理院地図で代表点周辺に大河川流入口が見えない範囲の推定。排水路・季節変化は未確認。
- `openSeaExposure: open_sea`: 地理院地図で外海側の防波堤を持つ港湾形状と判読。波浪実測ではない。

### 現行地点マスターとの比較

| 属性 | 現行マスター値 | 調査値 | 差異 | 根拠・判断 | 本番反映候補 |
| --- | --- | --- | --- | --- | --- |
| latitude | 33.623 | 33.611311 | 約1.3km南 | C09の野北feature代表点を採用。既存値との差が大きい。 | adopt_with_warning |
| longitude | 130.138 | 130.161569 | 約2.2km東 | C09の野北feature代表点を採用。既存値との差が大きい。 | adopt_with_warning |
| coordinatePrecision | rounded | facility / official_coordinate / high | Schemaが異なり単純対応なし | C09点をfacility代表点として採用。 | adopt_with_warning |
| spotType | 漁港 | fishing_port | 表現差のみ | C09で漁港featureを直接確認。 | adopt |
| shoreAccess | 足場良い | 直接評価対象なし／根拠なし | 本調査では未評価 | 足場や立入可否を公的sourceで確認していない。 | hold |
| targetSpecies | アジ、イワシ、サバ、チヌ、アオリイカ | 空配列 | 本調査からは採用不可 | 魚種は二次sourceから転載・推定せず、根拠不足として未登録。現行魚種維持の根拠ではない。 | hold |
| recommendedMethods | サビキ、コマセ、エギング | 直接評価対象なし／根拠なし | 本調査では未評価 | 釣法はSchema調査対象外で直接根拠なし。 | hold |
| notes | なし | C09代表点・地理院地図照合・不確実性note | 追加あり | 座標差と机上判読限界を記録。 | adopt_with_warning |

## 芥屋漁港

- 調査JSON: `data/research/fishing-spots/keya-port.json`
- 福岡県計画PDF: 再確認したが芥屋漁港の名称を直接支える根拠として採用できないため、`src-keya-fukuoka-plan`はsupporting sourceから除外。
- 二次source採否: 芥屋漁港の地点別個別記事を確認できず、架空sourceは作成しない。地域サイトトップページ・検索結果・カテゴリ一覧はsource不採用。観光・遊覧船施設と釣り目的利用は混同しない。
- `riverInfluence: none`: 地理院地図で代表点近傍に大河川流入口は見えない範囲の推定。現地排水は未確認。
- `openSeaExposure: bay_mouth`: 芥屋大門・湾口側の位置関係からの机上推定。潮流・安全性の断定ではない。

### 現行地点マスターとの比較

| 属性 | 現行マスター値 | 調査値 | 差異 | 根拠・判断 | 本番反映候補 |
| --- | --- | --- | --- | --- | --- |
| latitude | 33.594 | 33.58937974 | 約0.5km南 | C09の芥屋feature代表点を採用。 | adopt_with_warning |
| longitude | 130.112 | 130.10658056 | 約0.5km西 | C09の芥屋feature代表点を採用。 | adopt_with_warning |
| coordinatePrecision | rounded | facility / official_coordinate / high | Schemaが異なり単純対応なし | C09点をfacility代表点として採用。 | adopt_with_warning |
| spotType | 漁港 | fishing_port | 表現差のみ | C09で漁港featureを直接確認。福岡県計画PDFは不採用。 | adopt |
| shoreAccess | 足場良い | 直接評価対象なし／根拠なし | 本調査では未評価 | 足場や立入可否を公的sourceで確認していない。 | hold |
| targetSpecies | アオリイカ、コウイカ、アジ、チヌ | 空配列 | 本調査からは採用不可 | 魚種は根拠不足として未登録。現行魚種維持の根拠ではない。 | hold |
| recommendedMethods | エギング、サビキ、コマセ | 直接評価対象なし／根拠なし | 本調査では未評価 | 釣法はSchema調査対象外で直接根拠なし。 | hold |
| notes | なし | C09代表点・福岡県計画PDF不採用・二次未完了note | 追加あり | source採否と不確実性を記録。 | adopt_with_warning |

## 船越漁港

- 調査JSON: `data/research/fishing-spots/funakoshi-port.json`
- 二次source採否: `糸島フィッシュトリップ vol.2｜船越漁港編`（2024-07-30, 個別URL確認）は私的体験記事で現行性・管理者独立性が不足するため、魚種・施設・規制のsupportには採用せずcheckedに留める。地域サイトトップページはsource不採用。牡蠣小屋・観光施設の情報と釣り目的利用は混同しない。
- `riverInfluence: none`: 地理院地図で船越湾内の代表点近傍に大河川流入口は見えないためnoneと推定。小水路・排水、降雨後の濁りや季節変化は未確認。
- `openSeaExposure: bay`: 地理院地図で船越湾内の奥まった港湾形状と判読。風向・潮汐による変化は未評価。

### 現行地点マスターとの比較

| 属性 | 現行マスター値 | 調査値 | 差異 | 根拠・判断 | 本番反映候補 |
| --- | --- | --- | --- | --- | --- |
| latitude | 33.577 | 33.55389244 | 約2.6km南 | C09の船越feature代表点を採用。既存値との差が大きい。 | adopt_with_warning |
| longitude | 130.177 | 130.13025931 | 約4.3km西 | C09の船越feature代表点を採用。既存値との差が大きい。 | adopt_with_warning |
| coordinatePrecision | rounded | facility / official_coordinate / high | Schemaが異なり単純対応なし | C09点をfacility代表点として採用。 | adopt_with_warning |
| spotType | 漁港 | fishing_port | 表現差のみ | C09で漁港featureを直接確認。 | adopt |
| shoreAccess | 足場良い | 直接評価対象なし／根拠なし | 本調査では未評価 | 足場や立入可否を公的sourceで確認していない。 | hold |
| targetSpecies | アジ、チヌ、アオリイカ、キス | 空配列 | 本調査からは採用不可 | 魚種は根拠不足として未登録。現行魚種維持の根拠ではない。 | hold |
| recommendedMethods | サビキ、コマセ、エギング、その他 | 直接評価対象なし／根拠なし | 本調査では未評価 | 釣法はSchema調査対象外で直接根拠なし。 | hold |
| notes | なし | C09代表点・既存値との差・二次未完了note | 追加あり | 座標差と机上判読限界を記録。 | adopt_with_warning |

## コピー検知テスト

- `scripts/fishing-spot-research-schema.test.mjs`でattributes / facilities / restrictions / sourcesをセクション別にcanonical化し、spot ID、地点名、座標、確認日、source ID接頭辞、漁港コード、数値を正規化して比較する。
- セクション単位の類似率閾値は80%で、主要4セクション中3セクション以上が閾値以上なら機械コピーとして失敗させる。共通公式source URLの共有自体は許可し、supports、採否role、noteを含む構造コピーを検知対象にする。
- negative fixtureは野北レコードを3地点分へ機械コピーし、地点名・ID・座標・source ID接頭辞・漁港コード・確認日を地点固有値として差し替えたうえで、複製先の1レコードだけ`attributes.openSeaExposure.value`を1項目変更する。それでもattributes / facilities / restrictions / sourcesの大部分がコピーであるため、類似率ベース検知で必ず失敗することを確認する。現3JSONは、C09 feature、現行自治体source、二次source採否、river/openSeaの地点別判断が複数異なるため通過する。

## 追加確認事項

- 漁港管理者または関係漁協への釣り可否、立入制限、駐車・トイレ利用可否、常夜灯の現行確認。
- 現地掲示の有無、工事・閉鎖予定、夜間利用制限。
- 水深・底質の公的または管理者資料。
- 二次sourceは地点別個別ページの正確なURL、ページタイトル、公開日または確認可能な日付を確認できた場合のみ採用する。
