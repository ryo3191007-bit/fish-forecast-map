# 唐津東港 Gemini調査結果レビュー

対象Issue: #121  
受領日: 2026-07-13 JST  
Gemini出力内の確認日: 2026-07-12  
評価対象: 人間が修正していない原文JSON

## 1. 原文

```txt
data/research/fishing-spots/ai-outputs/karatsu-east-port.gemini.raw.json
```

原文はJSONとして構文解析できます。Markdownコードフェンスや説明文は付いていません。

ただし、`docs/schemas/fishing-spot-research.schema.json` には適合しません。原文をSchemaへ合わせて修正せず、不適合そのものをAI出力品質として記録します。

## 2. 良かった点

- JSONだけを出力している
- 海底、水深、河川影響、潮通し、常夜灯、障害物、釣れる範囲、施設、規制、魚種を、根拠不足のまま埋めていない
- `unknown` は `confidence=low` としている
- 外海影響を `bay / inferred / medium` とし、地理院地図を根拠にしている
- 公式・公的sourceだけを使用し、民間サイトの魚種一覧や説明文を持ち込んでいない
- 魚種を確認できない状態で空配列を維持している
- 公式情報が見つからないことを「禁止なし」「利用可能」と判定していない

値の多さより慎重さを優先した点は、一次調査として妥当です。

## 3. Schema不適合の主要因

### 3.1 必須のルート構造がない

Schemaが必要とする次のルート項目がありません。

- `schemaVersion`
- `spotId`
- `identity`
- `attributes`
- `facilities`
- `restrictions`
- `researchNotes`
- `researchedAt`
- `reviewStatus`

Geminiは `spotName`、`latitude`、`spotType` 等をすべてルート直下へ置いています。Schemaは `additionalProperties=false` のため、これらは未定義の追加項目としてもエラーになります。

### 3.2 地点識別情報の形が違う

Schemaでは次の形です。

```txt
identity.spotName: string
identity.aliases: string[]
identity.prefecture: string
identity.municipality: string
identity.coordinates: coordinates object
```

Geminiは名称・都道府県・市区町村にも `value / status / confidence / sourceIds / checkedAt` を付け、`latitude` と `longitude` を別オブジェクトにしています。

また、Schema上の項目名は `aliases` と `municipality` ですが、Geminiは `alternativeNames` と `city` を使用しています。

### 3.3 配列が必要な属性を文字列で出力している

次はSchemaでは配列です。

- `attributes.spotType.value`
- `attributes.seabed.value`
- `attributes.obstacles.value`
- `attributes.fishingRange.value`

Geminiはすべて文字列で出力しています。

例:

```json
"spotType": {
  "value": "port"
}
```

Schemaでは `value: ["port"]` のような配列が必要です。

### 3.4 施設と規制が統合されすぎている

Geminiは次の2項目にまとめています。

- `availability`
- `restriction`

Schemaでは次を分離します。

```txt
facilities.parking
facilities.toilet
restrictions.fishingProhibited
restrictions.entryProhibited
restrictions.constructionOrClosure
restrictions.officialContact
```

このため、駐車場とトイレ、釣り禁止と立入禁止等を個別に比較できません。

### 3.5 source形式がSchemaと異なる

各sourceに次の必須項目がありません。

- `publisher`
- `sourceType`
- `checkedAt`

また、source IDは `src-...` 形式が必要ですが、Geminiは `source_saga_summary` のようにアンダースコア形式を使用しています。

`priority` はSchemaに存在しない追加項目です。

`supports` も次のようなSchema上の完全な項目パスではありません。

```txt
spotName
alternativeNames
openSeaExposure
```

期待する例:

```txt
identity.spotName
identity.aliases
attributes.openSeaExposure
```

### 3.6 推定座標にsourceが付いていない

Geminiは緯度・経度を `inferred` としていますが、両方の `sourceIds` が空です。

共通ルールでは `confirmed` または `inferred` に最低1件のsourceが必要です。地理院地図をsource一覧へ含めているため、座標に結び付ける余地はありましたが、原文では参照されていません。

## 4. 内容面の比較

### 4.1 ChatGPT一次調査と一致した点

- 海底: `unknown`
- 水深: `unknown`
- 潮通し: `unknown`
- 常夜灯: `unknown`
- 障害物: `unknown`
- 外海影響: `bay / inferred / medium`
- 釣れる範囲: `unknown`
- 魚種: 空配列
- 非公式情報がないことを規制なしと判定していない

### 4.2 ChatGPT二次調査と異なる点

Geminiは民間情報を含む二次調査を実施した形跡がなく、公式・公的source 4件だけで終了しています。

そのため、ChatGPT二次調査で低・中確度として追加した次の情報はありません。

- 海底: sand / mud
- 水深: moderate
- 河川影響: weak
- 釣れる範囲: foot / near
- 一部釣り禁止の警告
- 地点魚種6種

これは必ずしも誤りではありません。情報源を広げず `unknown` を維持したため、過剰断定の危険は低い一方、共通プロンプトの二段階調査を完遂していないと評価します。

### 4.3 地点タイプの粒度

Geminiは `port` のみを登録しました。

ChatGPTは佐賀県の港湾施設資料から、地区内に岸壁・防波堤・護岸があるとして `port / breakwater / revetment` を登録しています。

Geminiの値は誤りとは言えませんが、Schemaが複数値を許容する目的を十分に使えていません。

## 5. 総合評価

| 観点 | 評価 |
|---|---|
| JSON構文 | 適合 |
| 指定Schema | 不適合 |
| unknownの慎重さ | 良好 |
| 根拠の過大評価 | 少ない |
| sourceの完全性 | 不足 |
| supportsの対応 | 不適合 |
| 二次調査 | 未実施と判断 |
| 魚種の過剰登録 | なし |

Geminiは内容面では慎重でしたが、最大の問題は**正本Schemaを読み取った形式で出力していないこと**です。

値を手作業でSchemaへ移し替えれば利用できる可能性はありますが、それを行うとGemini原文の品質評価ではなくなるため、このIssueでは変換しません。

## 6. 次回のプロンプト改善候補

Claude調査前に共通プロンプトを変えると比較条件が変わるため、今回は変更しません。

3AI比較完了後の改善候補として次を記録します。

- Schemaファイル本文を添付またはプロンプト内へ完全に含める
- ルート必須項目を明示する
- `identity / attributes / facilities / restrictions` の階層例を短く併記する
- source必須項目とIDパターンを明示する
- 配列型の属性を明示する
- 一次調査終了後に二次調査を実行したか自己確認させる
