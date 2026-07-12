# 釣り場調査 共通プロンプト（Schema v1.1.0）

対象地点を調査し、JSON以外を出力しないでください。外部サイトの本文転載、スクレイピング、自動巡回、定期取得は禁止です。

## 出力Schema

- `schemaVersion` は `"1.1.0"`。
- ルートには `spotId`, `scopeType`, `identity`, `attributes`, `fishSpecies`, `facilities`, `restrictions`, `sources`, `researchStages`, `researchNotes`, `researchedAt`, `reviewStatus` を置く。
- `scopeType` は `district` / `facility` / `access_point`。`spotType` とは別概念。
- 座標には `coordinateMethod`（`official_coordinate` / `map_measurement` / `address_geocode` / `supplied_reference`）と `coordinateScope`（`district` / `facility` / `access_point`）を必ず入れる。

## evidenceSourcesルール

各属性は `sourceIds` ではなく次を使います。

```json
"evidenceSources": {
  "supportingSourceIds": [],
  "checkedSourceIds": [],
  "contradictingSourceIds": []
}
```

- `confirmed` / `inferred` は `supportingSourceIds` を1件以上にする。
- `unknown` は `confidence: "low"`、値も `unknown`、`supportingSourceIds: []` にする。
- supporting / checked / contradicting の3配列間で同じsource IDを重複させない。
- 全IDは `sources[].id` に登録する。

## source.supportsパス

`source.supports` は、そのsourceが直接支えるSchema上のパスだけを書きます。

- 配列要素は0始まりの角括弧: `fishSpecies[0].name`, `fishSpecies[0].basis`
- 属性値はオブジェクト全体ではなく `.value` まで: `attributes.spotType.value`, `attributes.obstacles.value`, `facilities.toilet.value`
- 座標数値: `identity.coordinates.latitude`, `identity.coordinates.longitude`
- 無効例: `fishSpecies.expected`, `attributes.spotType`, `attributes`, `fishSpecies[].name`

## source独立性

転載・同一運営元・同一原典を独立sourceとして数えないため、必要に応じて `sourceGroup`, `originalSourceId`, `independenceStatus`（`independent` / `related` / `unknown`）を記録してください。

## researchStages

```json
"researchStages": {
  "officialResearch": "completed",
  "secondaryResearch": "completed",
  "schemaValidation": "passed"
}
```

`schemaValidation: "passed"` は出力前の自己検証結果です。リポジトリ側の自動検証も別途行います。

## 自己検証チェック

出力前に次を確認してください。

1. JSONだけを出力している。
2. 必須ルート階層が揃っている。
3. `source.supports` が上記パス形式に一致している。
4. `unknown` の `supportingSourceIds` が空である。
5. evidence role間にsource ID重複がない。
6. 全source IDが `sources[]` に登録されている。
7. 座標の根拠sourceと `source.supports` の `identity.coordinates.latitude/longitude` が対応している。
