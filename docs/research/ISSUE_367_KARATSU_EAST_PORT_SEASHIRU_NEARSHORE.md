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

初回PoCでは厳密な方向付きキャストセクターを実装しない。岸線からの距離を先に検証し、陸側・港内奥を厳密に除外するsector設計は結果を見て次段階で判断する。

## 対象API

2026-07-29時点で公式開発者ポータルからv2 Base URLを確認できた項目のみを実装する。

### 底質

- 貝殻: `https://api.msil.go.jp/shells/v2`
- さんご: `https://api.msil.go.jp/coral/v2`
- 礫: `https://api.msil.go.jp/gravel/v2`
- 石・岩: `https://api.msil.go.jp/stone-rock/v2`
- 砂: `https://api.msil.go.jp/sand/v2`
- 泥・粘土: `https://api.msil.go.jp/mud-caly/v2`

海しる項目一覧には底質として「溶岩」も掲載されているが、今回の実装確認時点で現行v2 Base URLを公式API仕様から独立確認できなかったため、推測URLを実装しない。確認できた時点で別途追加する。

### その他

- 海底障害物: `https://api.msil.go.jp/seabed-obstruction/v2`
  - Layer 1: Point
  - Layer 3: Polygon
- 沈船: `https://api.msil.go.jp/wrecks/v2` / Layer 1
- 海岸線種類（ESI）: `https://api.msil.go.jp/coastline-type-ESI/v2` / Layer 1

底質各種、沈船、ESIは確認済みの対象Layerを呼ぶ。海底障害物は公式仕様にPointとPolygonの両方があるため、Layer 1とLayer 3を別datasetとして取得して取りこぼしを防ぐ。

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

キーを持つローカル環境で実行する場合の例:

```powershell
$env:SEASHIRU_SUBSCRIPTION_KEY = "<local-only>"
node scripts/issue-367-seashiru-nearshore-poc.mjs
Remove-Item Env:SEASHIRU_SUBSCRIPTION_KEY
```

`<local-only>` の実値はGitHub、チャット、スクリーンショット等へ貼らない。

## 距離計算

150m程度の局所PoCであるため、基準LineStringの平均緯度経度を原点とする局所平面へWGS84経緯度をメートル換算し、最短距離を計算する。

対象geometry:

- Point / MultiPoint
- LineString / MultiLineString
- Polygon / MultiPolygon

Polygonは境界までの距離だけでなく、基準LineStringがPolygon内に入る場合を距離0mとして扱う。これは海底障害物Layer 3を正しく扱うために必要な処理である。

この距離値を測量成果や航海用距離として扱わない。目的は近岸データ密度の比較である。

## テスト

`scripts/issue-367-seashiru-nearshore-poc.test.mjs` では、外部APIやsecretを使用せず次を確認する。

- #365で採用したeligible segmentを使用する。
- 旧PoCの南北LineStringを基準にしない。
- API定義にsubscription keyが埋め込まれていない。
- 海底障害物のLayer 1 / Layer 3を両方対象にする。
- 0〜150mの距離band境界。
- 地点代表座標ではなくLineStringまでの距離を使う。
- 基準LineStringを含むPolygonを距離0mと扱う。
- 150m超の地物を除外する。
- 検索envelopeが基準LineStringを十分含む。

## live PoC前の残作業

このPRのCIではSeaShiru secretを登録・使用しないため、**実APIの件数はCIでは取得しない**。

キーを保持するローカル環境でランナーを1回実行し、生成された `data/research/seashiru/karatsu-east-port-nearshore.poc.json` から次をレビューする。

- 底質各種の0〜150m件数
- 海底障害物Point / Polygonの件数
- 沈船件数
- ESI地物件数
- 0〜50 / 50〜100 / 100〜150m分布
- 最短距離
- APIエラーと正常0件の区別
- 陸側・港内奥の明らかな不要地物が含まれていないか

生成結果を正本へコミットするのは、内容とsecret非混入を確認してから行う。

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

海しるAPIの種類・パラメータは更新される可能性があるため、47地点への展開前に最新仕様を再確認する。
