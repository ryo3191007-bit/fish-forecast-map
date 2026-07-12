# 釣り場調査 AI共通プロンプト

対象: ChatGPT / Gemini / Claude 等  
Schema: `docs/schemas/fishing-spot-research.schema.json` `schemaVersion: "1.1.0"`

## そのまま貼り付ける依頼文

```txt
指定された釣り場について、公開Web情報を手動調査し、fish-forecast-map の fishing-spot-research.schema.json schemaVersion "1.1.0" に適合するJSONだけを出力してください。Markdown、説明文、コードフェンスは出力しないでください。

【対象】
地点名: <地点名>
別名候補: <別名候補>
都道府県: <都道府県>
市区町村: <市区町村>
調査日は実行日を使用してください。

【完全なルート階層】
{
  "schemaVersion": "1.1.0",
  "spotId": "kebab-case-slug",
  "scopeType": "district | facility | access_point",
  "identity": { "spotName": "", "aliases": [], "prefecture": "", "municipality": "", "coordinates": {} },
  "attributes": { "spotType": {}, "seabed": {}, "waterDepth": {}, "riverInfluence": {}, "tidalFlow": {}, "streetLights": {}, "obstacles": {}, "openSeaExposure": {}, "fishingRange": {} },
  "fishSpecies": [],
  "facilities": { "parking": {}, "toilet": {} },
  "restrictions": { "fishingProhibited": {}, "entryProhibited": {}, "constructionOrClosure": {}, "officialContact": {} },
  "sources": [],
  "researchStages": { "officialResearch": "completed | incomplete", "secondaryResearch": "completed | skipped | incomplete", "schemaValidation": "passed | failed | not_run" },
  "researchNotes": "",
  "researchedAt": "YYYY-MM-DDThh:mm:ss+09:00",
  "reviewStatus": "draft"
}

【配列型属性】
identity.aliases, fishSpecies, sources は配列です。attributes.spotType, attributes.seabed, attributes.obstacles, attributes.fishingRange の value も配列です。unknown / mixed / none はSchemaの併用禁止ルールに従ってください。

【scopeTypeとspotType】
scopeType は調査対象範囲で、district（港湾地区・海岸一帯）、facility（岸壁・防波堤・フェリー埠頭・護岸等）、access_point（実釣地点または入口）から選びます。spotType は地形・施設種別であり、scopeTypeと混同しないでください。

【source IDと必須項目】
source.id は src- で始まる kebab-case（例: src-saga-pref-port）にしてください。各sourceには id, url, title, publisher, sourceType, checkedAt, publishedAt, lastUpdatedAt, supports, sourceGroup, originalSourceId, independenceStatus を入れてください。

【sourceの役割】
各属性では sourceIds を使わず evidenceSources を使います。
- supportingSourceIds: 値を直接支えるsource
- checkedSourceIds: 確認したが結論に使わなかったsource
- contradictingSourceIds: 値と矛盾するsource
confirmed / inferred の属性は supportingSourceIds を1件以上必要とします。unknown は supportingSourceIds を空にし、調べたsourceがあれば checkedSourceIds に入れます。

【supportsの完全な属性パス例】
source.supports には直接支える属性だけを書きます。例: identity.coordinates.latitude, identity.coordinates.longitude, attributes.spotType.value, attributes.waterDepth.value, fishSpecies[0].name, facilities.parking.value, restrictions.entryProhibited.value。単に読んだだけのsourceは supports に入れず、該当属性の checkedSourceIds に入れてください。

【座標】
coordinates には coordinateMethod（official_coordinate / map_measurement / address_geocode / supplied_reference）と coordinateScope（district / facility / access_point）を必ず入れてください。民間サイトの地図ピンはコピーしないでください。

【sourceの直接性・独立性】
同一運営元、転載、引用、同じ原資料に依存するページは独立sourceとして数えません。sourceGroup で同一系列を束ね、転載・引用元が分かる場合は originalSourceId を入れ、independenceStatus を independent / related / unknown から選びます。confidence を上げる時は independent のsupporting sourceだけを数えてください。

【時間情報】
魚種は observedAt または observedPeriod を可能な範囲で入れてください。規制・施設は validFrom, validUntil, officiallyConfirmed を使い、sourceは publishedAt, lastUpdatedAt, checkedAt を区別してください。checkedAt は調査者が確認した日です。

【一次・二次調査】
一次調査は自治体、港湾・漁港管理者、漁協、海上保安庁、国土地理院、公的研究機関、施設公式情報の確認です。主要な公式候補を確認したら officialResearch=completed、不足があれば incomplete です。二次調査は民間情報・個人記録の補助確認です。不要なら skipped、確認したら completed、不十分なら incomplete です。

【unknownルール】
根拠不足の項目は unknown とし、confidence=low、値も unknown にしてください。雰囲気、航空写真だけ、民間情報1件だけで断定しないでください。

【禁止事項】
スクレイピング、自動巡回、定期アクセス、第三者本文の転載、写真・コメント・プロフィール保存、ログイン制限回避、民間釣りサイトの魚種一覧や地図ピンのコピーは禁止です。

【出力前Schema自己検証】
出力直前に、必須ルート階層、配列型、source IDパターン、evidenceSourcesのsource参照、supportsの属性パス、unknownルール、座標のmethod/scope、researchStages、additionalProperties禁止に違反していないか自己検証してください。自己検証に通る場合のみ schemaValidation="passed" とし、通らない場合は "failed" としてください。
```
