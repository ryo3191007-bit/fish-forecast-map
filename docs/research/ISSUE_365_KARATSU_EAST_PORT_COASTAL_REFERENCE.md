# Issue #365 唐津東港 沿岸基準線再調査

確認日: 2026-07-29  
対象地点: `karatsu-east-port` / 唐津東港  
現在の代表座標: `33.469823, 129.963189`

## 結論

唐津東港では、SeaShiruや高精細水深等の近岸調査に使う `coastalReferenceSegment` と、一般立入・釣り利用可否を分離する。

`fishingUseStatus: unknown` であっても、岸の位置形状が距離計算の基準として十分なら `distanceReferenceStatus: eligible` としてよい。`eligible` は「釣り可能」を意味せず、「岸から0〜150m等の近岸距離計算に使用できる」を意味する。

2026-07-29時点では、公開情報から `東港緑地護岸` 140m、`東港船溜防波堤` 250m、水際プロムナード・緑地前面部等の物理的存在と概略配置は確認できる。一方、近岸距離計算に使うLineStringの端点座標を精度保証付きで取得できる公開GIS/vector資料はまだ確認できていない。

したがって、現時点では座標を目測で作って `eligible` にせず、沿岸基準線候補を根拠付きで整理するところまでとする。

## #363 PoC geometryの扱い

`data/research/shore-fishing-segments/karatsu-east-port.poc.json` に保存されている既存LineStringは、Issue #363で東港岸壁の概位と延長から作った研究用概略線である。

追加確認では、国土交通省の北向き航空写真・配置図に見える東港岸壁の長辺方向と、既存のほぼ南北方向LineStringが整合しない。

このため既存LineStringは次の扱いとする。

- 履歴的PoCとして保持する。
- `geometryStatus: approximate` を維持する。
- `distanceReferenceStatus: not_eligible` を維持する。
- 新しい `coastalReferenceSegment` へそのまま昇格させない。
- SeaShiru 0〜150m判定や水深距離計算には使用しない。

## 沿岸基準線候補

### 1. 東港緑地護岸 / 水際プロムナード前面

現時点の第一候補。

佐賀県の県管理港湾施設概要では `東港緑地護岸` 延長140mが確認できる。

国土交通省のみなとオアシス案内では、唐津東港の構成施設として `水際プロムナード` と `緑地` が明示され、フリーマーケット、イベント、休憩等に利用される水際空間として案内されている。

さらに国土交通省の唐津港整備報告では、`緑地前面部` の木製転落防止柵・舗装と岸壁側の舗装・車止めを連続させた景観整備が記載されている。これにより、東港地区に「緑地前面の連続した水際線」が存在することは強く確認できる。

現時点の評価:

- physicalType: `revetment` または `promenade` 候補
- physicalState: `confirmed` 相当
- geometryStatus: 端点未取得のため未確定
- distanceReferenceStatus: `not_eligible` 維持
- publicAccessStatus: 近岸調査の採否ゲートに使用しない
- fishingUseStatus: 近岸調査の採否ゲートに使用しない
- confidence: 施設存在は高いが、geometryは未確定

### 2. 東港船溜防波堤

佐賀県の県管理港湾施設概要で `東港船溜防波堤` 延長250mと標識灯の存在を確認できる。

2025年度の県発注工事情報でも `東港船溜防波堤補修工 L=234.0m` が確認され、施設規模は整合する。

ただし、公開資料から取得した現時点の情報だけでは、航空写真上のどのLineStringが当該施設に対応するかを精度保証付きで確定できていない。

現時点の評価:

- physicalType: `breakwater`
- physicalState: `confirmed` 相当
- geometryStatus: 未確定
- distanceReferenceStatus: `not_eligible` 維持
- confidence: 施設存在は高いが、geometryは未確定

## 釣り利用可否との分離

Issue #363では、SeaShiru再PoCへ進む条件に一般立入・釣り利用確認を含めていた。

Issue #365以降はこの条件を廃止する。

近岸調査へ進む条件は、原則として次だけとする。

1. 対象が実在する海岸・護岸・防波堤等であること。
2. LineStringの位置形状が0〜150m距離計算に使える精度であること。
3. geometryの根拠source、確認日、精度を記録できること。

`publicAccessStatus` / `fishingUseStatus` は既存schemaとの互換や別用途の情報として保持してよいが、`distanceReferenceStatus` を `eligible` にするための必須条件にはしない。

## 現時点で `eligible` にしない理由

不足しているのは釣り可否ではなく **geometryの根拠** である。

佐賀県の港湾施設公示は施設名と延長を確認できるが端点座標を示さない。港湾計画図、国交省航空写真、みなとオアシス配置図から概略位置は確認できるが、現時点ではLineString端点を精度保証付き数値として抽出できていない。

したがって、航空写真や画像を目測して座標を作り `confirmed` / `eligible` とすることはしない。

## 次の確認

1. `東港緑地護岸` / 水際プロムナード前面について、座標を取得できる公開地図・GIS・工事図面・施設図面を追加探索する。
2. 見つかったgeometryは、施設延長140mや公式配置図との整合を確認する。
3. 十分な根拠が得られた区間だけ `distanceReferenceStatus: eligible` へ昇格する。
4. 昇格後、その線から海側0〜150mのSeaShiru底質・海底障害物・沈船・ESIを再PoCする。

行政・港湾管理者への問い合わせは行わない。公開情報で確定できない値は `unknown` / `approximate` / `not_eligible` のまま保持する。

## 主な公式・公的参照先

- 佐賀県 県が管理する港湾施設の概要: `https://www.pref.saga.lg.jp/kiji00329386/index.html`
- 佐賀県 港湾計画図（唐津港、伊万里港）: `https://www.pref.saga.lg.jp/kiji00313547/index.html`
- 国土交通省 九州地方整備局 唐津港湾事務所 唐津港: `https://www.pa.qsr.mlit.go.jp/karatsu/port/karatsu.html`
- 国土交通省 九州みなとオアシス「からつ」: `https://www.pa.qsr.mlit.go.jp/oasis/minato02.html`
- 国土交通省 地域の要請「環境・景観」に配慮した唐津港の取り組みについて: `https://www.qsr.mlit.go.jp/n-shiryo/kensyu_ronbun/02/16.pdf`
- 国土交通省 みなとオアシス概要資料: `https://www.mlit.go.jp/kowan/content/001734759.pdf`
- 全国ロケーションデータベース 唐津東港: `https://jl-db.nfaj.go.jp/location/410200647/`
