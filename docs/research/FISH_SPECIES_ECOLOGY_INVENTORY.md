# 魚種master × 生態調査状況 棚卸し

Issue #329 の棚卸し正本。`src/domain/fishing.ts` のactive masterと `data/research/fish-species/*.json` を機械的に突合した結果を記録する。

## 集計

- active master: **69件**
- entityType: `cephalopod_species` 1件 / `exact_species` 50件 / `species_group` 13件 / `squid_species` 5件
- 生態JSONあり: **68件** / なし: **1件**
- schemaVersion: `1.2.0` 5件 / `1.3.0` 63件
- 既存JSON内の `stableGeneral` unknown: **398/544属性 (73.2%)**
  - species_group: **96/96属性 (100.0%)**
  - 個別taxon（species_group以外）: **302/448属性 (67.4%)**
- 既存JSON内の `regionalCatchability` unknown: **533/544属性 (98.0%)**
- JSON未作成を8属性未評価として含めた `stableGeneral` 未解決相当: **406/552属性 (73.6%)**
- `stableGeneral` 8/8 unknown: **16件**
- 子species 0件のspecies_group: **7件**
- active master外の研究JSON: **0件**

### JSON未作成

- アナゴ (`anago`)

### stableGeneral が8/8 unknown

- アジ (`aji`) — species_group
- サバ (`saba`) — species_group
- イワシ (`iwashi`) — species_group
- 青物 (`aomono`) — species_group
- マゴチ (`magochi`) — exact_species
- 根魚 (`rockfish`) — species_group
- マルアジ (`maruaji`) — exact_species
- マイワシ (`maiwashi`) — exact_species
- ウルメイワシ (`urumeiwashi`) — exact_species
- メバル (`mebaru`) — species_group
- カマス (`kamasu`) — species_group
- カレイ (`karei`) — species_group
- メゴチ (`megochi`) — species_group
- ハゼ (`haze`) — species_group
- エソ (`eso`) — species_group
- ヤガラ (`yagara`) — species_group

### 子speciesが0件のspecies_group

- カマス (`kamasu`)
- カレイ (`karei`)
- メゴチ (`megochi`)
- ハゼ (`haze`)
- エソ (`eso`)
- ヤガラ (`yagara`)
- アナゴ (`anago`)

## 全active master一覧

`stable` / `regional` は `C=confirmed / I=inferred / U=unknown / N=not_applicable` の8属性内訳。JSONがない場合は `-`。

| # | speciesId | 表示名 | entityType | parent | 子 | JSON | schema | stable | regional |
|---:|---|---|---|---|---:|:---:|---|---|---|
| 1 | `aji` | アジ | species_group | - | 2 | あり | 1.2.0 | C0/I0/U8/N0 | C0/I0/U8/N0 |
| 2 | `saba` | サバ | species_group | - | 2 | あり | 1.3.0 | C0/I0/U8/N0 | C0/I0/U8/N0 |
| 3 | `iwashi` | イワシ | species_group | - | 3 | あり | 1.3.0 | C0/I0/U8/N0 | C0/I0/U8/N0 |
| 4 | `aomono` | 青物 | species_group | - | 4 | あり | 1.3.0 | C0/I0/U8/N0 | C0/I0/U8/N0 |
| 5 | `shiira` | シイラ | exact_species | - | 0 | あり | 1.3.0 | C5/I0/U3/N0 | C0/I0/U8/N0 |
| 6 | `hirame` | ヒラメ | exact_species | - | 0 | あり | 1.3.0 | C2/I0/U6/N0 | C0/I0/U8/N0 |
| 7 | `magochi` | マゴチ | exact_species | - | 0 | あり | 1.3.0 | C0/I0/U8/N0 | C0/I0/U8/N0 |
| 8 | `seabass` | スズキ | exact_species | - | 0 | あり | 1.2.0 | C2/I0/U6/N0 | C0/I3/U5/N0 |
| 9 | `aoriika` | アオリイカ | squid_species | - | 0 | あり | 1.3.0 | C1/I0/U7/N0 | C0/I0/U8/N0 |
| 10 | `kouika` | コウイカ | squid_species | - | 0 | あり | 1.3.0 | C4/I0/U4/N0 | C0/I0/U8/N0 |
| 11 | `chinu` | チヌ | exact_species | - | 0 | あり | 1.2.0 | C3/I0/U5/N0 | C0/I5/U3/N0 |
| 12 | `madai` | 真鯛 | exact_species | - | 0 | あり | 1.3.0 | C3/I0/U5/N0 | C0/I0/U8/N0 |
| 13 | `kisu` | キス | exact_species | - | 0 | あり | 1.3.0 | C3/I0/U5/N0 | C0/I0/U8/N0 |
| 14 | `rockfish` | 根魚 | species_group | - | 9 | あり | 1.3.0 | C0/I0/U8/N0 | C0/I0/U8/N0 |
| 15 | `buri` | ブリ | exact_species | `aomono` | 0 | あり | 1.3.0 | C3/I0/U5/N0 | C0/I0/U8/N0 |
| 16 | `hiramasa` | ヒラマサ | exact_species | `aomono` | 0 | あり | 1.3.0 | C3/I0/U5/N0 | C0/I0/U8/N0 |
| 17 | `kanpachi` | カンパチ | exact_species | `aomono` | 0 | あり | 1.3.0 | C4/I0/U4/N0 | C0/I0/U8/N0 |
| 18 | `sawara` | サワラ | exact_species | `aomono` | 0 | あり | 1.3.0 | C3/I0/U5/N0 | C0/I0/U8/N0 |
| 19 | `kasago` | カサゴ | exact_species | `rockfish` | 0 | あり | 1.3.0 | C1/I0/U7/N0 | C0/I0/U8/N0 |
| 20 | `oniokoze` | オニオコゼ | exact_species | `rockfish` | 0 | あり | 1.3.0 | C5/I0/U3/N0 | C0/I0/U8/N0 |
| 21 | `kijihata` | キジハタ | exact_species | `rockfish` | 0 | あり | 1.3.0 | C3/I0/U5/N0 | C0/I0/U8/N0 |
| 22 | `oomonhata` | オオモンハタ | exact_species | `rockfish` | 0 | あり | 1.3.0 | C3/I0/U5/N0 | C0/I0/U8/N0 |
| 23 | `akahata` | アカハタ | exact_species | `rockfish` | 0 | あり | 1.3.0 | C3/I0/U5/N0 | C0/I0/U8/N0 |
| 24 | `mahata` | マハタ | exact_species | `rockfish` | 0 | あり | 1.3.0 | C4/I0/U4/N0 | C0/I0/U8/N0 |
| 25 | `aohata` | アオハタ | exact_species | `rockfish` | 0 | あり | 1.3.0 | C2/I0/U6/N0 | C0/I0/U8/N0 |
| 26 | `kue` | クエ | exact_species | `rockfish` | 0 | あり | 1.3.0 | C2/I0/U6/N0 | C0/I0/U8/N0 |
| 27 | `kensakiika` | ヤリイカ | squid_species | - | 0 | あり | 1.3.0 | C1/I0/U7/N0 | C0/I0/U8/N0 |
| 28 | `surumeika` | スルメイカ | squid_species | - | 0 | あり | 1.3.0 | C3/I0/U5/N0 | C0/I0/U8/N0 |
| 29 | `madako` | マダコ | cephalopod_species | - | 0 | あり | 1.3.0 | C4/I0/U4/N0 | C0/I0/U8/N0 |
| 30 | `isaki` | イサキ | exact_species | - | 0 | あり | 1.3.0 | C4/I0/U4/N0 | C0/I0/U8/N0 |
| 31 | `mejina` | メジナ | exact_species | - | 0 | あり | 1.3.0 | C1/I0/U7/N0 | C0/I0/U8/N0 |
| 32 | `tachiuo` | タチウオ | exact_species | - | 0 | あり | 1.3.0 | C2/I0/U6/N0 | C0/I0/U8/N0 |
| 33 | `kawahagi` | カワハギ | exact_species | - | 0 | あり | 1.3.0 | C1/I0/U7/N0 | C0/I0/U8/N0 |
| 34 | `umazurahagi` | ウマヅラハギ | exact_species | - | 0 | あり | 1.3.0 | C4/I0/U4/N0 | C0/I0/U8/N0 |
| 35 | `konoshiro` | コノシロ | exact_species | - | 0 | あり | 1.3.0 | C1/I0/U7/N0 | C0/I0/U8/N0 |
| 36 | `sayori` | サヨリ | exact_species | - | 0 | あり | 1.3.0 | C1/I0/U7/N0 | C0/I0/U8/N0 |
| 37 | `bora` | ボラ | exact_species | - | 0 | あり | 1.3.0 | C1/I0/U7/N0 | C0/I0/U8/N0 |
| 38 | `maanago` | マアナゴ | exact_species | - | 0 | あり | 1.3.0 | C2/I0/U6/N0 | C0/I0/U8/N0 |
| 39 | `ishidai` | イシダイ | exact_species | - | 0 | あり | 1.3.0 | C1/I0/U7/N0 | C0/I0/U8/N0 |
| 40 | `ishigakidai` | イシガキダイ | exact_species | - | 0 | あり | 1.3.0 | C1/I0/U7/N0 | C0/I0/U8/N0 |
| 41 | `maaji` | マアジ | exact_species | `aji` | 0 | あり | 1.2.0 | C2/I0/U6/N0 | C0/I3/U5/N0 |
| 42 | `maruaji` | マルアジ | exact_species | `aji` | 0 | あり | 1.2.0 | C0/I0/U8/N0 | C0/I0/U8/N0 |
| 43 | `masaba` | マサバ | exact_species | `saba` | 0 | あり | 1.3.0 | C5/I0/U3/N0 | C0/I0/U8/N0 |
| 44 | `gomasaba` | ゴマサバ | exact_species | `saba` | 0 | あり | 1.3.0 | C2/I0/U6/N0 | C0/I0/U8/N0 |
| 45 | `maiwashi` | マイワシ | exact_species | `iwashi` | 0 | あり | 1.3.0 | C0/I0/U8/N0 | C0/I0/U8/N0 |
| 46 | `katakuchiiwashi` | カタクチイワシ | exact_species | `iwashi` | 0 | あり | 1.3.0 | C2/I0/U6/N0 | C0/I0/U8/N0 |
| 47 | `urumeiwashi` | ウルメイワシ | exact_species | `iwashi` | 0 | あり | 1.3.0 | C0/I0/U8/N0 | C0/I0/U8/N0 |
| 48 | `mebaru` | メバル | species_group | `rockfish` | 3 | あり | 1.3.0 | C0/I0/U8/N0 | C0/I0/U8/N0 |
| 49 | `akamebaru` | アカメバル | exact_species | `mebaru` | 0 | あり | 1.3.0 | C2/I0/U6/N0 | C0/I0/U8/N0 |
| 50 | `kuromebaru` | クロメバル | exact_species | `mebaru` | 0 | あり | 1.3.0 | C2/I0/U6/N0 | C0/I0/U8/N0 |
| 51 | `shiromebaru` | シロメバル | exact_species | `mebaru` | 0 | あり | 1.3.0 | C3/I0/U5/N0 | C0/I0/U8/N0 |
| 52 | `kamasu` | カマス | species_group | - | 0 | あり | 1.3.0 | C0/I0/U8/N0 | C0/I0/U8/N0 |
| 53 | `karei` | カレイ | species_group | - | 0 | あり | 1.3.0 | C0/I0/U8/N0 | C0/I0/U8/N0 |
| 54 | `megochi` | メゴチ | species_group | - | 0 | あり | 1.3.0 | C0/I0/U8/N0 | C0/I0/U8/N0 |
| 55 | `aigo` | アイゴ | exact_species | - | 0 | あり | 1.3.0 | C5/I0/U3/N0 | C0/I0/U8/N0 |
| 56 | `haze` | ハゼ | species_group | - | 0 | あり | 1.3.0 | C0/I0/U8/N0 | C0/I0/U8/N0 |
| 57 | `hirasuzuki` | ヒラスズキ | exact_species | - | 0 | あり | 1.3.0 | C3/I0/U5/N0 | C0/I0/U8/N0 |
| 58 | `katsuo` | カツオ | exact_species | - | 0 | あり | 1.3.0 | C5/I0/U3/N0 | C0/I0/U8/N0 |
| 59 | `eso` | エソ | species_group | - | 0 | あり | 1.3.0 | C0/I0/U8/N0 | C0/I0/U8/N0 |
| 60 | `kyusen` | キュウセン | exact_species | - | 0 | あり | 1.3.0 | C4/I0/U4/N0 | C0/I0/U8/N0 |
| 61 | `kichinu` | キチヌ | exact_species | - | 0 | あり | 1.3.0 | C4/I0/U4/N0 | C0/I0/U8/N0 |
| 62 | `jindouika` | ジンドウイカ | squid_species | - | 0 | あり | 1.3.0 | C4/I0/U4/N0 | C0/I0/U8/N0 |
| 63 | `mutsu` | ムツ | exact_species | - | 0 | あり | 1.3.0 | C4/I0/U4/N0 | C0/I0/U8/N0 |
| 64 | `datsu` | ダツ | exact_species | - | 0 | あり | 1.3.0 | C3/I0/U5/N0 | C0/I0/U8/N0 |
| 65 | `houbou` | ホウボウ | exact_species | - | 0 | あり | 1.3.0 | C3/I0/U5/N0 | C0/I0/U8/N0 |
| 66 | `yagara` | ヤガラ | species_group | - | 0 | あり | 1.3.0 | C0/I0/U8/N0 | C0/I0/U8/N0 |
| 67 | `yokofuedai` | ヨコフエダイ | exact_species | - | 0 | あり | 1.3.0 | C5/I0/U3/N0 | C0/I0/U8/N0 |
| 68 | `fuedai` | フエダイ | exact_species | - | 0 | あり | 1.3.0 | C2/I0/U6/N0 | C0/I0/U8/N0 |
| 69 | `anago` | アナゴ | species_group | - | 0 | なし | - | - | - |

## 読み方と次工程への注意

- `unknown` は未確認を意味し、不適・0点・非生息を意味しない。
- JSON未作成と、JSON内で明示的に `unknown` とした属性は区別する。
- species_groupは子speciesの生態を自動継承しない。子が0件のgroupは、個別taxon追加候補を別Issueで調査する。
- `regionalCatchability` は一般生態から推測せず、対象地域の陸っぱりに直接結び付く根拠がある場合だけ埋める。
- 本棚卸しはSCORE v2、UI、DB、魚種master、生態値を変更しない。
