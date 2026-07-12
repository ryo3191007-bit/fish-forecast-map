# 唐津東港 Claude調査結果レビュー

対象Issue: #123  
受領日: 2026-07-13 JST  
Claude出力内の確認日: 2026-07-13  
評価対象: 人間が修正していない原文JSON

## 1. 原文

```txt
data/research/fishing-spots/ai-outputs/karatsu-east-port.claude.raw.json
```

原文はJSONとして構文解析でき、`docs/schemas/fishing-spot-research.schema.json` の階層・必須項目・enum・source参照形式に合わせて作成されています。

Schema適合は次の自動テストで検証します。

```txt
scripts/karatsu-east-port-claude-output.test.mjs
```

このレビューでは、Schemaに通ることと、sourceが実際の値を十分に裏付けることを分けて評価します。

## 2. 良かった点

- `schemaVersion / spotId / identity / attributes / facilities / restrictions / sources / researchNotes / researchedAt / reviewStatus` を正しい階層で出力している
- 配列型と文字列型のenumを区別している
- source IDを `src-...` 形式で統一している
- sourceに `publisher / sourceType / checkedAt / supports` を付けている
- 参照したsource IDをすべて `sources` に登録している
- 海底、水深、河川影響、潮通し、常夜灯、障害物、釣れる範囲を、根拠不足のまま埋めていない
- 駐車場・トイレを「利用可能」と断定していない
- 釣り禁止と立入禁止、工事・閉鎖を分離している
- 民間source1件の規制警告・魚種をlow confidenceで保持している
- 独立した2sourceが一致する4魚種だけをmedium confidenceとしている
- 座標に不一致の可能性があることをnoteへ明記し、`inferred / low` に下げている
- `reviewStatus=draft` とし、人間レビュー前の調査結果であることを明示している

Geminiの原文で欠けていたSchema構造をほぼ完全に守りながら、ChatGPT二次調査と同じ6魚種・一部釣り禁止警告まで取得できています。

## 3. Schema検証

### 3.1 ルート構造

Schemaの必須ルート項目をすべて持っています。

- `schemaVersion`
- `spotId`
- `identity`
- `attributes`
- `fishSpecies`
- `facilities`
- `restrictions`
- `sources`
- `researchNotes`
- `researchedAt`
- `reviewStatus`

### 3.2 属性型

次の配列型を正しく使用しています。

- `attributes.spotType.value`
- `attributes.seabed.value`
- `attributes.obstacles.value`
- `attributes.fishingRange.value`

`unknown`時の値・status・confidenceもSchema条件と一致しています。

### 3.3 source形式

- IDはすべて `src-...` パターン
- source必須項目を保持
- `supports` はSchema上の属性パス形式
- 属性内の `sourceIds` は登録済みsourceを参照

### 3.4 魚種

6魚種すべてが次を満たしています。

- `basis=observed`
- `status=confirmed`
- 1件以上のsource参照
- 4魚種はmedium、2魚種はlow

## 4. 内容・根拠面の注意点

### 4.1 座標の数値根拠は未解決

Claudeは比較用代表座標 `33.459, 129.993` を採用していますが、note内で次を明示しています。

- 国土地理院地図等によるピンポイント照合は未実施
- 別の民間地図ピンと数km規模の差がある
- sourceの多くは住所・地区情報であり、緯度経度数値そのものを掲載していない

このため `inferred / low` は妥当な安全側判定です。

ただし、`identity.coordinates.sourceIds` に4件が指定されていても、それらが数値座標そのものを直接裏付けるとは限りません。Schema適合と座標の正確性は別問題です。

この指摘により、ChatGPT結果の同一座標に対する `confidence=high` も、別途再確認候補になります。

### 4.2 `supports` と「確認したが結論が出なかったsource」が混在する

次のunknown項目にはsourceIdsがあります。

- 常夜灯
- 駐車場
- トイレ
- 工事・閉鎖

これらのsourceは値を直接証明するというより、「確認したが確定情報を得られなかった」経緯を示しています。

現在のSchemaは、次を区別できません。

- 値を直接裏付けるsource
- 調査したが結論に使えなかったsource
- 値と矛盾したため不採用にしたsource

今後は `supportingSourceIds` と `checkedSourceIds`、またはsourceごとの `evidenceRole` があると、根拠関係をより正確に表現できます。

### 4.3 外海影響の根拠は補助source中心

`bay / inferred / medium` はChatGPT・Gemini・Claudeで一致しました。

ClaudeはWikipediaと業界誌記事を使用していますが、国土地理院地図上の位置計測は行っていないと明記しています。値自体は自然ですが、medium confidenceの最終確認には公的地図での直接確認が望まれます。

### 4.4 地点種別は保守的

Claudeは `port` のみを登録しました。

ChatGPTは地区内施設から `port / breakwater / revetment` を登録しています。Claudeは港としての確実性を優先し、具体施設種別を地点全体の属性へ広げませんでした。

どちらが適切かは、`spotType` が地区全体を表すのか、釣り可能な具体地点を表すのかで変わります。`scopeType` の必要性を補強する差です。

### 4.5 source内容の外部再検証は別工程

本Issueでは、Claude原文の構造・内部整合性を評価します。

次は原文に記載された内容として保持し、このIssueでは各ページ本文を独立に再調査して真偽を確定しません。

- URLが現在も有効か
- `publishedAt` が正しいか
- ページがnoteの主張を実際に含むか
- 2つの魚種sourceが運営・情報流通上も独立しているか
- 「誰でも編集可能」等のsource特性が正しいか

したがって、Schema適合をもって内容の事実確認完了とはしません。

## 5. ChatGPT・Geminiとの比較

### 5.1 ChatGPTと一致した点

- 代表座標の数値
- 外海影響: `bay / inferred / medium`
- 潮通し、常夜灯、障害物、駐車場、トイレ、立入禁止、工事・閉鎖をunknownで維持
- 釣り禁止: `partial / confirmed / low`
- medium魚種: アジ、コノシロ、クロダイ、スズキ
- low魚種: キビレ、シログチ系

### 5.2 ChatGPTと異なる点

Claudeは次をunknownのまま維持しました。

- 海底
- 水深
- 河川影響
- 釣れる範囲

ChatGPTは民間情報と地理的推定を使い、これらを `inferred / low` として追加しています。

Claudeは座標の不一致可能性を明示し、ChatGPTのhighより低いconfidenceを採用しました。

### 5.3 Geminiと異なる点

- Claudeは正本Schemaに沿った構造
- Claudeは一次・二次調査を実施
- Claudeは施設・規制を個別項目へ分離
- Claudeは魚種6種を根拠付きで登録
- Claudeは12sourceを登録し、supportsを完全な属性パスで記録

Geminiはunknownの慎重さでは良好でしたが、Schema不適合かつ二次調査未実施でした。

## 6. 総合評価

| 観点 | 評価 |
|---|---|
| JSON構文 | 適合 |
| 指定Schema | 適合見込み・自動検証対象 |
| source参照の内部整合性 | 良好 |
| unknownの慎重さ | 良好 |
| 二次調査 | 実施 |
| 魚種の過剰登録 | なし |
| 規制の過剰断定 | なし |
| 座標の確実性 | 未解決・low判定は妥当 |
| source内容の外部検証 | 未実施 |

3AIの中では、Claudeが**Schema遵守と二次調査の両立**という点でもっとも再利用しやすい原文を返しました。

ただし、source数が多いこと自体は品質保証ではありません。特に座標は、住所レベルのsourceと数値座標の直接根拠を混同しないことが重要です。

## 7. 3AI比較からの改善候補

- `scopeType`: district / facility / access_point
- `supportingSourceIds` と `checkedSourceIds` の分離
- sourceごとの `evidenceRole`: supports / checked_only / contradicts
- 座標sourceに、数値掲載・地図計測・住所変換等の取得方法を記録
- sourceの独立性を記録
- 魚種の観測日または観測期間を構造化
- 規制情報の公式確認状態を構造化
- AI依頼時にSchema本文または完全な階層例を添付
- 一次・二次調査の完了状態を出力へ含める

これらは別IssueでSchema・プロンプト変更候補として整理します。
