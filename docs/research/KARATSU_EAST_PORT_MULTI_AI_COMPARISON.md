# 唐津東港 3AI調査比較

対象Issue: #118 / #121 / #123  
比較対象: ChatGPT / Gemini / Claude  
状態: 3AIの原文取得・構造評価・属性比較を完了

## 1. 比較ルール

- 各AIへ同じ共通プロンプト、同じSchema、同じ代表座標を渡す
- 公式・公的情報だけの一次調査と、民間情報を含む二次調査を分ける
- 出力を人間が修正する前に原文を保存する
- Schemaエラーも品質評価へ含める
- 値の一致数だけでなく、根拠の質と `unknown` の適切さを評価する
- もっとも多く埋めたAIを自動的に高評価しない
- 規制・施設・水深等を弱い根拠で断定した場合は減点する
- 民間source1件の値は原則 `confidence=low`
- 独立した一般source2件以上の一致は、内容に応じて `confidence=medium` を検討する
- Schema適合と、sourceが値を事実として十分に裏付けるかを分けて評価する
- source URL・掲載内容の外部再検証は、原文の内部整合性評価と区別する

共通プロンプト:

```txt
docs/research/KARATSU_EAST_PORT_MULTI_AI_PROMPT.md
```

二次情報源ポリシー:

```txt
docs/FISHING_SPOT_SECONDARY_SOURCE_POLICY.md
```

AI原文とレビュー:

```txt
data/research/fishing-spots/karatsu-east-port.json
data/research/fishing-spots/ai-outputs/karatsu-east-port.gemini.raw.json
data/research/fishing-spots/ai-outputs/karatsu-east-port.claude.raw.json

docs/research/KARATSU_EAST_PORT_GEMINI_REVIEW.md
docs/research/KARATSU_EAST_PORT_CLAUDE_REVIEW.md
```

## 2. 属性比較

| 項目 | ChatGPT | Gemini | Claude | レビュー |
|---|---|---|---|---|
| 座標 | 33.459, 129.993 / inferred / high | 33.459, 129.993 / inferred / low / sourceIdsなし | 33.459, 129.993 / inferred / low | 数値は一致。Claudeは別の地図ピンとの差を明示し、住所sourceだけでは数値を確定できないとした |
| 地点種別 | port, breakwater, revetment / confirmed / high | port / confirmed / high | port / confirmed / high | Gemini・Claudeは港だけを採用。地区内施設を地点属性へ広げなかった |
| 海底 | sand, mud / inferred / low | unknown | unknown | ChatGPTのみ民間情報を低確度推定として採用 |
| 水深 | moderate / inferred / low | unknown | unknown | ChatGPTのみ公式施設値と民間情報から暫定分類 |
| 河川影響 | weak / inferred / low | unknown | unknown | ChatGPTのみ位置関係から低確度推定 |
| 潮通し | unknown | unknown | unknown | 3AI一致。客観的資料不足 |
| 常夜灯 | unknown | unknown | unknown | 3AI一致。夜釣り情報と常夜灯設置を分離 |
| 障害物 | unknown | unknown | unknown | 3AI一致。地区全体を断定できない |
| 外海影響 | bay / inferred / medium | bay / inferred / medium | bay / inferred / medium | 3AIで完全一致。ただし使用sourceは異なる |
| 釣れる範囲 | foot, near / inferred / low | unknown | unknown | ChatGPTのみ実釣情報から低確度推定 |
| 駐車場 | unknown | unknown相当 / availabilityへ統合 | unknown | 利用可能とは断定しない点は一致。ClaudeはSchemaどおり個別化 |
| トイレ | unknown | unknown相当 / availabilityへ統合 | unknown | 同上 |
| 釣り禁止 | partial / confirmed / low | unknown相当 / restrictionへ統合 | partial / confirmed / low | ChatGPT・Claudeが同じ非公式警告を低確度保持 |
| 立入禁止 | unknown | unknown相当 / restrictionへ統合 | unknown | 釣り禁止と分離できたのはChatGPT・Claude |
| 工事・閉鎖 | unknown | unknown相当 / restrictionへ統合 | unknown | 3AIとも閉鎖ありとは断定していない |
| 魚種 | アジ、コノシロ、スズキ、クロダイ / observed / medium | 空配列 | アジ、コノシロ、スズキ、クロダイ / observed / medium | ChatGPT・Claude一致。2source一致を採用 |
| 魚種 | キビレ、シログチ / observed / low | 空配列 | キビレ、イシモチ（シログチ） / observed / low | 実質一致。単独の日付付き釣果をlowで保持 |

## 3. ChatGPT一次調査から二次調査への変化

| 項目 | 一次調査 | 二次調査 | 変更理由 |
|---|---|---|---|
| 海底 | unknown | sand, mud / inferred / low | 民間情報1件を低確度推定として採用 |
| 水深 | unknown | moderate / inferred / low | 公式施設値と民間情報を組み合わせた |
| 河川影響 | unknown | weak / inferred / low | 公的地図上の位置関係を限定的に採用 |
| 釣れる範囲 | unknown | foot, near / inferred / low | 民間情報と実釣記録が一致 |
| 釣り禁止 | unknown | partial / confirmed / low | 非公式の禁止警告を安全側に保持 |
| 魚種 | 空配列 | 6魚種 | 2source一致または日付付き具体釣果に限定 |
| 潮通し | unknown | unknown | 根拠不足 |
| 常夜灯 | unknown | unknown | 夜釣り情報だけでは不十分 |
| 障害物 | unknown | unknown | 地区全体を分類できない |
| 駐車場・トイレ | unknown | unknown | 釣り目的の利用可否を確認できない |
| 立入・工事 | unknown | unknown | 現行範囲を確認できない |

Claudeも二次調査を実施しましたが、海底・水深・河川影響・釣れる範囲は推定せずunknownを維持しました。

## 4. 構造・根拠比較

| 指標 | ChatGPT | Gemini | Claude |
|---|---:|---:|---:|
| JSON構文 | 適合 | 適合 | 適合 |
| Schema適合 | 適合 | 不適合 | 適合・自動検証対象 |
| ルート必須項目 | 充足 | 9項目欠落 | 充足 |
| identity / attributes階層 | あり | なし・ルートへ平坦化 | あり |
| facilities / restrictions分離 | あり | availability / restrictionへ統合 | あり |
| source数 | 7 | 4 | 12 |
| 公式・港湾管理source数 | 5 | 4 | 3 |
| 民間・報道等source数 | 2 | 0 | 9 |
| source必須項目 | 充足 | publisher / sourceType / checkedAt欠落 | 充足 |
| source ID形式 | `src-...` | `source_...`で不適合 | `src-...` |
| supports形式 | 完全な属性パス | 短縮名で不適合 | 完全な属性パス |
| observed魚種数 | 6 | 0 | 6 |
| low confidence魚種数 | 2 | 0 | 2 |
| 推測で「規制なし」にした項目 | 0 | 0 | 0 |
| 二次調査 | 実施 | 未実施と判断 | 実施 |
| レビュー状態 | draft | reviewStatus欠落 | draft |
| source内容の外部再検証 | 調査時確認 | 未実施 | 今回の比較Issueでは未実施 |

source数は多いほど良いとは限りません。Claudeの座標sourceには、住所を示すだけで緯度経度数値を直接掲載しないsourceが含まれます。

## 5. AI別評価

### 5.1 ChatGPT

良かった点:

- Schema適合
- 公式一次調査と民間二次調査を分離
- 物理属性をlow confidence推定として補完
- 規制・魚種を根拠強度に応じて分類

注意点:

- Claudeが座標の別候補を提示したため、座標のhigh confidenceは再確認候補
- 海底・水深・河川影響・釣れる範囲は、lowとはいえ推定範囲がClaudeより広い
- `port / breakwater / revetment` が地区全体か具体釣り地点かを分けられていない

### 5.2 Gemini

良かった点:

- JSON以外の説明を付けなかった
- 根拠不足項目を無理に埋めなかった
- `unknown` をlow confidenceで統一
- 魚種や規制を過剰に断定しなかった

主な問題:

- 指定Schemaのルート構造を使用していない
- identity、attributes、facilities、restrictionsの階層がない
- sourceの必須項目とIDパターンを満たしていない
- supportsが完全な属性パスではない
- inferred座標にsourceIdsがない
- 二次調査を実施していない

詳細:

```txt
docs/research/KARATSU_EAST_PORT_GEMINI_REVIEW.md
```

### 5.3 Claude

良かった点:

- Schemaの階層・型・source形式を遵守
- 一次・二次調査を両方実施
- ChatGPTと同じ6魚種・規制警告を独立に取得
- 根拠不足の物理属性をunknownで維持
- 座標の不一致可能性を自ら明示しlow confidenceとした
- reviewStatusをdraftで維持

注意点:

- Schemaに通るsourceIdsでも、数値座標を直接裏付けないsourceがある
- unknown項目のsourceIdsには「値を支えるsource」と「確認したが結論が出なかったsource」が混在
- source URL・publishedAt・ページ内容の真偽は本Issueで独立再検証していない
- source数が多く、重要sourceと補助sourceの区別が読み取りにくい

詳細:

```txt
docs/research/KARATSU_EAST_PORT_CLAUDE_REVIEW.md
```

## 6. 総合比較

| 評価軸 | 最も良かったAI | 理由 |
|---|---|---|
| Schema遵守 | Claude / ChatGPT | 両方とも正本Schemaに適合。Claudeは未修正原文で階層を正確に再現 |
| unknownの慎重さ | Claude / Gemini | 根拠不足の物理属性をほぼ埋めなかった |
| 属性の充実度 | ChatGPT | low confidence推定を明示して情報量を増やした |
| 二次調査の実施 | ChatGPT / Claude | 民間sourceを限定利用し、6魚種と規制警告を取得 |
| source記録の詳細さ | Claude | 12sourceにpublisher・type・supports・noteを付与 |
| そのまま再利用しやすい原文 | Claude | Schema遵守と二次調査を両立 |
| 過剰推定の少なさ | Claude / Gemini | 不明値を維持 |

単純な総合順位は付けません。

- ChatGPTは情報量が多い一方、低確度推定が広い
- Geminiは慎重だが、構造不適合で再利用しにくい
- Claudeは構造と慎重さのバランスが良いが、sourceの直接性は別途確認が必要

アプリ投入用の正本値を決める場合は、3AIの多数決ではなく、各属性のsourceを再確認して人間が承認します。

## 7. 3AI比較で判明した設計課題

### 7.1 地点の対象範囲

同じ「唐津東港」でも、次が混在します。

- 港湾地区全体
- フェリー岸壁・ターミナル
- 防波堤・護岸
- 実際に釣りが行われる具体地点

必要候補:

```txt
scopeType: district / facility / access_point
```

### 7.2 sourceの役割

現在の `sourceIds` と `supports` では、次を区別できません。

- 値を直接裏付けるsource
- 調査したが結論に使えなかったsource
- 値と矛盾するsource

必要候補:

```txt
supportingSourceIds
checkedSourceIds
evidenceRole: supports / checked_only / contradicts
```

### 7.3 座標の取得方法

住所・地区名が一致していても、代表座標の数値が正しいとは限りません。

必要候補:

```txt
coordinateMethod: official_coordinate / map_measurement / address_geocode / supplied_reference
coordinateScope: district / facility / access_point
```

### 7.4 source独立性

2サイトに同じ魚種が掲載されても、一方が他方を転載している可能性があります。

必要候補:

- source運営元
- 原情報の出所
- 他sourceとの依存関係
- 独立確認済みフラグ

### 7.5 時間情報

規制・施設・魚種は更新されやすいため、次の構造化が必要です。

- 魚種の観測日または観測期間
- 規制の発効日・終了日・公式確認状態
- 施設の利用条件確認日
- sourceの公開日と最終更新日

## 8. プロンプト改善候補

- Schema本文または完全な階層例を添付する
- 配列型属性とsource IDパターンを再掲する
- 一次・二次調査の完了状態を出力へ含める
- sourceが値を直接支えるか、確認しただけかを明示させる
- 座標の取得方法と対象範囲を必須化する
- source URL・publishedAtを推測で埋めないよう明示する
- 調査後にSchema自己検証結果を出力させる

これらは別IssueでSchema・共通プロンプトの改訂候補として整理します。
