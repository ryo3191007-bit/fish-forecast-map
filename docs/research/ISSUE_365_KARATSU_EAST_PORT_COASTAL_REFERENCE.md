# Issue #365 唐津東港 沿岸基準線再調査

確認日: 2026-07-29  
対象地点: `karatsu-east-port` / 唐津東港  
現在の代表座標: `33.469823, 129.963189`

## 結論

唐津東港では、SeaShiruや高精細水深等の近岸調査に使う `coastalReferenceSegment` と、一般立入・釣り利用可否を分離する。

`fishingUseStatus: unknown` であっても、岸の位置形状が距離計算の基準として十分なら `distanceReferenceStatus: eligible` としてよい。`eligible` は「釣り可能」を意味せず、「岸から0〜150m等の近岸距離計算に使用できる」を意味する。

2026-07-29の追加調査で、国土地理院の地理院地図Vector提供実験から唐津東港周辺の人工護岸に接する海岸線を数値座標で取得できた。佐賀県が公示する `東港緑地護岸` 140m、国交省が示す緑地前面部と岸壁の連続関係と照合した結果、近岸距離計算に使用できる約140.72mの沿岸基準線を1区間採用する。

ただし、地理院地図Vector提供実験の地物自体には `東港緑地護岸` という施設名は付与されていない。法定施設境界・測量済み施設端点として確定したわけではないため、`geometryStatus: approximate` / `confidence: medium` とする。

## #363 PoC geometryの扱い

`data/research/shore-fishing-segments/karatsu-east-port.poc.json` に保存されている旧LineStringは、Issue #363で東港岸壁の概位と延長から作った研究用概略線である。

追加確認では、国土交通省の北向き航空写真・配置図に見える東港岸壁の長辺方向と、既存のほぼ南北方向LineStringが整合しない。

このため既存LineStringは次の扱いを維持する。

- 履歴的PoCとして保持する。
- `geometryStatus: approximate`。
- `distanceReferenceStatus: not_eligible`。
- 新しい `coastalReferenceSegment` へ昇格させない。
- SeaShiru 0〜150m判定や水深距離計算には使用しない。

## 採用した沿岸基準線

### 東港緑地護岸 / 水際プロムナード前面

採用segmentId: `east-port-green-revetment-reference-01`

佐賀県の県管理港湾施設概要では、唐津港に `東港緑地護岸` 延長140m、`東港緑地` 面積26,000㎡が存在することを確認できる。

国土地理院の地理院地図Vector提供実験は、2026-06-24に全国データを2026-04-01時点へ更新している。唐津東港代表点を含むzoom 16 / x 56427 / y 26295のPBFを機械解析し、`coastline` layerの `ftCode: 5103`（海岸線-堤防等に接する部分）を抽出した。

代表点から最短約30.2mの位置に、総延長約397.2mのLineStringが存在した。その西端から8頂点目までの累計長は約140.72mで、佐賀県公示の `東港緑地護岸 140m` と約0.72m差で一致する。

さらに国土交通省の唐津港整備報告では、緑地前面部の舗装から岸壁へ連続した導線を確保し、緑地前面部の木製転落防止柵に合わせて岸壁側の車止めを整備したことが記載されている。つまり緑地前面部と岸壁は連続・隣接する水際として整備されている。

以上のため、次の3点が相互に整合する。

1. 佐賀県: `東港緑地護岸` の公称延長140m。
2. 国土地理院: 代表点近傍の人工護岸海岸線のうち、西端側連続区間が約140.72m。
3. 国土交通省: 緑地前面部から岸壁へ水際整備が連続すること。

このクロスチェックを根拠に、当該約140.72m区間を近岸調査の基準線として採用する。

採用geometry:

```json
[
  [129.9626612663269, 33.46940568381841],
  [129.9627685546875, 33.46942022721781],
  [129.96288388967514, 33.46943477061474],
  [129.96294021606445, 33.46964844639625],
  [129.96333181858063, 33.46956566107747],
  [129.96356785297394, 33.46952650583157],
  [129.96388033032417, 33.4694481952867],
  [129.96393665671349, 33.46946161995655]
]
```

評価:

- `physicalType: revetment`
- `physicalState: confirmed`
- `geometryStatus: approximate`
- `distanceReferenceStatus: eligible`
- `publicAccessStatus: unknown`
- `fishingUseStatus: unknown`
- `confidence: medium`

`eligible` は近岸距離計算への利用可否だけを示す。一般立入や釣り利用を示さない。

## なぜ `confirmed` geometry にしないか

今回のgeometryは画像を目測トレースしたものではなく、国土地理院の公開ベクトルタイルから機械抽出した数値座標である。一方、次の制約が残る。

- ベクトルタイルの地物には港湾施設の固有名称が付与されていない。
- `東港緑地護岸` の法定・管理上の端点座標を直接記載した資料ではない。
- 地理院地図Vector提供実験は地図表示用データであり、港湾施設境界の測量成果として扱わない。
- 約140.72m区間と `東港緑地護岸 140m` の対応は、位置・延長・隣接関係を組み合わせたクロスソース判定である。

このため `geometryStatus: approximate` とする。一方、0〜150mのSeaShiru等の情報密度を調査する基準としては十分な再現性を持つため `distanceReferenceStatus: eligible` とする。

## 東港船溜防波堤

佐賀県の県管理港湾施設概要で `東港船溜防波堤` 延長250mと標識灯を確認できる。

地理院地図Vectorから周辺の人工護岸・防波堤形状は複数抽出できたが、今回の公開情報だけでは、どのLineStringが `東港船溜防波堤` 250mに対応するかを同程度の強さで特定できなかった。

したがって本Issueでは無理に2本目を採用せず、候補のままにする。

## 釣り利用可否との分離

Issue #363では、SeaShiru再PoCへ進む条件に一般立入・釣り利用確認を含めていた。Issue #365以降はこの条件を廃止する。

近岸調査へ進む条件は、原則として次だけとする。

1. 対象が実在する海岸・護岸・防波堤等であること。
2. LineStringの位置形状が0〜150m距離計算に使える精度であること。
3. geometryの根拠source、確認日、精度を記録できること。

`publicAccessStatus` / `fishingUseStatus` は既存schemaとの互換や別用途の情報として保持してよいが、`distanceReferenceStatus` を `eligible` にするための必須条件にはしない。

## 次の確認

唐津東港では `distanceReferenceStatus: eligible` な沿岸基準線を1本得られたため、次はこの約140.72m LineStringを基準として、海側0〜150mにあるSeaShiruの次のデータを再PoCする。

- 底質
- 海底障害物
- 沈船
- ESI

初回は厳密な方向付きキャストセクターより、基準線から近いデータの件数・距離・密度を確認することを優先する。

行政・港湾管理者への問い合わせは行わない。公開情報で確定できない値は `unknown` / `approximate` のまま保持する。

## 主な公式・公的参照先

- 佐賀県 県が管理する港湾施設の概要: `https://www.pref.saga.lg.jp/kiji00329386/index.html`
- 国土地理院 地理院地図Vector / ベクトルタイル提供実験: `https://cyberjapandata.gsi.go.jp/development/vt.html`
- 国土地理院 抽出対象PBF: `https://cyberjapandata.gsi.go.jp/xyz/experimental_bvmap/16/56427/26295.pbf`
- 国土地理院 ベクトルタイルデータ仕様: `https://maps.gsi.go.jp/help/pdf/vector/dataspec.pdf`
- 国土交通省 九州地方整備局 地域の要請「環境・景観」に配慮した唐津港の取り組みについて: `https://www.qsr.mlit.go.jp/n-shiryo/kensyu_ronbun/02/16.pdf`
- 国土交通省 九州みなとオアシス「からつ」: `https://www.pa.qsr.mlit.go.jp/oasis/minato02.html`
