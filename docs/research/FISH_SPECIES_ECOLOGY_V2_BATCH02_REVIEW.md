# 魚種生態調査 v2 Batch 02 レビュー

Issue #342。`data/research/fish-species-v2/batch-manifest.json` の `ecology-v2-02` 10 taxonを、`docs/research/FISH_SPECIES_ECOLOGY_RESEARCH_V2_SPEC.md` に従って再調査したレビュー記録。

確認日: 2026-07-27

## 対象

- ヒラマサ (`hiramasa`)
- カンパチ (`kanpachi`)
- サワラ (`sawara`)
- カサゴ (`kasago`)
- オニオコゼ (`oniokoze`)
- キジハタ (`kijihata`)
- オオモンハタ (`oomonhata`)
- アカハタ (`akahata`)
- マハタ (`mahata`)
- アオハタ (`aohata`)

## 共通方針

- 旧v1.3値は監査記録として参照するが、v1.4へ機械変換しない。
- `stableGeneral` はspecies-levelで用途に直接合う根拠だけ採用する。
- `regionalCatchability` は糸島市西岸〜唐津湾〜伊万里湾〜平戸の陸っぱりに直接結び付く根拠のみ採用する。
- 商業漁期、水揚げ、船・漁業の漁法を陸っぱりの釣れやすさへ転用しない。
- 産卵・胚発生・飼育水温を成魚の一般適水温へ転用しない。
- BISMaLの出現レコード水深を一般生息水深レンジへ変換しない。
- 親の「青物」「根魚」や兄弟speciesから生態を継承しない。
- `unknown` は0点・不適・非生息を意味しない。調査終了理由を `unknownReason` / `researchNote` に残す。
- 本BatchはSCORE v2、fish species master、地点魚種、Supabase既存データを変更しない。

## 結果概要

| taxon | v1.3 stableGeneral | v1.4 stableGeneral | 主な採用内容 | 主な注意点 |
|---|---|---|---|---|
| ヒラマサ | C3 / U5 | C2 / U6 | 現行分類 `Seriola aureovittata`、東アジア沿岸〜西・中部北太平洋、五島列島の4月下旬〜5月中旬の産卵 | 旧 `S. lalandi` 前提の18〜24℃・岩礁等は現行taxonへ自動継承せず落とした |
| カンパチ | C4 / U4 | C4 / U4 | 1〜385m、沖合礁・沿岸湾、海洋性、夏季沿岸産卵 | 胚発生水温等を一般適水温へ転用しない |
| サワラ | C3 / U5 | C5 / U3 | 0〜200m、沿岸表中層・半閉鎖海域、瀬戸内海の春産卵回遊・秋摂餌回遊 | 筑前海の9〜1月漁期は商業漁期なのでregionalCatchabilityへ転用しない |
| カサゴ | C1 / U7 | C3 / U5 | 沿岸岩礁底、海水底生、卵胎生・秋交尾・冬〜春仔魚産出 | 筑前海の「釣り」は漁業区分で、陸っぱり釣法適性とはしない |
| オニオコゼ | C5 / U3 | C5 / U3 | 200m以浅砂泥底、昼は潜砂・夜間摂餌、6〜8月産卵・7月盛期 | 岡山県資料の一般/瀬戸内海文脈を対象地域catchabilityへ転用しない |
| キジハタ | C3 / U5 | C5 / U3 | 1〜55m岩礁、手釣り、瀬戸内海中央部の6〜8月成熟 | 福岡の5〜11月は商業漁期でありshore catchabilityではない |
| オオモンハタ | C3 / U5 | C4 / I1 / U3 | 6〜200m、海草場・細粒底・岩礁周辺、釣り/かご/トロール | 産卵集群・浮遊卵仔魚は資料自体が“probably”のためinferred |
| アカハタ | C3 / U5 | C5 / I1 / U2 | 4〜160m、外礁斜面・湾・ラグーン、一般漁法、長崎の生殖発達 | 昼夜摂餌はマダガスカル記録なのでinferred。20〜25℃は生殖文脈で一般水温にしない |
| マハタ | C4 / U4 | C5 / U3 | 現行 `Hyporthodus septemfasciatus`、5〜30m浅海岩礁、雌性先熟、福岡の漁業上の釣り等 | `Epinephelus septemfasciatus` は現行accepted nameではない。商業漁法をshore method affinityへ転用しない |
| アオハタ | C2 / U6 | C5 / U3 | 10〜50m、岩礁・砂泥底・幼魚の潮だまり、雌性先熟、筑前海の漁法 | 福岡の5〜11月は商業漁期でありshore catchabilityではない |

`C=confirmed / I=inferred / U=unknown`。集計は `stableGeneral` 8属性のみ。

Batch 02全体では、`stableGeneral` の確定・推定属性が **31/80 → 45/80** となり、unknownは49→35へ14属性減少した。一方、ヒラマサは旧 `Seriola lalandi` 前提の一般生態を現行taxonへ継承しなかったため、件数だけを見ると3→2へ減少している。これは情報量より分類整合を優先した意図的な見直しである。

## 重要な判断

### ヒラマサの学名

2021年の日本魚類学会誌の形態・遺伝解析ではヒラマサを `Seriola aureovittata` として扱い、中西部北太平洋まで分布し得ると報告している。Eschmeyer's Catalog of Fishesでも同名をvalid speciesとして扱う。

そのため本v2では旧JSONの `Seriola lalandi` をそのまま維持せず、`Seriola aureovittata` を採用した。旧 `S. lalandi` を前提に採用していた18〜24℃や岩礁・リーフ等の生態値は、現行ヒラマサtaxonへ自動継承しない。

### ハタ類のspecies-level分離

キジハタ、オオモンハタ、アカハタ、マハタ、アオハタは同じ「根魚」配下でも、生息水深・底質・繁殖特性を個別sourceで管理する。

- キジハタ: 岩礁性、1〜55m、瀬戸内海中央部では6〜8月に成熟個体を確認。
- オオモンハタ: 海草場・細粒底・岩礁周辺、6〜200m。
- アカハタ: 外礁斜面〜湾・ラグーン、4〜160m。長崎の雌で5月に卵黄形成、7月に成熟卵。
- マハタ: 5〜30mの浅海岩礁、雌性先熟。
- アオハタ: 10〜50m、岩礁・砂泥底、幼魚は潮だまりにも出現、雌性先熟。

これらを「ハタだから同じ」として相互継承しない。

### fishingMethods

`stableGeneral.fishingMethods` は「species-levelで直接記録された漁獲法」を研究記録として保持できるが、`method_affinity` や岸釣り適性とは別である。

FishBase/FAO由来の釣り・かご・トロール等、および福岡県資料の「釣り・はえ縄・刺網」は、対象地域の陸っぱりでどの釣法が有利かを示すものではない。したがって本BatchからSCOREへ接続しない。

### regionalCatchability

10 taxon × 8属性の80属性について、対象地域の陸っぱりでの釣れやすさを各属性へ直接結び付ける用途適合根拠は確定できなかった。

福岡県の公的資料で筑前海の漁期・漁法・漁獲魚種は確認できたが、商業漁業の情報であり、一般生態・船・水揚げと同様に陸っぱりcatchabilityへは転用しない。したがってBatch 02も80属性すべてunknownを維持する。

## 主なsource

各claimの正本sourceは各JSONの `sources` / `evidenceSources` とする。主に次を利用した。

- JAMSTEC BISMaL
- Eschmeyer's Catalog of Fishes
- WoRMS
- FishBase / FAO species references
- 岡山県（水産研究所系解説）
- 福岡県水産海洋技術センター「じざかなび福岡」
- 日本魚類学会誌 / 水産増殖等のJ-STAGE査読論文
- 長崎大学を含む生殖生態研究

## 本番接続

- SCORE v2: 変更しない
- fish species master: 変更しない
- fishing spots / target species: 変更しない
- Supabase既存データ: 変更しない
- v1.4の `productionAdoption.acceptedPaths` は研究記録上の採用属性であり、本BatchだけでSCOREへ接続しない
