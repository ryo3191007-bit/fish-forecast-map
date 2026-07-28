# 魚種master × 生態調査状況 棚卸し

Issue #329 の棚卸し正本。`src/domain/fishing.ts` のactive masterと `data/research/fish-species/*.json` を機械的に突合した結果を記録する。

## 集計

- active master: **80件**
- entityType: `cephalopod_species` 1件 / `exact_species` 61件 / `species_group` 13件 / `squid_species` 5件
- 生態JSONあり: **79件** / なし: **1件**
- schemaVersion: `1.2.0` 1件 / `1.3.0` 11件 / `1.4.0` 67件
- v1.4移行: **67/67 taxon** / 未移行または未調査claimあり: **0 taxon**
- v1.4 researchState（identity 2 + ecology 16 claim）: `not_researched` 0 / `complete` 1205 / `blocked` 1 / `not_applicable` 0
- v1.4 unknownReason: `not_researched` 0 / `source_not_found` 500 / `insufficient_evidence` 45 / `conflicting_evidence` 0 / `scope_mismatch` 332 / `taxonomy_uncertain` 1
- 既存JSON内の `stableGeneral` unknown: **434/632属性 (68.7%)**
  - species_group: **96/96属性 (100.0%)**
  - 個別taxon（species_group以外）: **338/536属性 (63.1%)**
- 既存JSON内の `regionalCatchability` unknown: **632/632属性 (100.0%)**
- JSON未作成を8属性未評価として含めた `stableGeneral` 未解決相当: **442/640属性 (69.1%)**
- `stableGeneral` 8/8 unknown: **26件**
- 子species 0件のspecies_group: **0件**
- active master外の研究JSON: **0件**

### JSON未作成

- アナゴ (`anago`)

### stableGeneral が8/8 unknown

- アジ (`aji`) — species_group
- サバ (`saba`) — species_group
- イワシ (`iwashi`) — species_group
- 青物 (`aomono`) — species_group
- 根魚 (`rockfish`) — species_group
- ヤマトカマス (`yamatokamasu`) — exact_species
- マイワシ (`maiwashi`) — exact_species
- メバル (`mebaru`) — species_group
- アカメバル (`akamebaru`) — exact_species
- クロメバル (`kuromebaru`) — exact_species
- シロメバル (`shiromebaru`) — exact_species
- カマス (`kamasu`) — species_group
- カレイ (`karei`) — species_group
- メゴチ (`megochi`) — species_group
- ハゼ (`haze`) — species_group
- エソ (`eso`) — species_group
- ジンドウイカ (`jindouika`) — squid_species
- ムツ (`mutsu`) — exact_species
- ダツ (`datsu`) — exact_species
- ホウボウ (`houbou`) — exact_species
- ヤガラ (`yagara`) — species_group
- ヨコフエダイ (`yokofuedai`) — exact_species
- フエダイ (`fuedai`) — exact_species
- ネズミゴチ (`nezumigochi`) — exact_species
- ウロハゼ (`urohaze`) — exact_species
- アオヤガラ (`aoyagara`) — exact_species

### v2未調査taxon

なし

### 子speciesが0件のspecies_group

なし

## 全active master一覧

`stable` / `regional` は `C=confirmed / I=inferred / U=unknown / N=not_applicable` の8属性内訳。JSONがない場合は `-`。

| # | speciesId | 表示名 | entityType | parent | 子 | JSON | schema | stable | regional | v1.4 state |
|---:|---|---|---|---|---:|:---:|---|---|---|---|
| 1 | `aji` | アジ | species_group | - | 2 | あり | 1.2.0 | C0/I0/U8/N0 | C0/I0/U8/N0 | - |
| 2 | `saba` | サバ | species_group | - | 2 | あり | 1.3.0 | C0/I0/U8/N0 | C0/I0/U8/N0 | - |
| 3 | `iwashi` | イワシ | species_group | - | 3 | あり | 1.3.0 | C0/I0/U8/N0 | C0/I0/U8/N0 | - |
| 4 | `aomono` | 青物 | species_group | - | 4 | あり | 1.3.0 | C0/I0/U8/N0 | C0/I0/U8/N0 | - |
| 5 | `shiira` | シイラ | exact_species | - | 0 | あり | 1.4.0 | C4/I1/U3/N0 | C0/I0/U8/N0 | NR0/C18/B0/NA0 |
| 6 | `hirame` | ヒラメ | exact_species | - | 0 | あり | 1.4.0 | C5/I1/U2/N0 | C0/I0/U8/N0 | NR0/C18/B0/NA0 |
| 7 | `magochi` | マゴチ | exact_species | - | 0 | あり | 1.4.0 | C5/I0/U3/N0 | C0/I0/U8/N0 | NR0/C18/B0/NA0 |
| 8 | `seabass` | スズキ | exact_species | - | 0 | あり | 1.4.0 | C5/I0/U3/N0 | C0/I0/U8/N0 | NR0/C18/B0/NA0 |
| 9 | `aoriika` | アオリイカ | squid_species | - | 0 | あり | 1.4.0 | C3/I4/U1/N0 | C0/I0/U8/N0 | NR0/C17/B1/NA0 |
| 10 | `kouika` | コウイカ | squid_species | - | 0 | あり | 1.4.0 | C7/I0/U1/N0 | C0/I0/U8/N0 | NR0/C18/B0/NA0 |
| 11 | `chinu` | チヌ | exact_species | - | 0 | あり | 1.4.0 | C5/I0/U3/N0 | C0/I0/U8/N0 | NR0/C18/B0/NA0 |
| 12 | `madai` | 真鯛 | exact_species | - | 0 | あり | 1.4.0 | C6/I0/U2/N0 | C0/I0/U8/N0 | NR0/C18/B0/NA0 |
| 13 | `kisu` | キス | exact_species | - | 0 | あり | 1.4.0 | C5/I0/U3/N0 | C0/I0/U8/N0 | NR0/C18/B0/NA0 |
| 14 | `rockfish` | 根魚 | species_group | - | 9 | あり | 1.3.0 | C0/I0/U8/N0 | C0/I0/U8/N0 | - |
| 15 | `buri` | ブリ | exact_species | `aomono` | 0 | あり | 1.4.0 | C5/I0/U3/N0 | C0/I0/U8/N0 | NR0/C18/B0/NA0 |
| 16 | `hiramasa` | ヒラマサ | exact_species | `aomono` | 0 | あり | 1.4.0 | C2/I0/U6/N0 | C0/I0/U8/N0 | NR0/C18/B0/NA0 |
| 17 | `kanpachi` | カンパチ | exact_species | `aomono` | 0 | あり | 1.4.0 | C4/I0/U4/N0 | C0/I0/U8/N0 | NR0/C18/B0/NA0 |
| 18 | `sawara` | サワラ | exact_species | `aomono` | 0 | あり | 1.4.0 | C5/I0/U3/N0 | C0/I0/U8/N0 | NR0/C18/B0/NA0 |
| 19 | `kasago` | カサゴ | exact_species | `rockfish` | 0 | あり | 1.4.0 | C3/I0/U5/N0 | C0/I0/U8/N0 | NR0/C18/B0/NA0 |
| 20 | `oniokoze` | オニオコゼ | exact_species | `rockfish` | 0 | あり | 1.4.0 | C5/I0/U3/N0 | C0/I0/U8/N0 | NR0/C18/B0/NA0 |
| 21 | `kijihata` | キジハタ | exact_species | `rockfish` | 0 | あり | 1.4.0 | C5/I0/U3/N0 | C0/I0/U8/N0 | NR0/C18/B0/NA0 |
| 22 | `oomonhata` | オオモンハタ | exact_species | `rockfish` | 0 | あり | 1.4.0 | C4/I1/U3/N0 | C0/I0/U8/N0 | NR0/C18/B0/NA0 |
| 23 | `akahata` | アカハタ | exact_species | `rockfish` | 0 | あり | 1.4.0 | C5/I1/U2/N0 | C0/I0/U8/N0 | NR0/C18/B0/NA0 |
| 24 | `mahata` | マハタ | exact_species | `rockfish` | 0 | あり | 1.4.0 | C5/I0/U3/N0 | C0/I0/U8/N0 | NR0/C18/B0/NA0 |
| 25 | `aohata` | アオハタ | exact_species | `rockfish` | 0 | あり | 1.4.0 | C5/I0/U3/N0 | C0/I0/U8/N0 | NR0/C18/B0/NA0 |
| 26 | `kue` | クエ | exact_species | `rockfish` | 0 | あり | 1.4.0 | C3/I0/U5/N0 | C0/I0/U8/N0 | NR0/C18/B0/NA0 |
| 27 | `kensakiika` | ヤリイカ | squid_species | - | 0 | あり | 1.4.0 | C1/I0/U7/N0 | C0/I0/U8/N0 | NR0/C18/B0/NA0 |
| 28 | `surumeika` | スルメイカ | squid_species | - | 0 | あり | 1.4.0 | C3/I0/U5/N0 | C0/I0/U8/N0 | NR0/C18/B0/NA0 |
| 29 | `madako` | マダコ | cephalopod_species | - | 0 | あり | 1.4.0 | C3/I0/U5/N0 | C0/I0/U8/N0 | NR0/C18/B0/NA0 |
| 30 | `isaki` | イサキ | exact_species | - | 0 | あり | 1.4.0 | C5/I0/U3/N0 | C0/I0/U8/N0 | NR0/C18/B0/NA0 |
| 31 | `mejina` | メジナ | exact_species | - | 0 | あり | 1.4.0 | C2/I0/U6/N0 | C0/I0/U8/N0 | NR0/C18/B0/NA0 |
| 32 | `tachiuo` | タチウオ | exact_species | - | 0 | あり | 1.4.0 | C3/I0/U5/N0 | C0/I0/U8/N0 | NR0/C18/B0/NA0 |
| 33 | `kawahagi` | カワハギ | exact_species | - | 0 | あり | 1.4.0 | C1/I0/U7/N0 | C0/I0/U8/N0 | NR0/C18/B0/NA0 |
| 34 | `umazurahagi` | ウマヅラハギ | exact_species | - | 0 | あり | 1.4.0 | C3/I0/U5/N0 | C0/I0/U8/N0 | NR0/C18/B0/NA0 |
| 35 | `konoshiro` | コノシロ | exact_species | - | 0 | あり | 1.4.0 | C3/I0/U5/N0 | C0/I0/U8/N0 | NR0/C18/B0/NA0 |
| 36 | `sayori` | サヨリ | exact_species | - | 0 | あり | 1.4.0 | C2/I0/U6/N0 | C0/I0/U8/N0 | NR0/C18/B0/NA0 |
| 37 | `bora` | ボラ | exact_species | - | 0 | あり | 1.4.0 | C2/I0/U6/N0 | C0/I0/U8/N0 | NR0/C18/B0/NA0 |
| 38 | `maanago` | マアナゴ | exact_species | `anago` | 0 | あり | 1.4.0 | C3/I0/U5/N0 | C0/I0/U8/N0 | NR0/C18/B0/NA0 |
| 39 | `ishidai` | イシダイ | exact_species | - | 0 | あり | 1.4.0 | C3/I0/U5/N0 | C0/I0/U8/N0 | NR0/C18/B0/NA0 |
| 40 | `ishigakidai` | イシガキダイ | exact_species | - | 0 | あり | 1.4.0 | C3/I0/U5/N0 | C0/I0/U8/N0 | NR0/C18/B0/NA0 |
| 41 | `akakamasu` | アカカマス | exact_species | `kamasu` | 0 | あり | 1.4.0 | C3/I0/U5/N0 | C0/I0/U8/N0 | NR0/C18/B0/NA0 |
| 42 | `yamatokamasu` | ヤマトカマス | exact_species | `kamasu` | 0 | あり | 1.4.0 | C0/I0/U8/N0 | C0/I0/U8/N0 | NR0/C18/B0/NA0 |
| 43 | `maaji` | マアジ | exact_species | `aji` | 0 | あり | 1.4.0 | C4/I0/U4/N0 | C0/I0/U8/N0 | NR0/C18/B0/NA0 |
| 44 | `maruaji` | マルアジ | exact_species | `aji` | 0 | あり | 1.4.0 | C3/I0/U5/N0 | C0/I0/U8/N0 | NR0/C18/B0/NA0 |
| 45 | `masaba` | マサバ | exact_species | `saba` | 0 | あり | 1.4.0 | C6/I0/U2/N0 | C0/I0/U8/N0 | NR0/C18/B0/NA0 |
| 46 | `gomasaba` | ゴマサバ | exact_species | `saba` | 0 | あり | 1.4.0 | C2/I0/U6/N0 | C0/I0/U8/N0 | NR0/C18/B0/NA0 |
| 47 | `maiwashi` | マイワシ | exact_species | `iwashi` | 0 | あり | 1.4.0 | C0/I0/U8/N0 | C0/I0/U8/N0 | NR0/C18/B0/NA0 |
| 48 | `katakuchiiwashi` | カタクチイワシ | exact_species | `iwashi` | 0 | あり | 1.4.0 | C4/I0/U4/N0 | C0/I0/U8/N0 | NR0/C18/B0/NA0 |
| 49 | `urumeiwashi` | ウルメイワシ | exact_species | `iwashi` | 0 | あり | 1.4.0 | C1/I0/U7/N0 | C0/I0/U8/N0 | NR0/C18/B0/NA0 |
| 50 | `mebaru` | メバル | species_group | `rockfish` | 3 | あり | 1.3.0 | C0/I0/U8/N0 | C0/I0/U8/N0 | - |
| 51 | `akamebaru` | アカメバル | exact_species | `mebaru` | 0 | あり | 1.4.0 | C0/I0/U8/N0 | C0/I0/U8/N0 | NR0/C18/B0/NA0 |
| 52 | `kuromebaru` | クロメバル | exact_species | `mebaru` | 0 | あり | 1.4.0 | C0/I0/U8/N0 | C0/I0/U8/N0 | NR0/C18/B0/NA0 |
| 53 | `shiromebaru` | シロメバル | exact_species | `mebaru` | 0 | あり | 1.4.0 | C0/I0/U8/N0 | C0/I0/U8/N0 | NR0/C18/B0/NA0 |
| 54 | `kamasu` | カマス | species_group | - | 2 | あり | 1.3.0 | C0/I0/U8/N0 | C0/I0/U8/N0 | - |
| 55 | `karei` | カレイ | species_group | - | 1 | あり | 1.3.0 | C0/I0/U8/N0 | C0/I0/U8/N0 | - |
| 56 | `megochi` | メゴチ | species_group | - | 1 | あり | 1.3.0 | C0/I0/U8/N0 | C0/I0/U8/N0 | - |
| 57 | `aigo` | アイゴ | exact_species | - | 0 | あり | 1.4.0 | C5/I0/U3/N0 | C0/I0/U8/N0 | NR0/C18/B0/NA0 |
| 58 | `haze` | ハゼ | species_group | - | 2 | あり | 1.3.0 | C0/I0/U8/N0 | C0/I0/U8/N0 | - |
| 59 | `hirasuzuki` | ヒラスズキ | exact_species | - | 0 | あり | 1.4.0 | C3/I0/U5/N0 | C0/I0/U8/N0 | NR0/C18/B0/NA0 |
| 60 | `katsuo` | カツオ | exact_species | - | 0 | あり | 1.4.0 | C4/I0/U4/N0 | C0/I0/U8/N0 | NR0/C18/B0/NA0 |
| 61 | `eso` | エソ | species_group | - | 3 | あり | 1.3.0 | C0/I0/U8/N0 | C0/I0/U8/N0 | - |
| 62 | `kyusen` | キュウセン | exact_species | - | 0 | あり | 1.4.0 | C4/I0/U4/N0 | C0/I0/U8/N0 | NR0/C18/B0/NA0 |
| 63 | `kichinu` | キチヌ | exact_species | - | 0 | あり | 1.4.0 | C4/I0/U4/N0 | C0/I0/U8/N0 | NR0/C18/B0/NA0 |
| 64 | `jindouika` | ジンドウイカ | squid_species | - | 0 | あり | 1.4.0 | C0/I0/U8/N0 | C0/I0/U8/N0 | NR0/C18/B0/NA0 |
| 65 | `mutsu` | ムツ | exact_species | - | 0 | あり | 1.4.0 | C0/I0/U8/N0 | C0/I0/U8/N0 | NR0/C18/B0/NA0 |
| 66 | `datsu` | ダツ | exact_species | - | 0 | あり | 1.4.0 | C0/I0/U8/N0 | C0/I0/U8/N0 | NR0/C18/B0/NA0 |
| 67 | `houbou` | ホウボウ | exact_species | - | 0 | あり | 1.4.0 | C0/I0/U8/N0 | C0/I0/U8/N0 | NR0/C18/B0/NA0 |
| 68 | `yagara` | ヤガラ | species_group | - | 2 | あり | 1.3.0 | C0/I0/U8/N0 | C0/I0/U8/N0 | - |
| 69 | `yokofuedai` | ヨコフエダイ | exact_species | - | 0 | あり | 1.4.0 | C0/I0/U8/N0 | C0/I0/U8/N0 | NR0/C18/B0/NA0 |
| 70 | `fuedai` | フエダイ | exact_species | - | 0 | あり | 1.4.0 | C0/I0/U8/N0 | C0/I0/U8/N0 | NR0/C18/B0/NA0 |
| 71 | `anago` | アナゴ | species_group | - | 1 | なし | - | - | - | - |
| 72 | `makogarei` | マコガレイ | exact_species | `karei` | 0 | あり | 1.4.0 | C2/I0/U6/N0 | C0/I0/U8/N0 | NR0/C18/B0/NA0 |
| 73 | `nezumigochi` | ネズミゴチ | exact_species | `megochi` | 0 | あり | 1.4.0 | C0/I0/U8/N0 | C0/I0/U8/N0 | NR0/C18/B0/NA0 |
| 74 | `mahaze` | マハゼ | exact_species | `haze` | 0 | あり | 1.4.0 | C1/I0/U7/N0 | C0/I0/U8/N0 | NR0/C18/B0/NA0 |
| 75 | `urohaze` | ウロハゼ | exact_species | `haze` | 0 | あり | 1.4.0 | C0/I0/U8/N0 | C0/I0/U8/N0 | NR0/C18/B0/NA0 |
| 76 | `maeso` | マエソ | exact_species | `eso` | 0 | あり | 1.4.0 | C3/I0/U5/N0 | C0/I0/U8/N0 | NR0/C18/B0/NA0 |
| 77 | `wanieso` | ワニエソ | exact_species | `eso` | 0 | あり | 1.4.0 | C2/I0/U6/N0 | C0/I0/U8/N0 | NR0/C18/B0/NA0 |
| 78 | `tokageeso` | トカゲエソ | exact_species | `eso` | 0 | あり | 1.4.0 | C3/I0/U5/N0 | C0/I0/U8/N0 | NR0/C18/B0/NA0 |
| 79 | `akayagara` | アカヤガラ | exact_species | `yagara` | 0 | あり | 1.4.0 | C3/I0/U5/N0 | C0/I0/U8/N0 | NR0/C18/B0/NA0 |
| 80 | `aoyagara` | アオヤガラ | exact_species | `yagara` | 0 | あり | 1.4.0 | C0/I0/U8/N0 | C0/I0/U8/N0 | NR0/C18/B0/NA0 |

## 読み方と次工程への注意

- `unknown` は未確認を意味し、不適・0点・非生息を意味しない。
- JSON未作成と、JSON内で明示的に `unknown` とした属性は区別する。
- species_groupは子speciesの生態を自動継承しない。子が0件のgroupは、個別taxon追加候補を別Issueで調査する。
- `regionalCatchability` は一般生態から推測せず、対象地域の陸っぱりに直接結び付く根拠がある場合だけ埋める。
- 本棚卸しはSCORE v2、UI、DB、魚種master、生態値を変更しない。
