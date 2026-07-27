# species_group 構造見直し・個別魚種候補調査

確認日: 2026-07-27

Issue #331 の調査正本。`src/domain/fishing.ts` の active `species_group` 13件について、現在の親子構造を評価し、糸島西岸〜唐津湾〜伊万里湾〜平戸方面で扱う必要性がある個別species候補を整理する。

## 1. 結論

- `species_group` 自体は削除しない。ユーザー入力・過去情報が「アジ」「カレイ」「ハゼ」「エソ」「アナゴ」等の粒度しか持たない場合、その不確実性を維持するためにgroupが必要である。
- groupの生態を子speciesから自動継承しない。groupの `stableGeneral` / `regionalCatchability` は、groupそのものを直接説明できる根拠がない限り `unknown` のままとする。
- 既に子speciesがある `aji / saba / iwashi / aomono / rockfish / mebaru` は、現行構造を維持する。
- 子species 0件の7groupはすべてgroupを維持し、次のmaster変更候補を検討する。
  - `kamasu`: 既存inactiveのアカカマス・ヤマトカマスを子speciesとして再利用する。
  - `karei`: マコガレイを追加候補とする。
  - `megochi`: ネズミゴチを追加候補とする。標準和名メゴチはgroup表示名との衝突と通称混同があるため保留する。
  - `haze`: マハゼ・ウロハゼを追加候補とする。
  - `eso`: マエソ・ワニエソ・トカゲエソを追加候補とする。
  - `yagara`: アカヤガラ・アオヤガラを追加候補とする。
  - `anago`: 既存マアナゴを `anago` 配下へ付け替える候補とする。ダイナンアナゴ・クロアナゴは今回は保留する。
- 上記の追加候補は「対象52地点の岸から釣れる」「SCOREに使える」を意味しない。ここではmaster粒度の候補だけを扱う。

## 2. 13 group 全件評価

| group | 現在のactive子species | 評価 | 提案 |
|---|---:|---|---|
| `aji` アジ | 2 | 維持 | マアジ・マルアジを子として維持。genericな「アジ」を特定speciesへ自動解決しない |
| `saba` サバ | 2 | 維持 | マサバ・ゴマサバを子として維持 |
| `iwashi` イワシ | 3 | 維持 | マイワシ・カタクチイワシ・ウルメイワシを子として維持 |
| `aomono` 青物 | 4 | 維持 | ブリ・ヒラマサ・カンパチ・サワラを持つアプリ上の意味カテゴリとして維持。taxon扱いしない |
| `rockfish` 根魚 | 9 | 維持 | アプリ上の意味カテゴリとして維持。メバルgroupを含む階層も維持 |
| `mebaru` メバル | 3 | 維持 | アカメバル・クロメバル・シロメバルを子として維持。genericな「メバル」も保持 |
| `kamasu` カマス | 0 | 要改善 | 既存inactiveのアカカマス・ヤマトカマスをexact childとして再利用検討 |
| `karei` カレイ | 0 | 要改善 | マコガレイ追加。その他カレイ類は直接根拠を追加確認するまで保留 |
| `megochi` メゴチ | 0 | 要改善 | ネズミゴチ追加。groupは釣り・地方名としての「メゴチ」を受ける意味groupとして維持 |
| `haze` ハゼ | 0 | 要改善 | マハゼ・ウロハゼ追加 |
| `eso` エソ | 0 | 要改善 | マエソ・ワニエソ・トカゲエソ追加 |
| `yagara` ヤガラ | 0 | 要改善 | アカヤガラ・アオヤガラ追加 |
| `anago` アナゴ | 0 | 要改善 | 既存マアナゴを子に付け替え。大型クロアナゴ属は保留 |

## 3. 次master変更の優先候補

### 3.1 カマス `kamasu`

**提案: group維持 + 既存2speciesを子として再利用。**

| 標準和名 | 学名 | 現在 | 提案 |
|---|---|---|---|
| アカカマス | `Sphyraena pinguis` | `akakamasu` がinactive、parent=`kamasu` | exact childとして利用可能な状態へ戻すことを検討 |
| ヤマトカマス | `Sphyraena japonica` | `yamatokamasu` がinactive、parent=`kamasu` | exact childとして利用可能な状態へ戻すことを検討 |

福岡市漁業協同組合はアカカマスの漁獲が多い漁港として船越・岐志新町等を挙げ、玄海ではヤマトカマスも獲れると明記している。じざかなび福岡も筑前海のアカカマスと、類似するヤマトカマスの漁獲を記載している。分類はBISMaLで両種を確認した。

ただし既存migrationでは、通常UI選択を `kamasu` groupへ集約する目的で両exact IDをinactive / non-selectable化した履歴がある。次Issueでは「生態研究用のexact childを有効化すること」と「UIで個別種を選べるようにすること」を別判断にする。

### 3.2 カレイ `karei`

**提案: group維持 + マコガレイ追加。**

| 標準和名 | 学名 | 提案 | 根拠 |
|---|---|---|---|
| マコガレイ | `Pseudopleuronectes yokohamae` | 追加候補 | 福岡市漁協が玄海のマコガレイを明示し、加布里・福吉等を漁獲の多い漁港として掲載 |
| イシガレイ | `Kareius bicoloratus` | 保留 | 福岡県資料では確認できるが、今回確認した具体記述は主に豊前海側 |
| メイタガレイ | `Pleuronichthys cornutus` | 保留 | 同上。対象西岸での採用根拠を追加確認してから判断 |

福岡市漁協は「玄海にはこのマコガレイ他数種のカレイが多く獲れている」とするため、genericな `karei` は残す必要がある。一方、現時点で種名まで対象西岸へ直接結び付けられたものとしてマコガレイを先行候補にする。

### 3.3 メゴチ `megochi`

**提案: groupを意味groupとして維持 + ネズミゴチ追加。**

| 標準和名 | 学名 | 提案 | 注意 |
|---|---|---|---|
| ネズミゴチ | `Repomucenus curvicornis` | 追加候補 | じざかなび福岡が筑前海での漁獲と地方名「めごち」を明記 |
| メゴチ（標準和名） | `Suggrundus meerdervoortii` | 保留 | 生物学上の別種として存在するが、group表示名「メゴチ」とcanonical名が衝突し、釣り用語ではネズッポ類の混称としても使われる |

このgroupはtaxonomic groupではなく、**釣り・地方名としての「メゴチ」**を保持するための意味groupと解釈するのが安全である。福岡の公的地魚情報ではネズミゴチの地方名に「めごち」が含まれる。Hondaの釣魚図鑑でも釣り人向けの「メゴチ」をネズミゴチ、トビヌメリ、ハタタテヌメリ等の複数種の混称として扱っている。

標準和名メゴチ `Suggrundus meerdervoortii` 自体も実在し、FishBaseは日本でのcommon nameに Megochi を掲載するが、現行groupと同名canonicalを同時に持たせるUI・resolver設計を先に決める必要があるため今回は追加確定にしない。

### 3.4 ハゼ `haze`

**提案: group維持 + マハゼ・ウロハゼ追加。**

| 標準和名 | 学名 | 提案 | 根拠 |
|---|---|---|---|
| マハゼ | `Acanthogobius flavimanus` | 追加候補 | 福岡県「福岡生きものステーション」が県内の身近な釣り対象魚として掲載 |
| ウロハゼ | `Glossogobius olivaceus` | 追加候補 | 福岡県の唐津湾水域調査資料で生息魚として明記 |

唐津湾水域の公的資料にはヒモハゼ、シモフリシマハゼ、アシシロハゼ、ヒメハゼ等も掲載される。しかし「対象海域に存在する」だけで釣果アプリのmasterへ全て追加すると過剰になるため、今回の初期候補は釣り対象として一般性があるマハゼと、唐津湾で直接確認されたウロハゼに限定する。

### 3.5 エソ `eso`

**提案: group維持 + 3species追加。**

| 標準和名 | 学名 | 提案 | 根拠 |
|---|---|---|---|
| マエソ | `Saurida macrolepis` | 追加候補 | 福岡市漁協が玄海の主要魚として船越・岐志新町・福吉・野北等を明記 |
| ワニエソ | `Saurida wanieso` | 追加候補 | 同ページでマエソと混獲される種として明記 |
| トカゲエソ | `Saurida elongata` | 追加候補 | 同ページでマエソと混獲される種として明記 |

「エソ」は対象地点の過去魚種入力でspecies未特定のまま現れるためgroupを維持する。福岡市漁協の資料は対象エリアと重なる複数漁港を具体的に挙げており、3種とも今回の他候補より地域根拠が強い。

### 3.6 ヤガラ `yagara`

**提案: group維持 + アカヤガラ・アオヤガラ追加。**

| 標準和名 | 学名 | 提案 | 根拠 |
|---|---|---|---|
| アカヤガラ | `Fistularia petimba` | 追加候補 | 豊洲市場公式で長崎県壱岐産を確認。玄界灘の釣り記事でも確認できる |
| アオヤガラ | `Fistularia commersonii` | 追加候補 | 長崎西岸域の魚類群集を扱う査読研究で出現を確認 |

BISMaLでは日本産のヤガラ属として両種を確認できる。対象履歴にはgenericな「ヤガラ」があるためgroupは残し、同定できた場合だけexact speciesを利用する。

アカヤガラの地域根拠には壱岐産・玄界灘の資料があるが、これを52地点の陸っぱり釣れやすさへ読み替えない。アオヤガラも長崎西岸の生物学的出現根拠であり、岸釣り成功率を意味しない。

### 3.7 アナゴ `anago`

**提案: group維持 + 既存マアナゴを子へ付け替え。大型クロアナゴ属は保留。**

| 標準和名 | 学名 | 現在/提案 | 根拠・注意 |
|---|---|---|---|
| マアナゴ | `Conger myriaster` | 既存 `maanago` の parentを `anago` へ付け替え候補 | 福岡市漁協が加布里等を含む玄海沿岸の漁獲を明記。地方名も「アナゴ」 |
| ダイナンアナゴ | `Conger erebennus` | 保留候補 | 公的資料で分布が「相模湾〜博多、釜山」または「博多湾〜プサン」。地域関係はあるが、対象52地点のmasterへ追加する実用性は追加確認が必要 |
| クロアナゴ | `Conger jordani` 等 | 保留 | 名称・学名の整理を先に行う。BISMaLは旧 `Conger japonicus` クロアナゴを `Conger myriaster` のsynonymとして扱う一方、鶴岡市立加茂水族館はクロアナゴを `Conger jordani` として掲載 |

genericな「アナゴ」をマアナゴへalias解決すると、speciesまで同定されていない過去情報を過剰に確定するため、`anago` groupは残す。既存 `maanago` を子に付けるだけでも、現状の「groupに子が0件」という構造不整合は解消できる。

## 4. 次Issueへ渡す候補

### 優先候補

次のmaster変更Issueでは、まず以下を検討する。

1. `kamasu`
   - 既存 `akakamasu` / `yamatokamasu` をexact childとして利用可能にする。
   - ただし通常UIで個別選択を復活させるかは別判断。group-firstの入力方針を維持可能な設計にする。
2. `karei`
   - マコガレイを追加。
3. `megochi`
   - ネズミゴチを追加。
4. `haze`
   - マハゼ、ウロハゼを追加。
5. `eso`
   - マエソ、ワニエソ、トカゲエソを追加。
6. `yagara`
   - アカヤガラ、アオヤガラを追加。
7. `anago`
   - 既存マアナゴの `parentGroupId` を `anago` に設定。

この案では、新規exact speciesは **9件**、既存inactive exactの再利用が **2件**、既存マアナゴのparent変更が **1件**となる。

### 保留候補

- カレイ: イシガレイ、メイタガレイ — 今回確認した具体的な福岡県記述は豊前海側が中心。
- メゴチ: 標準和名メゴチ `Suggrundus meerdervoortii` — groupと同名でresolver/UI衝突の設計課題がある。
- ハゼ: 唐津湾で確認されたその他小型ハゼ類 — 存在確認だけで釣り対象masterを肥大化させない。
- アナゴ: ダイナンアナゴ — 博多までの分布根拠はあるが、対象spot用masterとしての優先度を追加確認する。
- アナゴ: クロアナゴ — taxonomy/name mappingを別途解決してから判断する。

## 5. 実装時の設計条件

- generic labelをexact speciesへ自動昇格しない。
  - `カマス` → アカカマス、`アナゴ` → マアナゴ、`メゴチ` → ネズミゴチ等の自動変換は禁止。
- exact speciesが判明している入力だけexact IDへ解決する。
- groupに子speciesの生態を合成・平均・代表値として入れない。
- `parentGroupId` は分類学上の親子だけでなく、`aomono` / `rockfish` / `megochi` のようなアプリ上の意味groupを含む。taxonomic rankとは別概念として扱う。
- master追加と生態研究を同一Issueで行わない。master確定後にexact speciesごとの生態JSONを別タスクで調査する。
- master追加だけでSCORE v2対応魚種にしない。
- remote Supabase既存データを勝手に変更しない。repository migrationとremote適用は分離する。

## 6. 主なsource

### 福岡・玄海・唐津湾

- 福岡市漁業協同組合「底魚」
  - https://fukuokashigyokyo.com/season/soko.html
  - アカカマス / ヤマトカマス、マアナゴ、マエソ / ワニエソ / トカゲエソ、マコガレイを玄海・具体漁港と結び付けて確認。
- じざかなび福岡「アカカマス」
  - https://jizakanavi-fukuoka.jp/library/fish/c97413db88016e05fca3107d5f21a4129ceafd59.html
- じざかなび福岡「ネズミゴチ」
  - https://jizakanavi-fukuoka.jp/library/fish/55555cc9cf53e1cd0887fa23593976259127f285.html
- じざかなび福岡「マコガレイ」
  - https://jizakanavi-fukuoka.jp/library/fish/58f1835e2c0212479a466096241b832ea46921fa.html
- じざかなび福岡「マアナゴ」
  - https://jizakanavi-fukuoka.jp/library/fish/3c44ab32ee474422c192592ccc53ef792e87cd6d.html
- 福岡県 生物多様性情報総合プラットフォーム「マハゼ」
  - https://biodiversity.pref.fukuoka.lg.jp/futsushu/what/whatanimals/mahaze.html
- 福岡県「水生生物の保全に係る水質環境基準の類型指定について」
  - https://www.pref.fukuoka.lg.jp/uploaded/life/768223_62472439_misc.pdf
  - 唐津湾水域の調査でウロハゼ等を確認。

### 長崎・ヤガラ

- 豊洲市場公式「アカヤガラ」
  - https://www.toyosu-market.or.jp/2022/10/28/6445/
  - 長崎県壱岐産を確認。
- 日本魚類学会「長崎西岸域の春藻場の魚類群集」
  - https://www.jstage.jst.go.jp/article/jji/64/2/64_64-145/_pdf/-char/ja
  - 長崎西岸でアオヤガラを確認。

### アナゴ類

- 東京都島しょ農林水産総合センター「珍魚採集報告第116号 ダイナンアナゴ」
  - https://www.ifarc.metro.tokyo.lg.jp/archive/27%2C15176%2C55%2C228.html
- 東京都島しょ農林水産総合センター「珍魚採集報告第139号 ダイナンアナゴ」
  - https://www.ifarc.metro.tokyo.lg.jp/archive/27%2C15248%2C55%2C228.html
- 鶴岡市立加茂水族館「クロアナゴ」
  - https://kamo-kurage.jp/shonaizukan/kuroanago/

### 分類確認: JAMSTEC BISMaL

- アカカマス `Sphyraena pinguis`: https://www.godac.jamstec.go.jp/bismal/j/view/9014525
- ヤマトカマス `Sphyraena japonica`: https://www.godac.jamstec.go.jp/bismal/j/view/9014527
- マコガレイ `Pseudopleuronectes yokohamae`: https://www.godac.jamstec.go.jp/bismal/j/view/9023763
- ネズミゴチ `Repomucenus curvicornis`: https://www.godac.jamstec.go.jp/bismal/j/view/9032753
- マハゼ `Acanthogobius flavimanus`: https://www.godac.jamstec.go.jp/bismal/j/view/9015740
- ウロハゼ `Glossogobius olivaceus`: https://www.godac.jamstec.go.jp/bismal/j/view/9015724
- マエソ `Saurida macrolepis`: https://www.godac.jamstec.go.jp/bismal/j/view/9016475
- ワニエソ `Saurida wanieso`: https://www.godac.jamstec.go.jp/bismal/j/view/9002213
- トカゲエソ `Saurida elongata`: https://www.godac.jamstec.go.jp/bismal/j/view/9002212
- アカヤガラ `Fistularia petimba`: https://www.godac.jamstec.go.jp/bismal/j/view/9003219
- アオヤガラ `Fistularia commersonii`: https://www.godac.jamstec.go.jp/bismal/j/view/9003220
- 旧 `Conger japonicus` クロアナゴの扱い: https://www.godac.jamstec.go.jp/bismal/j/view/9002021

### メゴチ名称の補助確認

- Honda釣り倶楽部「メゴチ」
  - https://www.honda.co.jp/fishing/picture-book/megochi/
  - 釣魚名「メゴチ」を複数のネズッポ科魚類の混称として説明。
- FishBase `Suggrundus meerdervoortii`
  - https://www.fishbase.se/summary/Suggrundus-meerdervoortii
  - 標準和名メゴチに対応する別taxonの存在確認に利用。

## 7. 非スコープ

本調査は構造案だけを確定する。以下は変更しない。

- `src/domain/fishing.ts`
- aliases / resolver
- 生態JSON
- SCORE v2
- 地点 `target_species` / `historical_target_species`
- UI
- Supabase / migration / remote data
- RLS / Auth
