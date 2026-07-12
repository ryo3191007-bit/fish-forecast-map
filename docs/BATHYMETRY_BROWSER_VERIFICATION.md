# 水深・3D地形モード 実ブラウザ確認手順

Post-MVP-038の実ブラウザ確認を、Vercel Previewまたはローカル環境で再現するための手順です。Codexコンテナではブラウザ計測を完了できなかったため、未計測値は記載しません。

## 対象viewport

- PC: `1440 x 900`
- スマホ: `390 x 844`

ブラウザ開発者ツールでNetworkとConsoleを記録し、可能ならPerformanceのLong Taskも確認します。キャッシュ有無を区別するため、初回確認はDisable cacheを有効にしてページを再読み込みします。

## 通常表示

1. Vercel Previewの`#map`を開く。
2. `水深・3D地形`を選ぶ。
3. GEBCOの色別水深、等深線、hillshadeが表示されることを確認する。
4. `3D表示`をON/OFFし、terrainと2D表示を切り替えられることを確認する。
5. `海岸線表示`をON/OFFし、GSI標準地図overlayと追加出典が同時に切り替わることを確認する。
6. `データ由来`を開き、地図を芥屋大門、唐津東港、呼子、鷹島、平戸瀬戸へ移動して比率が変化することを確認する。
7. Console error、failed request、初回表示完了時間、Long Taskを記録する。

## GEBCOからETOPOへのfallback

開発者ツールのRequest blocking等で次を遮断します。

```txt
*/bathymetry/gebco-2026/*
```

ページを再読み込みして水深モードを選び、次を確認します。

- `高解像度水深を読み込めなかったため、広域水深へ切り替えました`と表示される。
- ETOPO 2022 60秒のcolor、hillshade、contour、terrainへ切り替わる。
- 出典がGEBCOではなくETOPO fallbackになる。
- 画面全体、マーカー、ポップアップは操作できる。

## ETOPOから通常地図へのfallback

GEBCOに加えて次も遮断します。

```txt
*/bathymetry/etopo-2022/*
```

ページを再読み込みして水深モードを選び、次を確認します。

- `水深データを読み込めなかったため通常地図へ戻しました`と表示される。
- 通常地図へ戻る。
- terrain、水深layer、GSI overlay、GEBCO/ETOPO出典が残らない。
- 同じ404が繰り返されても無限に切替処理を行わない。

## TID異常系

`*/bathymetry/gebco-2026/tid-crop.json`だけを遮断し、地図と水深表示を維持したまま`データ由来を表示できません`になることを確認します。対象bounds外へ移動した場合も非致命的な案内になることを確認します。

## 記録項目

| viewport | 初回水深表示 | 3D ON | 2D | GSI ON/OFF | GEBCO→ETOPO | ETOPO→通常地図 | failed requests | console errors | Long Task |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1440×900 | 未計測 | 未計測 | 未計測 | 未計測 | 未計測 | 未計測 | 未計測 | 未計測 | 未計測 |
| 390×844 | 未計測 | 未計測 | 未計測 | 未計測 | 未計測 | 未計測 | 未計測 | 未計測 | 未計測 |

確認後は、実測した値だけをPR本文または本表へ記録します。
