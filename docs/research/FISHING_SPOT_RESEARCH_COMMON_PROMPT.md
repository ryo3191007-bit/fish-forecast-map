# 釣り場調査 共通プロンプト（Schema v1.1.0）

以下のJSON Schema v1.1.0へ適合する釣り場調査JSONだけを出力してください。説明文、Markdown、コードフェンス、前置き、後書きは出力しないでください。

## 調査完了条件

- 一次調査: 自治体、港湾管理者、漁協、海上保安庁、公的地図、研究機関、施設公式などを確認し、確認できた/できなかった事実を記録する。
- 二次調査: ニュース、民間釣り情報、ブログ、SNS等は補助情報として扱い、本文の転載はしない。
- unknownルール: `status: "unknown"` は `confidence: "low"`、unknown値、`evidenceSources.supportingSourceIds: []` とする。確認したが結論に使えないsourceは `checkedSourceIds` へ入れる。
- 民間source1件のみで釣果・施設・規制を断定する場合、原則 `confidence: "low"` とし、独立した複数sourceとして数えない。
- source直接性: 値を直接支えるsourceだけを `supportingSourceIds` と `source.supports` に記録する。
- source独立性: 転載、同一運営元、同一原典の派生は独立sourceとして数えず、`sourceGroup`、`originalSourceId`、`independenceStatus` で関係を記録する。
- 出力前にSchema自己検証し、`researchStages.schemaValidation` へ `passed / failed / not_run` を記録する。ただし最終判定はリポジトリ側テストで行う。

## supportsパス

有効例: `fishSpecies[0].name`, `attributes.spotType.value`, `identity.coordinates.latitude`, `identity.coordinates.longitude`, `facilities.toilet.value`, `restrictions.officialContact.url`。
無効例: `fishSpecies[0].value`, `fishSpecies[].name`, `fishSpecies.expected`, `attributes.foo.value`, `attributes.spotType`, `facilities.foo.value`, `restrictions.foo.value`, `sources[0].url`。

## 完全なJSON skeleton

{
  "schemaVersion": "1.1.0",
  "spotId": "example-spot-id",
  "scopeType": "district",
  "identity": {
    "spotName": "",
    "aliases": [],
    "prefecture": "",
    "municipality": "",
    "coordinates": {
      "latitude": null,
      "longitude": null,
      "coordinateMethod": "map_measurement",
      "coordinateScope": "district",
      "status": "unknown",
      "confidence": "low",
      "evidenceSources": {
        "supportingSourceIds": [],
        "checkedSourceIds": [],
        "contradictingSourceIds": []
      },
      "checkedAt": "YYYY-MM-DD",
      "note": ""
    }
  },
  "attributes": {
    "spotType": { "value": ["unknown"], "status": "unknown", "confidence": "low", "evidenceSources": { "supportingSourceIds": [], "checkedSourceIds": [], "contradictingSourceIds": [] }, "checkedAt": "YYYY-MM-DD", "note": "" },
    "seabed": { "value": ["unknown"], "status": "unknown", "confidence": "low", "evidenceSources": { "supportingSourceIds": [], "checkedSourceIds": [], "contradictingSourceIds": [] }, "checkedAt": "YYYY-MM-DD", "note": "" },
    "waterDepth": { "value": "unknown", "status": "unknown", "confidence": "low", "evidenceSources": { "supportingSourceIds": [], "checkedSourceIds": [], "contradictingSourceIds": [] }, "checkedAt": "YYYY-MM-DD", "note": "" },
    "riverInfluence": { "value": "unknown", "status": "unknown", "confidence": "low", "evidenceSources": { "supportingSourceIds": [], "checkedSourceIds": [], "contradictingSourceIds": [] }, "checkedAt": "YYYY-MM-DD", "note": "" },
    "tidalFlow": { "value": "unknown", "status": "unknown", "confidence": "low", "evidenceSources": { "supportingSourceIds": [], "checkedSourceIds": [], "contradictingSourceIds": [] }, "checkedAt": "YYYY-MM-DD", "note": "" },
    "streetLights": { "value": "unknown", "status": "unknown", "confidence": "low", "evidenceSources": { "supportingSourceIds": [], "checkedSourceIds": [], "contradictingSourceIds": [] }, "checkedAt": "YYYY-MM-DD", "note": "" },
    "obstacles": { "value": ["unknown"], "status": "unknown", "confidence": "low", "evidenceSources": { "supportingSourceIds": [], "checkedSourceIds": [], "contradictingSourceIds": [] }, "checkedAt": "YYYY-MM-DD", "note": "" },
    "openSeaExposure": { "value": "unknown", "status": "unknown", "confidence": "low", "evidenceSources": { "supportingSourceIds": [], "checkedSourceIds": [], "contradictingSourceIds": [] }, "checkedAt": "YYYY-MM-DD", "note": "" },
    "fishingRange": { "value": ["unknown"], "status": "unknown", "confidence": "low", "evidenceSources": { "supportingSourceIds": [], "checkedSourceIds": [], "contradictingSourceIds": [] }, "checkedAt": "YYYY-MM-DD", "note": "" }
  },
  "fishSpecies": [
    {
      "name": "",
      "basis": "observed",
      "status": "confirmed",
      "confidence": "low",
      "evidenceSources": { "supportingSourceIds": [], "checkedSourceIds": [], "contradictingSourceIds": [] },
      "checkedAt": "YYYY-MM-DD",
      "observedAt": null,
      "observedPeriod": { "from": null, "to": null },
      "note": ""
    }
  ],
  "facilities": {
    "parking": { "value": "unknown", "status": "unknown", "confidence": "low", "evidenceSources": { "supportingSourceIds": [], "checkedSourceIds": [], "contradictingSourceIds": [] }, "checkedAt": "YYYY-MM-DD", "validFrom": null, "validUntil": null, "officiallyConfirmed": null, "note": "" },
    "toilet": { "value": "unknown", "status": "unknown", "confidence": "low", "evidenceSources": { "supportingSourceIds": [], "checkedSourceIds": [], "contradictingSourceIds": [] }, "checkedAt": "YYYY-MM-DD", "validFrom": null, "validUntil": null, "officiallyConfirmed": null, "note": "" }
  },
  "restrictions": {
    "fishingProhibited": { "value": "unknown", "status": "unknown", "confidence": "low", "evidenceSources": { "supportingSourceIds": [], "checkedSourceIds": [], "contradictingSourceIds": [] }, "checkedAt": "YYYY-MM-DD", "validFrom": null, "validUntil": null, "officiallyConfirmed": null, "note": "" },
    "entryProhibited": { "value": "unknown", "status": "unknown", "confidence": "low", "evidenceSources": { "supportingSourceIds": [], "checkedSourceIds": [], "contradictingSourceIds": [] }, "checkedAt": "YYYY-MM-DD", "validFrom": null, "validUntil": null, "officiallyConfirmed": null, "note": "" },
    "constructionOrClosure": { "value": "unknown", "status": "unknown", "confidence": "low", "evidenceSources": { "supportingSourceIds": [], "checkedSourceIds": [], "contradictingSourceIds": [] }, "checkedAt": "YYYY-MM-DD", "validFrom": null, "validUntil": null, "officiallyConfirmed": null, "note": "" },
    "officialContact": { "name": null, "url": null, "checkedAt": "YYYY-MM-DD", "validFrom": null, "validUntil": null, "officiallyConfirmed": null, "note": "" }
  },
  "sources": [
    {
      "id": "src-example",
      "url": "https://example.com/",
      "title": "",
      "publisher": "",
      "sourceType": "government",
      "checkedAt": "YYYY-MM-DD",
      "publishedAt": null,
      "lastUpdatedAt": null,
      "sourceGroup": null,
      "originalSourceId": null,
      "independenceStatus": "unknown",
      "supports": [],
      "note": ""
    }
  ],
  "researchStages": {
    "officialResearch": "incomplete",
    "secondaryResearch": "incomplete",
    "schemaValidation": "not_run"
  },
  "researchNotes": "",
  "researchedAt": "YYYY-MM-DDTHH:mm:ss+09:00",
  "reviewStatus": "draft"
}
