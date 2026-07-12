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
  "spotId": "sample-harbor-a",
  "scopeType": "facility",
  "identity": {
    "spotName": "サンプル漁港A（架空）",
    "aliases": [],
    "prefecture": "サンプル県",
    "municipality": "サンプル市",
    "coordinates": {
      "latitude": 33.5,
      "longitude": 130.0,
      "coordinateMethod": "map_measurement",
      "coordinateScope": "facility",
      "status": "inferred",
      "confidence": "medium",
      "evidenceSources": {
        "supportingSourceIds": [
          "src-public-map"
        ],
        "checkedSourceIds": [],
        "contradictingSourceIds": []
      },
      "checkedAt": "2026-07-12",
      "note": "JSON形式の説明用に作成した架空地点。実在地点として使用しない。"
    }
  },
  "attributes": {
    "spotType": {
      "value": [
        "fishing_port",
        "breakwater"
      ],
      "status": "confirmed",
      "confidence": "high",
      "evidenceSources": {
        "supportingSourceIds": [
          "src-port-manager"
        ],
        "checkedSourceIds": [],
        "contradictingSourceIds": []
      },
      "checkedAt": "2026-07-12"
    },
    "seabed": {
      "value": [
        "sand",
        "rock"
      ],
      "status": "inferred",
      "confidence": "medium",
      "evidenceSources": {
        "supportingSourceIds": [
          "src-public-map"
        ],
        "checkedSourceIds": [],
        "contradictingSourceIds": []
      },
      "checkedAt": "2026-07-12"
    },
    "waterDepth": {
      "value": "unknown",
      "status": "unknown",
      "confidence": "low",
      "evidenceSources": {
        "supportingSourceIds": [],
        "checkedSourceIds": [
          "src-public-map"
        ],
        "contradictingSourceIds": []
      },
      "checkedAt": "2026-07-12"
    },
    "riverInfluence": {
      "value": "weak",
      "status": "inferred",
      "confidence": "medium",
      "evidenceSources": {
        "supportingSourceIds": [
          "src-public-map"
        ],
        "checkedSourceIds": [],
        "contradictingSourceIds": []
      },
      "checkedAt": "2026-07-12"
    },
    "tidalFlow": {
      "value": "unknown",
      "status": "unknown",
      "confidence": "low",
      "evidenceSources": {
        "supportingSourceIds": [],
        "checkedSourceIds": [
          "src-public-map"
        ],
        "contradictingSourceIds": []
      },
      "checkedAt": "2026-07-12"
    },
    "streetLights": {
      "value": "unknown",
      "status": "unknown",
      "confidence": "low",
      "evidenceSources": {
        "supportingSourceIds": [],
        "checkedSourceIds": [],
        "contradictingSourceIds": []
      },
      "checkedAt": "2026-07-12"
    },
    "obstacles": {
      "value": [
        "wave_dissipating_blocks"
      ],
      "status": "confirmed",
      "confidence": "medium",
      "evidenceSources": {
        "supportingSourceIds": [
          "src-port-manager"
        ],
        "checkedSourceIds": [],
        "contradictingSourceIds": []
      },
      "checkedAt": "2026-07-12"
    },
    "openSeaExposure": {
      "value": "bay_mouth",
      "status": "inferred",
      "confidence": "medium",
      "evidenceSources": {
        "supportingSourceIds": [
          "src-public-map"
        ],
        "checkedSourceIds": [],
        "contradictingSourceIds": []
      },
      "checkedAt": "2026-07-12"
    },
    "fishingRange": {
      "value": [
        "foot",
        "near"
      ],
      "status": "inferred",
      "confidence": "low",
      "evidenceSources": {
        "supportingSourceIds": [
          "src-public-map"
        ],
        "checkedSourceIds": [],
        "contradictingSourceIds": []
      },
      "checkedAt": "2026-07-12"
    }
  },
  "fishSpecies": [
    {
      "name": "アジ",
      "basis": "expected",
      "status": "inferred",
      "confidence": "low",
      "evidenceSources": {
        "supportingSourceIds": [
          "src-fisheries-research"
        ],
        "checkedSourceIds": [],
        "contradictingSourceIds": []
      },
      "checkedAt": "2026-07-12",
      "observedAt": null,
      "observedPeriod": {
        "from": null,
        "to": null
      },
      "note": "魚種生態と地点タイプからの例示。実在地点の釣果実績ではない。"
    }
  ],
  "facilities": {
    "parking": {
      "value": "unknown",
      "status": "unknown",
      "confidence": "low",
      "evidenceSources": {
        "supportingSourceIds": [],
        "checkedSourceIds": [],
        "contradictingSourceIds": []
      },
      "checkedAt": "2026-07-12",
      "validFrom": null,
      "validUntil": null,
      "officiallyConfirmed": null
    },
    "toilet": {
      "value": "not_available",
      "status": "confirmed",
      "confidence": "medium",
      "evidenceSources": {
        "supportingSourceIds": [
          "src-port-manager"
        ],
        "checkedSourceIds": [],
        "contradictingSourceIds": []
      },
      "checkedAt": "2026-07-12",
      "validFrom": null,
      "validUntil": null,
      "officiallyConfirmed": true
    }
  },
  "restrictions": {
    "fishingProhibited": {
      "value": "unknown",
      "status": "unknown",
      "confidence": "low",
      "evidenceSources": {
        "supportingSourceIds": [],
        "checkedSourceIds": [],
        "contradictingSourceIds": []
      },
      "checkedAt": "2026-07-12",
      "validFrom": null,
      "validUntil": null,
      "officiallyConfirmed": null
    },
    "entryProhibited": {
      "value": "partial",
      "status": "confirmed",
      "confidence": "high",
      "evidenceSources": {
        "supportingSourceIds": [
          "src-port-manager"
        ],
        "checkedSourceIds": [],
        "contradictingSourceIds": []
      },
      "checkedAt": "2026-07-12",
      "validFrom": null,
      "validUntil": null,
      "officiallyConfirmed": true
    },
    "constructionOrClosure": {
      "value": "no",
      "status": "confirmed",
      "confidence": "high",
      "evidenceSources": {
        "supportingSourceIds": [
          "src-port-manager"
        ],
        "checkedSourceIds": [],
        "contradictingSourceIds": []
      },
      "checkedAt": "2026-07-12",
      "validFrom": null,
      "validUntil": null,
      "officiallyConfirmed": true
    },
    "officialContact": {
      "name": "サンプル港湾管理事務所（架空）",
      "url": "https://example.com/sample-port",
      "checkedAt": "2026-07-12",
      "validFrom": null,
      "validUntil": null,
      "officiallyConfirmed": true,
      "note": "形式説明用の架空情報。"
    }
  },
  "sources": [
    {
      "id": "src-port-manager",
      "url": "https://example.com/sample-port",
      "title": "サンプル漁港施設・利用案内（架空）",
      "publisher": "サンプル港湾管理事務所",
      "sourceType": "port_manager",
      "checkedAt": "2026-07-12",
      "publishedAt": null,
      "lastUpdatedAt": null,
      "sourceGroup": "sample-official",
      "originalSourceId": null,
      "independenceStatus": "independent",
      "supports": [
        "attributes.spotType.value",
        "attributes.obstacles.value",
        "facilities.toilet.value",
        "facilities.toilet.officiallyConfirmed",
        "restrictions.entryProhibited.value",
        "restrictions.constructionOrClosure.value",
        "restrictions.officialContact.name",
        "restrictions.officialContact.url"
      ]
    },
    {
      "id": "src-public-map",
      "url": "https://example.com/sample-public-map",
      "title": "サンプル公的地図（架空）",
      "publisher": "サンプル地理機関",
      "sourceType": "public_map",
      "checkedAt": "2026-07-12",
      "publishedAt": null,
      "lastUpdatedAt": null,
      "sourceGroup": "sample-map",
      "originalSourceId": null,
      "independenceStatus": "independent",
      "supports": [
        "identity.coordinates.latitude",
        "identity.coordinates.longitude",
        "attributes.seabed.value",
        "attributes.riverInfluence.value",
        "attributes.openSeaExposure.value",
        "attributes.fishingRange.value"
      ]
    },
    {
      "id": "src-fisheries-research",
      "url": "https://example.com/sample-fisheries-research",
      "title": "アジの生態資料（架空）",
      "publisher": "サンプル水産研究機関",
      "sourceType": "research_institute",
      "checkedAt": "2026-07-12",
      "publishedAt": null,
      "lastUpdatedAt": null,
      "sourceGroup": "sample-research",
      "originalSourceId": null,
      "independenceStatus": "independent",
      "supports": [
        "fishSpecies[0].name",
        "fishSpecies[0].basis"
      ]
    }
  ],
  "researchStages": {
    "officialResearch": "completed",
    "secondaryResearch": "completed",
    "schemaValidation": "passed"
  },
  "researchNotes": "このファイルは形式確認用の架空データ。実在する釣り場の事実として利用しない。",
  "researchedAt": "2026-07-12T12:00:00+09:00",
  "reviewStatus": "draft"
}
