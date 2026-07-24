# 魚種生態マスター 属性別本番採否レビュー

確認日: 2026-07-24。詳細なpath別判定、source、地域、confidence、理由、再確認条件は各JSONの`review.attributeDecisions`を正本とする。

現行SCORE v2固定値との具体比較は本資料を唯一の正本とする。各JSONの`review.comparisonWithCurrentImplementation`は固定値を重複保持せず、本資料への参照、対応有無、種・グループ間の継承禁止だけを機械可読に示す。

## アジグループの分離

`aji`は現行魚種マスターで選択可能な`species_group`であり、`maaji`と`maruaji`だけを構成種として列挙する。canonical和名と学名は「根拠待ち」ではなく、単一taxonでないため`reject`とした。未特定の「アジ」は`aji`のままとし、`maaji`のalias、安全な自動解決、個別種値のfallbackにはしない。`maaji`の「アジ」「真鯵」も、前者は曖昧で後者はsourceと採否判断がないためaliasから除外した。

## 4個別魚種の結果

| species | identity / alias | 一般生態 | 対象地域の釣れやすさ | 主な制約 |
|---|---|---|---|---|
| `maaji` | マアジ、`Trachurus japonicus`を採用。aliasは不採用 | 確認済み属性は注意付き採用 | 福岡広域候補も対象全域のSCOREには保留 | 産卵水温・産卵期・一般水深を適水温・釣期・岸釣り水深へ転用しない |
| `maruaji` | マルアジ、`Decapterus maruadsi`を採用。aliasは不採用 | 固有の直接根拠不足で保留 | 全属性を`unknown / hold` | マアジや未特定`aji`の値、source、固定値を継承しない |
| `seabass` | スズキ、`Lateolabrax japonicus`と確認済みaliasを採用 | 河川下流利用と産卵情報は説明限定 | 中国・九州広域の秋・河口・ルアー候補は保留 | 対象地域直接でなく、昼夜・適水温・定量水深も不明 |
| `chinu` | クロダイ、`Acanthopagrus schlegelii`と確認済みaliasを採用 | 内湾・汽水・一般水深・産卵は説明限定 | 九州の単発釣果や民間釣り情報は保留 | 単一点水温や一般水深をレンジ・地点適性へ補完しない |

## 現行SCORE v2固定値との具体比較

以下は`src/domain/scoreV2Production.ts`に存在する値の棚卸しであり、sourceとしての採用でも変更提案でもない。分類は次の4区分を使う。

- **維持可能**: 生態マスターの根拠で維持可能
- **条件付き**: 条件・confidence制限付きで維持可能
- **要見直し**: 根拠不足のため後続Issueで見直しが必要
- **別根拠**: 生態マスターではなく別根拠で管理すべき

### 水温、時間帯、潮

| species | 現行水温区分 → 点数 | 朝 / 昼 / 夕 / 夜 | 上げ潮 / 満潮前後 / 下げ潮 / 干潮前後 | 分類 |
|---|---|---|---|---|
| `maaji`（現行名マアジ） | `<9:20`, `9–<15:40`, `15–<18:60`, `18–<22:80`, `22–26:100`, `>26–28:80`, `>28–30:60`, `>30–32:40`, `>32:20` | `100 / 70 / 100 / 90` | `80 / 70 / 60 / 60` | すべて**要見直し**。産卵水温や一般生態では釣れやすさの区分・配点を維持できない |
| `maruaji` | 現行対応なし | 現行対応なし | 現行対応なし | 現行SCOREの対応種ではない。`aji`またはマアジの固定値を継承しない |
| `seabass`（現行名スズキ） | `<6:20`, `6–<12:40`, `12–<17:60`, `17–<21:80`, `21–27:100`, `>27–<30:80`, `30–<33:40`, `>=33:20` | `90 / 70 / 100 / 90` | `80 / 70 / 70 / 60` | すべて**要見直し**。今回の地域・属性別sourceは各境界と点数を支えない |
| `chinu`（現行名チヌ） | `<10:20`, `10–<15:40`, `15–<20:60`, `20–<23:80`, `23–29:100`, `>29–32:60`, `>32–35:40`, `>35:20` | `90 / 90 / 90 / 70` | `80 / 80 / 70 / 60` | すべて**要見直し**。単発釣果の水温・時刻をレンジや時間帯配点へ一般化できない |

### 釣法別相性

| 釣法 | マアジ | スズキ | チヌ | 採否分類 |
|---|---:|---:|---:|---|
| ジギング | 60 | 80 | `null` | **要見直し** |
| キャスティング | 80 | 100 | 80 | **条件付き**（候補釣法の記述はあるが、点数と対象地域全域への一般化は**要見直し**） |
| コマセ | 100 | `null` | 100 | **条件付き**（同上） |
| 泳がせ | `null` | 100 | `null` | **要見直し** |
| サビキ | 100 | `null` | `null` | **条件付き**（マアジ候補としてのみ。100点の根拠は不足） |
| エギング / その他 | 全種`null` | 全種`null` | 全種`null` | `null`は不適を意味しないため**要見直し**。情報欠損として扱う |

マルアジは表の現行3種に含まれず、未特定`aji`を含めたどの固定値もマアジ・マルアジ間で継承しない。

### 魚種別habitat値

| species | 現行 feature:score | 分類 |
|---|---|---|
| マアジ | `artificial_reef:100, rocky:100, structure:100, open_sea:100, fishing_port:90, breakwater:90, inner_bay:80, good_tidal_flow:80, estuary:60, sand_mud:60, beach:60` | 一般水深等から地点適性へ変換できず、全値**要見直し** |
| スズキ | `estuary:100, brackish:100, river_influence:100, seaweed_bed:100, beach:100, inner_bay:90, fishing_port:90, sand_mud:90, structure:80, open_sea:60, rocky:60` | 河口・汽水候補は**条件付き**、各点数と残りのfeatureは**要見直し** |
| チヌ | `estuary:100, inner_bay:100, tidal_flat:100, sand_mud:100, shell_bottom:100, fishing_port:90, breakwater:90, rocky:80, structure:80, open_sea:60, beach:60` | 内湾・汽水の一般説明は**条件付き**、地点適性への変換と各点数は**要見直し** |
| マルアジ | 現行値なし | 対応種ではなく、他種・`aji`から継承しない |

### 釣法別shape / terrain値

これらは魚種生態ではなく、釣法に対する地点形状・足場・地形の適性であるため、全値を**別根拠**へ分類する。

| 釣法 | shape（現行値） | terrain（現行値） |
|---|---|---|
| ジギング | `breakwater:100, rocky_shore:100, open_sea:100, fishing_port:80, quay:80, beach:80, inner_bay:60, estuary:60` | `open_sea:100, good_tidal_flow:100, rocky:100, structure:100, inner_bay:60, sand:80, estuary:60, river_influence:60` |
| キャスティング | `beach:100, estuary:100, open_sea:100, fishing_port:80, breakwater:80, quay:80, rocky_shore:80, inner_bay:60` | `open_sea:100, good_tidal_flow:100, inner_bay:80, rocky:80, structure:80, sand:100, estuary:100, river_influence:100` |
| コマセ | `fishing_port:100, breakwater:100, quay:100, rocky_shore:80, inner_bay:80, beach:60, estuary:60` | `open_sea:80, good_tidal_flow:80, inner_bay:100, rocky:80, structure:80, sand:60, estuary:80, river_influence:80` |
| 泳がせ | `fishing_port:100, breakwater:100, quay:100, rocky_shore:80, beach:80, inner_bay:80, open_sea:80, estuary:60` | `open_sea:80, good_tidal_flow:80, inner_bay:80, rocky:80, structure:80, sand:80, estuary:80, river_influence:80` |
| サビキ | `fishing_port:100, breakwater:100, quay:100, inner_bay:80, rocky_shore:60` | `open_sea:80, good_tidal_flow:80, inner_bay:100, rocky:60, structure:60, estuary:60, river_influence:60` |
| エギング | `fishing_port:100, breakwater:100, rocky_shore:100, quay:80, inner_bay:80, open_sea:80, beach:60` | `open_sea:80, good_tidal_flow:80, inner_bay:80, rocky:100, structure:100, sand:60, estuary:60, river_influence:60` |

## Schemaと検証方針

全対象JSONとexampleをv1.1.0へ移行済みとし、現行Schemaは`schemaVersion: 1.1.0`だけを受理する。v1.0.0互換を標榜せず、negative v1.0.0 fixtureとpositive v1.1.0 fixtureで方針を固定する。テストはdecision pathの実在・一意性・identity 3属性と全16 ecology属性の完全分類、採用sourceの`supports`対応、acceptedPathsの整合、alias非解決も検証する。

対象地域のマルアジ固有生態、4種の釣れやすい水温・昼夜・潮は未確定である。本IssueではSCORE固定値、計算コード、本番魚種マスター、DB、UIを変更しない。
