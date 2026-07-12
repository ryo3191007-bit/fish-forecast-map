# 唐津東港 3AI調査比較

対象Issue: #118 / #121  
比較対象: ChatGPT / Gemini / Claude  
状態: ChatGPT二次調査・Gemini原文評価まで記録済み

## 1. 比較ルール

- 各AIへ同じプロンプト、同じSchema、同じ代表座標を渡す
- 公式・公的情報だけの一次調査と、民間情報を含む二次調査を分ける
- 出力を人間が修正する前に原本を保存する
- Schemaエラーも品質評価へ含める
- 値の一致数だけでなく、根拠の質と `unknown` の適切さを評価する
- もっとも多く埋めたAIを自動的に高評価しない
- 規制・施設・水深等を弱い根拠で断定した場合は減点する
- 民間source1件の値は原則 `confidence=low`
- 独立した一般source2件以上の一致は、内容に応じて `confidence=medium` を検討する
- Schemaに合わせて人間が修正した値ではなく、AI原文を評価する

共通プロンプト:

```txt
docs/research/KARATSU_EAST_PORT_MULTI_AI_PROMPT.md
```

二次情報源ポリシー:

```txt
docs/FISHING_SPOT_SECONDARY_SOURCE_POLICY.md
```

Gemini原文とレビュー:

```txt
data/research/fishing-spots/ai-outputs/karatsu-east-port.gemini.raw.json
docs/research/KARATSU_EAST_PORT_GEMINI_REVIEW.md
```

## 2. 属性比較

| 項目 | ChatGPT | Gemini | Claude | レビュー |
|---|---|---|---|---|
| 座標 | 33.459, 129.993 / inferred / high | 33.459, 129.993 / inferred / low / sourceIdsなし | 未実施 | 値は一致。Geminiは座標を分割し、根拠を結び付けていない |
| 地点種別 | port, breakwater, revetment / confirmed / high | port / confirmed / high | 未実施 | Geminiは港として確認したが、複数値Schemaを使わず粒度が低い |
| 海底 | sand, mud / inferred / low | unknown | 未実施 | Geminiは公式調査のみで慎重にunknownを維持 |
| 水深 | moderate / inferred / low | unknown | 未実施 | Geminiは複数施設水深を釣り位置へ丸めていない |
| 河川影響 | weak / inferred / low | unknown | 未実施 | Geminiは位置関係からも判定しなかった |
| 潮通し | unknown | unknown | 未実施 | 一致。客観的根拠不足 |
| 常夜灯 | unknown | unknown | 未実施 | 一致。港湾照明を常夜灯とみなしていない |
| 障害物 | unknown | unknown | 未実施 | 一致。ただしGeminiは文字列でSchema型不適合 |
| 外海影響 | bay / inferred / medium | bay / inferred / medium | 未実施 | 値・status・confidenceが一致 |
| 釣れる範囲 | foot, near / inferred / low | unknown | 未実施 | Geminiは二次情報を使用せずunknown |
| 駐車場 | unknown | unknown相当 / availabilityへ統合 | 未実施 | Geminiは駐車場とトイレを分離していない |
| トイレ | unknown | unknown相当 / availabilityへ統合 | 未実施 | 個別比較不能 |
| 釣り禁止 | partial / confirmed / low | unknown相当 / restrictionへ統合 | 未実施 | Geminiは民間の警告情報を取得していない |
| 立入禁止 | unknown | unknown相当 / restrictionへ統合 | 未実施 | 釣り禁止との分離ができていない |
| 工事・閉鎖 | unknown | unknown相当 / restrictionへ統合 | 未実施 | 個別比較不能 |
| 魚種 | アジ、コノシロ、スズキ、クロダイ / observed / medium | 空配列 | 未実施 | Geminiは公式情報だけで魚種を追加していない |
| 魚種 | キビレ、シログチ / observed / low | 空配列 | 未実施 | 過剰登録はないが二次調査は未実施 |

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

## 4. 構造・根拠比較

| 指標 | ChatGPT | Gemini | Claude |
|---|---:|---:|---:|
| JSON構文 | 適合 | 適合 | 未実施 |
| Schema適合 | 適合・自動検証対象 | 不適合 | 未実施 |
| ルート必須項目 | 充足 | 9項目欠落 | 未実施 |
| identity / attributes階層 | あり | なし・ルートへ平坦化 | 未実施 |
| facilities / restrictions分離 | あり | availability / restrictionへ統合 | 未実施 |
| source数 | 7 | 4 | 未実施 |
| 公式・公的source数 | 5 | 4 | 未実施 |
| 民間source数 | 2 | 0 | 未実施 |
| source必須項目 | 充足 | publisher / sourceType / checkedAt欠落 | 未実施 |
| source ID形式 | `src-...` | `source_...`で不適合 | 未実施 |
| supports形式 | 完全な属性パス | 短縮名で不適合 | 未実施 |
| observed魚種数 | 6 | 0 | 未実施 |
| low confidence魚種数 | 2 | 0 | 未実施 |
| 推測で「規制なし」にした項目 | 0 | 0 | 未実施 |
| unknown維持項目 | 潮通し、常夜灯、障害物、施設、立入、工事 | 海底、水深、河川、潮通し、常夜灯、障害物、範囲、施設、規制、魚種 | 未実施 |
| 二次調査 | 実施 | 未実施と判断 | 未実施 |
| レビュー状態 | draft | reviewStatus欠落 | 未実施 |

## 5. Gemini評価

### 5.1 良かった点

- JSON以外の説明を付けなかった
- 根拠不足項目を無理に埋めなかった
- `unknown` をlow confidenceで統一した
- 外海影響は公的地図を使い、ChatGPTと同じ判定になった
- 魚種や規制を公式情報なしに断定しなかった
- 民間サイトの文章や魚種一覧を持ち込まなかった

### 5.2 主な問題

- 指定Schemaのルート構造を使用していない
- identity、attributes、facilities、restrictionsの階層がない
- 配列型属性を文字列で出力した
- sourceの必須項目とIDパターンを満たしていない
- supportsがSchema上の完全な属性パスではない
- inferred座標にsourceIdsがない
- 共通プロンプトで求めた二次調査を実施していない

詳細:

```txt
docs/research/KARATSU_EAST_PORT_GEMINI_REVIEW.md
```

## 6. レビュー観点

### 6.1 重大な問題

次があれば再調査対象です。

- 民間釣りサイトの文章・魚種一覧・地図ピンを実質的に転記
- 同一運営元の転載を複数sourceとして数える
- 港湾施設の存在から、立入可能・釣り可能と断定
- 公式情報が見つからないことを「禁止なし」と判定
- 港湾照明や標識灯を常夜灯として断定
- 複数の施設水深から、釣り位置の水深を高確度で断定
- 出典URLが属性を実際には支えていない
- `confirmed` を公式確定の意味で使用
- 不明項目をもっともらしい値で補完
- 民間source1件の値をmedium以上へ引き上げる
- 魚種一覧を丸ごとobservedへ登録
- 指定Schemaを使わず独自構造へ置き換える

### 6.2 判定差が出たとき

1. sourceの信頼度を比較する
2. sourceが同じ対象範囲を指すか確認する
3. source同士が独立しているか確認する
4. 地区全体と具体施設を混同していないか確認する
5. 情報の公開日・確認日を比較する
6. 公式情報と矛盾する民間情報は採用しない
7. Schema不適合の場合は値の比較と構造品質を分ける
8. それでも決められなければ `unknown` を採用する

## 7. Post-MVP-039仕様へのフィードバック候補

ChatGPT二次調査とGemini評価では、次の追加概念・改善が有用と考えられました。

- `scopeType`: district / facility / access_point
- 数値水深レンジと分類値の分離
- 施設の存在と釣り目的利用可否の分離
- sourceの独立性を記録する項目
- 規制情報の公式確認状態
- 魚種の観測日または観測期間
- AI依頼時にSchema本文または完全な階層例を添付する
- 配列型属性とsource IDパターンをプロンプトで再掲する
- 一次・二次調査の完了状態を明示させる

Claudeの原文評価後に共通して必要と判断されたものだけを、別IssueでSchema・プロンプト変更候補にします。
