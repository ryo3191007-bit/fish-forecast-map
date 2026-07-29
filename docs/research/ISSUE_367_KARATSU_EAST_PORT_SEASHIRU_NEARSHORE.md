# Issue #367 唐津東港 SeaShiru 近岸0〜150m再PoC

確認日: 2026-07-29  
対象地点: `karatsu-east-port` / 唐津東港  
基準segment: `east-port-green-revetment-reference-01`

## 目的

Issue #365 / PR #366で定義した沿岸基準線を使い、地点代表座標中心ではなく **岸線からの最短距離0〜150m** でSeaShiruデータを評価する。

本Issueでは釣り可否を採否条件にしない。`fishingUseStatus: unknown` / `publicAccessStatus: unknown` のまま、`distanceReferenceStatus: eligible` な基準線を近岸距離計算へ使用する。

## 実装

`scripts/issue-367-seashiru-nearshore-poc.mjs` を追加した。

処理は次の順序で行う。

1. `data/research/shore-fishing-segments/karatsu-east-port.poc.json` を読む。
2. `east-port-green-revetment-reference-01` が存在し、`distanceReferenceStatus: eligible` であることを確認する。
3. 基準LineStringを含む検索用envelopeを生成する。
4. SeaShiru APIへGeoJSONで問い合わせる。
5. 取得geometryごとに基準LineStringまでの最短距離を計算する。
6. 150mを超える地物を除外する。
7. `0-50m` / `50-100m` / `100-150m` の件数、最短距離、geometry、propertiesを記録する。
8. API正常応答0件とAPIエラーを別状態で保存する。
9. 結果を `data/research/seashiru/karatsu-east-port-nearshore.poc.json` へUTF-8 JSONとして出力する。

初回PoCでは厳密な方向付きキャストセクターを実装しない。岸線からの距離を先に検証し、海側/陸側や港内奥を厳密に除外するsector設計は後続で判断する。

## 対象API

2026-07-29時点で公式開発者ポータルからv2 Base URLを確認できた項目のみを実装する。

### 底質

- 貝殻: `https://api.msil.go.jp/shells/v2`
- さんご: `https://api.msil.go.jp/coral/v2`
- 礫: `https://api.msil.go.jp/gravel/v2`
- 石・岩: `https://api.msil.go.jp/stone-rock/v2`
- 砂: `https://api.msil.go.jp/sand/v2`
- 泥・粘土: `https://api.msil.go.jp/mud-caly/v2`

海しる項目一覧には底質として「溶岩」も掲載されているが、今回の実装確認時点で現行v2 Base URLを公式API仕様から独立確認できなかったため、推測URLを実装しない。

### その他

- 海底障害物: `https://api.msil.go.jp/seabed-obstruction/v2`
  - Layer 1: Point
  - Layer 3: Polygon
- 沈船: `https://api.msil.go.jp/wrecks/v2` / Layer 1
- 海岸線種類（ESI）: `https://api.msil.go.jp/coastline-type-ESI/v2` / Layer 1

底質各種、沈船、ESIは確認済みの対象Layerを呼ぶ。海底障害物はPointとPolygonの両方を別datasetとして取得する。

GeoJSON形式で問い合わせる。1回1000件の上限を考慮し、`exceededTransferLimit` / `resultOffset` によるページングへ対応する。

## Secretの扱い

サブスクリプションキーは **`SEASHIRU_SUBSCRIPTION_KEY` 環境変数からのみ読む**。

- ソースコードへ書かない。
- URL query parameterへ書かない。
- GitHub Issue / PRへ書かない。
- PoC JSONへ書かない。
- 通常ログへ書かない。
- テストfixtureへ書かない。

APIリクエストでは公式仕様の `Ocp-Apim-Subscription-Key` HTTP headerへ設定する。

live PoCはユーザーPCのローカルcloneで実行し、生成JSONについてsecret文字列・環境変数名・subscription header名・長いhexトークンが含まれないことを確認してからPRへ反映した。

## 距離計算

150m程度の局所PoCであるため、基準LineStringの平均緯度経度を原点とする局所平面へWGS84経緯度をメートル換算し、最短距離を計算する。

対象geometry:

- Point / MultiPoint
- LineString / MultiLineString
- Polygon / MultiPolygon

Polygonは境界までの距離だけでなく、基準LineStringがPolygon内に入る場合を距離0mとして扱う。これは海底障害物Layer 3を正しく扱うために必要な処理である。

この距離値を測量成果や航海用距離として扱わない。目的は近岸データ密度の比較である。

## live PoC結果

実行時刻: `2026-07-29T13:23:20.402Z`

全10 datasetが `status: ok` で完了した。したがって今回の0件はAPI失敗と区別できる。

| dataset | 取得件数 | 0〜150m | 0〜50m | 50〜100m | 100〜150m | 最短距離 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 貝殻 | 0 | 0 | 0 | 0 | 0 | - |
| さんご | 0 | 0 | 0 | 0 | 0 | - |
| 礫 | 0 | 0 | 0 | 0 | 0 | - |
| 石・岩 | 1 | 1 | 1 | 0 | 0 | 10.3m |
| 砂 | 0 | 0 | 0 | 0 | 0 | - |
| 泥・粘土 | 0 | 0 | 0 | 0 | 0 | - |
| 海底障害物 Point | 0 | 0 | 0 | 0 | 0 | - |
| 海底障害物 Polygon | 1 | 0 | 0 | 0 | 0 | - |
| 沈船 | 0 | 0 | 0 | 0 | 0 | - |
| ESI | 2 | 2 | 1 | 0 | 1 | 0m |

### 底質「石」1件

`bottom-stone-rock` で1件取得し、岸線から10.3mだった。

- geometry: Point
- coordinates: `[129.9631372, 33.4695116]`
- `nature: 石`
- distance band: `0-50m`

これは旧代表座標中心PoCではなく、Issue #365で採用した沿岸基準線からの距離で判定した実データである。

ただし初回PoCは方向付きsea-side sectorを実装していないため、**「実際のキャスト海域にある石」とまでは確定しない**。SeaShiruに唐津東港の岸近傍データが存在することを示す候補として扱う。

### 海底障害物

Pointは検索envelope内でも0件だった。

Polygonは検索envelope内に1件取得したが、沿岸基準線から150m以内には入らなかった。したがって `fetchedFeatureCount: 1` / `nearshoreFeatureCount: 0` であり、「APIにデータが無い」と「近岸150mには無い」を分離できている。

### 沈船

検索envelope内で0件。APIは正常応答しているため、今回の検索条件では正常0件として記録する。

### ESI 2件

1件目:

- 距離: 0m
- ESIランク: `1B`
- 海岸地形: `人工海岸(防波堤・護岸・埠頭等)`
- 遮蔽性海域: `×`
- 海岸の利用状況: `防波堤`

採用済み沿岸基準線と重なる/交差するLineStringが得られたため0mとなった。GSI人工海岸線を基に定義した基準線とSeaShiru ESIの人工海岸地物が位置的に整合する補助確認になった。

2件目:

- 距離: 104.3m
- ESIランク: `8B`
- 海岸地形: `人工海岸(防波堤・護岸・埠頭等)`
- 遮蔽性海域: `○`
- 海岸の利用状況: `防波堤`

ESIの「海岸の利用状況」はSeaShiruデータ属性として記録するだけで、釣り可否・一般立入可否の根拠には使用しない。

## 評価

唐津東港では、SeaShiruの近岸データは **存在するが密度は低い**。

特に底質は6種類中「石」1点のみで、海底障害物・沈船は0〜150mで0件だった。このためSeaShiruだけで近岸底質・ストラクチャーを面的に埋める用途には不足する。

一方、岸線から10.3mの底質点を取得でき、ESIも基準線付近で取得できたため、旧座標中心PoCからの「近岸では使えない」という一括判断は採用しない。**地点・データ種別によって補助情報として使えるかを個別評価する**方針が妥当。

現段階ではSCORE v2へ接続しない。次の地点タイプPoCで同じ方式を比較し、SeaShiruの有用性が港湾特有か、砂浜・磯等でも再現するかを確認する。

## テスト

`scripts/issue-367-seashiru-nearshore-poc.test.mjs` で、外部APIやsecretを使用せず次を確認する。

- #365で採用したeligible segmentを使用する。
- 旧PoCの南北LineStringを基準にしない。
- API定義にsubscription keyが埋め込まれていない。
- 海底障害物のLayer 1 / Layer 3を両方対象にする。
- 0〜150mの距離band境界。
- 地点代表座標ではなくLineStringまでの距離を使う。
- 基準LineStringを含むPolygonを距離0mと扱う。
- 150m超の地物を除外する。
- 検索envelopeが基準LineStringを十分含む。
- live PoC JSONがsecret-freeで、全datasetが正常終了している。
- live PoCの石1件・海底障害物Polygonの150m除外・ESI 2件をsnapshotとして保持する。

## 制約

- sea-side方向付きキャストセクターは未実装。
- 「0〜150m」は岸線からの最短距離であり、実際にキャスト可能な方向・到達範囲を保証しない。
- 底質「溶岩」は今回未取得。
- 0件を「その地物が現地に存在しない」とは解釈しない。SeaShiru検索結果として0件である。

## 非変更

- SCORE v2
- 既存spotId
- 唐津東港代表座標 `33.469823, 129.963189`
- remote Supabase
- 既存釣果
- UI

## 公式参照

- 海しるAPI 利用方法: `https://portal.msil.go.jp/howtouse`
- 海しるAPI 項目一覧: `https://portal.msil.go.jp/msil-api-list`
- API一覧/OAS: `https://portal.msil.go.jp/apis`

海しるAPIの種類・パラメータは更新される可能性があるため、次の地点PoCや47地点展開前に最新仕様を再確認する。
