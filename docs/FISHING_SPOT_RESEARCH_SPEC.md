# 釣り場属性調査仕様

最終更新: 2026-07-12 JST  
対象: FishForecastMap Post-MVP-039  
対象地域: 糸島西岸〜唐津湾〜伊万里湾〜平戸周辺

## 1. 目的

この仕様は、釣り場ごとの地理・地形・設備・規制・魚種候補を、複数の公開情報源から独立して調査し、AIや担当者が変わっても同じ基準で構造化するための共通ルールです。

将来は次を組み合わせ、地点・魚種・日時ごとの参考SCOREを説明可能なルールで計算します。

- 釣り場そのものの特徴
- 魚種ごとの季節・生態特性
- 選択日の天気・海況
- 既存の釣果実績

本仕様は「地点属性の調査結果」を定義するもので、魚種生態マスター、DB、編集UI、SCOREロジックは対象外です。

## 2. 基本原則

1. 民間釣りサイトは、地点候補を知る入口に限定します。
2. 地点名、位置、地形、設備、規制、魚種は、別の情報源で独立確認します。
3. 元ページの文章、写真、地図画像、コメント、プロフィール情報は保存しません。
4. 客観的な事実と、地図・生態等からの推定を分離します。
5. 確認できない項目は無理に埋めず `unknown` とします。
6. すべての確定・推定値に、根拠となる `sourceIds` と確認日を付けます。
7. AIの調査値はユーザー編集値で上書き消去せず、別レイヤーで扱います。
8. 調査結果は釣果、安全、立入可否を保証しません。
9. 外部サイトへのスクレイピング、自動巡回、定期実行は行いません。
10. 現時点で `crawlPolicy === "allowed"` のサイトは存在しない前提を維持します。

## 3. 成果物

- 調査仕様: `docs/FISHING_SPOT_RESEARCH_SPEC.md`
- JSON Schema: `docs/schemas/fishing-spot-research.schema.json`
- 架空サンプル: `docs/examples/fishing-spot-research.example.json`
- 検証スクリプト: `scripts/fishing-spot-research-schema.test.mjs`

JSONの正本バージョンは `schemaVersion: "1.0.0"` です。

## 4. 調査対象

初期対象は、糸島西岸から唐津湾、伊万里湾、平戸周辺までの陸っぱり候補地点です。

対象に含められる例:

- 港・漁港
- 堤防・護岸
- 砂浜
- 磯
- 河口
- 海釣り施設
- 複数の地形が混在する地点

次は地点候補に含めません。

- 正確な場所を独立確認できない通称だけの小場所
- 私有地や立入禁止区域への侵入を前提とする地点
- 危険性が高く、公開による不利益が大きいと判断した地点
- 民間サイトの地図ピンだけが根拠の地点
- 現在の利用可否を確認できず、誤案内の影響が大きい地点

## 5. 情報源の優先順位

### 5.1 優先順位

1. 自治体、港湾・漁港管理者、漁協、海上保安庁等
2. 国土地理院等の公的地理情報
3. 施設・運営者の公式情報
4. 水産研究機関、都道府県水産試験場
5. 報道・地域メディア
6. 複数の民間情報源で一致する客観的事実
7. 個人ブログ・SNS等

下位の情報源だけで判断する場合は `confidence` を下げ、追加確認が必要であることを `note` に書きます。

### 5.2 sourceType

| JSON値 | 意味 |
|---|---|
| `government` | 国・自治体等 |
| `port_manager` | 港湾・漁港管理者 |
| `fisheries_cooperative` | 漁協 |
| `coast_guard` | 海上保安庁等 |
| `public_map` | 公的地図・地理情報 |
| `research_institute` | 水産研究機関・試験場 |
| `facility_official` | 施設の公式情報 |
| `news_media` | 報道・地域メディア |
| `private_reference` | 民間の一般情報 |
| `personal_blog` | 個人ブログ |
| `social_media` | SNS等 |

### 5.3 情報源の保存項目

各sourceに最低限、次を保存します。

- `id`
- `url`
- `title`
- `publisher`
- `sourceType`
- `checkedAt`
- `publishedAt`
- `supports`
- `note`

`supports` は、そのsourceが裏付ける項目パスです。単にURLを列挙するだけにしません。

例:

```json
{
  "id": "src-port-manager",
  "supports": [
    "attributes.spotType",
    "restrictions.entryProhibited"
  ]
}
```

## 6. 民間釣りサイトの扱い

民間釣りサイトは、地点候補を発見するための参考としてのみ使用できます。

許可すること:

- 実在地点の候補名を知る
- 別の公的地図や公式資料で独立確認するための検索語を得る
- 客観的事実を別ソースで再確認するための入口にする

禁止すること:

- 地点一覧を丸ごと再現する
- 地図ピンや座標をコピーする
- 説明文を保存、転載、単純に言い換える
- 写真、地図画像、コメント、プロフィール情報を取得する
- 掲載魚種一覧を地点ごとに転記する
- 特定サイトを全ページ巡回する
- ログイン限定ページを参照する
- アクセス制限や利用制限を回避する
- AIを介しただけの実質的なデータベース複製を行う

## 7. statusとconfidence

### 7.1 status

| 値 | 定義 |
|---|---|
| `confirmed` | sourceが当該事実を直接裏付けている |
| `inferred` | 地図、位置関係、複数事実、生態等から推定した |
| `unknown` | 十分な根拠がなく確認できない |

### 7.2 confidence

| 値 | 定義 |
|---|---|
| `high` | 公式情報、管理主体、または複数の独立した高信頼sourceが一致 |
| `medium` | 公的地図等から合理的に推定、または複数の一般sourceが一致 |
| `low` | 単独の低信頼source、古い情報、曖昧な記述、追加確認が必要 |

`status` と `confidence` は別概念です。

例:

- 地図上で明確な河口位置: `status=inferred`, `confidence=high`
- 古い個人ブログ1件で常夜灯を確認: `status=confirmed`, `confidence=low`
- 水深資料を見つけられない: `status=unknown`, `confidence=low`

`confirmed` と `inferred` は最低1件の `sourceIds` を必要とします。  
`unknown` は `confidence=low` とし、属性値も `unknown` にします。

## 8. 共通の属性構造

各属性は原則として次の形です。

```json
{
  "value": "unknown",
  "status": "unknown",
  "confidence": "low",
  "sourceIds": [],
  "checkedAt": "2026-07-12",
  "note": "確認できなかった理由"
}
```

- `value`: アプリ用に正規化した値
- `status`: 確定・推定・不明
- `confidence`: 根拠の強さ
- `sourceIds`: 根拠source
- `checkedAt`: sourceを確認した日
- `note`: 元の数値、判定理由、注意事項

元資料に数値がある場合は、分類値だけでなく数値と単位を `note` に残します。将来、数値専用項目へ移行できるようにします。

## 9. 項目定義

### 9.1 地点識別

- `spotId`: 小文字英数字とハイフンの安定slug
- `spotName`: 独立確認できた地点名
- `aliases`: 別名・表記揺れ
- `prefecture`
- `municipality`
- `coordinates`

座標は民間サイトのピンからコピーせず、公的地図、管理資料等で独立確認します。

座標精度の判断:

- 公式地点座標や施設位置: `confirmed`
- 港や海岸の代表点を地図から設定: `inferred`
- 地点を特定できない: 緯度経度 `null`、`unknown`

### 9.2 釣り場タイプ

JSON値:

- `port`
- `fishing_port`
- `breakwater`
- `revetment`
- `sandy_beach`
- `rocky_shore`
- `river_mouth`
- `fishing_facility`
- `mixed`
- `unknown`

複数の独立した形状が同一地点内にある場合は複数値を使用できます。  
`mixed` と `unknown` は他の値と併用しません。

### 9.3 海底

JSON値:

- `sand`
- `mud`
- `rock`
- `seaweed`
- `mixed`
- `unknown`

海底は推測が入りやすいため、航空写真の色だけで断定しません。

`confirmed` の例:

- 海図、海底地質資料、浚渫・港湾資料等で直接確認
- 管理者・研究資料で底質が明記

`inferred` の例:

- 砂浜の連続、岩礁露出、公的地形資料等を組み合わせた合理的推定

### 9.4 水深

JSON値:

- `shallow`
- `moderate`
- `deep`
- `unknown`

初期のアプリ内目安:

- `shallow`: 釣り可能範囲の代表水深がおおむね5m以下と確認できる
- `moderate`: おおむね5m超〜15m
- `deep`: おおむね15m超
- `unknown`: 数値根拠がない、範囲差が大きい、釣り位置との対応が不明

この分類は航海用水深ではありません。地理院地図の見た目や民間記事の印象だけで判断しません。元資料の水深値、基準面、場所、測定時期が分かる場合は `note` に記録します。

### 9.5 河川の影響

JSON値:

- `none`
- `weak`
- `strong`
- `unknown`

判定例:

- `strong`: 河口または主要河川の直接流入部
- `weak`: 小河川・水路の流入、または近接するが直接河口ではない
- `none`: 対象範囲内に河川流入を確認できない
- `unknown`: 地点範囲や水路状態を確認できない

地図上の位置関係による判定は `inferred` とします。

### 9.6 潮通し

JSON値:

- `weak`
- `moderate`
- `strong`
- `unknown`

潮通しは「外海に面しているから強い」だけでは断定しません。

採用できる根拠:

- 流況・海況・潮流の公的資料
- 狭窄部、湾口等の地形と複数資料の一致
- 管理・研究資料に流れの特徴が明記

客観的根拠がない場合は `unknown` とします。民間記事の「潮通しが良い」1件だけの場合は最大でも `confidence=low` です。

### 9.7 常夜灯

JSON値:

- `present`
- `absent`
- `unknown`

公式設備資料、管理者案内、複数時期の確認可能な情報を優先します。

注意:

- 夜景写真に光が写るだけでは、釣り場を照らす常夜灯と断定しない
- 街路灯と港内作業灯を区別する
- 消灯、撤去、時間制限の可能性があるため確認日を必須とする

### 9.8 障害物

JSON値:

- `tetrapods`
- `rocks`
- `seaweed`
- `bridge_piers`
- `wave_dissipating_blocks`
- `other`
- `none`
- `unknown`

`none` と `unknown` は他の値と併用しません。  
商品名としての「テトラポッド」と一般的な消波ブロックを区別できない場合は `wave_dissipating_blocks` を使用します。

### 9.9 外海の影響

JSON値:

- `inner_bay`
- `bay`
- `bay_mouth`
- `open_sea`
- `unknown`

公的地図で地点と湾口・岬・島の位置関係を確認し、通常は `inferred` とします。  
風波の強さや安全性そのものを表す値ではありません。

### 9.10 釣れる範囲

JSON値:

- `foot`
- `near`
- `long_cast`
- `unknown`

これは釣果保証ではなく、地形・設備上アプローチ可能と考えられる距離区分です。

- `foot`: 足元付近
- `near`: 近距離
- `long_cast`: 遠投域
- `unknown`: 客観的根拠なし

民間サイトの攻略説明を移さず、公的な構造物形状や独立した複数資料から推定します。推定時は `status=inferred` とします。

### 9.11 魚種

`fishSpecies` は次を分離します。

- `basis=observed`: 公的漁況、公式施設記録、信頼できる観測等で地点または近接海域の出現を確認
- `basis=expected`: 魚種生態、季節、地形、水深等から期待される魚種

`observed` は `status=confirmed`、`expected` は `status=inferred` とします。

禁止:

- 特定の釣りサイトの掲載魚種一覧を丸ごと登録
- 釣果投稿1件だけから恒常的な対象魚と断定
- 生態上あり得るだけの魚種を高確度で登録

### 9.12 施設

- `parking`
- `toilet`

JSON値:

- `available`
- `not_available`
- `unknown`

駐車場について、路上、岸壁、空き地、店舗駐車場を利用可能な駐車場として扱いません。管理者・施設の公式案内を優先します。

### 9.13 規制

- `fishingProhibited`
- `entryProhibited`
- `constructionOrClosure`

JSON値:

- `yes`
- `no`
- `partial`
- `unknown`

規制情報は変更されやすく、原則として自治体、管理者、漁協、海上保安庁、現地公式案内等を優先します。

- `partial`: 一部区間、時間帯、工事区域等のみ制限
- `no`: 公式情報から禁止なしを直接確認できる場合に限定
- 公式情報が見つからないだけでは `no` にせず `unknown`

規制情報には最新確認日と公式確認先を保存します。アプリ表示時には「現地表示・管理者情報を再確認」と案内する前提です。

## 10. 更新されやすい情報

次は鮮度が重要です。

- 立入禁止
- 釣り禁止
- 工事・閉鎖
- 駐車場
- トイレ
- 常夜灯
- 施設営業時間
- 管理者連絡先

初期の再確認目安:

- 規制・工事: 90日
- 駐車場・トイレ・常夜灯: 180日
- 地形・地点種別: 365日
- 災害、工事、事故等の情報がある場合: 直ちに再確認

この日数は自動巡回の間隔ではありません。ユーザーが調査を更新する際の鮮度判定目安です。

## 11. AI調査値とユーザー編集値

このSchemaはAI・担当者の「調査結果」を保存します。

将来の実装では次を分離します。

- `researchValue`: source付きのAI・担当者調査値
- `userOverrideValue`: ユーザーが確定・修正した値
- `overrideReason`
- `editedBy`
- `editedAt`
- `effectiveValue`: 表示・SCOREに使う解決後の値

原則:

1. ユーザー編集で元の調査結果とsourceを物理削除しない
2. ユーザー上書きは理由と日時を残す
3. 表示ではユーザー値を優先できる
4. 調査更新時にユーザー値を自動上書きしない
5. SCOREへの反映可否は後続Issueで属性ごとに決める

本IssueではDB・UIの具体スキーマは決めません。

## 12. 複数AIの試験運用

### 12.1 最初の試験

最初の実在地点1件を、ChatGPT、Gemini、Claudeへ同じ指示で依頼します。

比較対象:

- 海底
- 水深
- 潮通し
- 常夜灯
- 河川の影響
- 外海の影響
- 釣れる範囲
- sourceとsupportsの対応
- `confirmed` と `inferred` の使い分け
- `unknown` を適切に残したか

### 12.2 共通依頼テンプレート

以下を各AIへそのまま渡します。

```txt
指定された釣り場について、公開されている複数のWeb情報を調査し、
docs/schemas/fishing-spot-research.schema.json に適合するJSONを作成してください。

【調査対象】
地点名: <地点名>
対象地域: 糸島西岸〜唐津湾〜伊万里湾〜平戸周辺

【必須ルール】
・自治体、港湾・漁港管理者、漁協、海上保安庁、公的地図、研究機関を優先する
・民間釣りサイトは地点候補を知る入口に限定する
・元ページの文章を転載または単純に言い換えない
・写真、地図画像、コメント、プロフィール情報を取得・保存しない
・特定サイトの地点一覧や魚種一覧を再現しない
・ログイン限定ページやアクセス制限を回避しない
・各属性に status、confidence、sourceIds、checkedAt を付ける
・confirmed と inferred を分ける
・確認できない項目は unknown にする
・潮通し、水深、常夜灯、駐車場を雰囲気で断定しない
・釣り禁止、立入禁止、工事情報は公式情報を最優先する
・observed魚種とexpected魚種を分ける
・source.supports に、そのsourceが裏付ける項目を記載する
・JSON以外の文章を出力しない
```

AIへSchemaファイルとこの仕様書を添付できない場合は、Schema本文または必要なenum一覧も一緒に渡します。

### 12.3 相互レビュー

推奨ローテーション:

- ChatGPT結果をClaudeがレビュー
- Claude結果をGeminiがレビュー
- Gemini結果をChatGPTがレビュー

全件を二重調査せず、次を優先レビューします。

- `confidence=low`
- `status=inferred`
- 個人ブログ・SNSだけを根拠にした項目
- 水深、海底、潮通し、常夜灯
- 駐車、トイレ
- 釣り禁止、立入禁止、工事
- 全体の20%程度の抜き取り

### 12.4 レビュー観点

- Schemaに適合しているか
- source IDが実在するか
- sourceとsupportsが対応しているか
- 民間サイトの表現・一覧を再現していないか
- `confirmed` の根拠が直接的か
- 推定を `confirmed` にしていないか
- 不明を無理に埋めていないか
- 更新されやすい情報が古くないか
- 魚種のobservedとexpectedを混同していないか
- 地点名・座標を独立確認しているか
- 禁止・安全情報を断定しすぎていないか

## 13. 受入条件

調査レコードは次を満たす場合だけレビュー対象にできます。

- JSONとしてparse可能
- Schemaに適合
- 必須項目が存在
- enum外の値がない
- `sourceIds` が `sources` 内に存在
- confirmed/inferredに根拠sourceがある
- unknownが低確度・unknown値になっている
- 架空値や推測を事実として混ぜていない
- 説明文、写真、地図画像等を保存していない
- 調査日・確認日を持つ

`reviewStatus=approved` は人間または指定レビュー担当が内容を確認した後だけ設定します。

## 14. 対象外

この仕様では次を行いません。

- 実在地点の一括収集
- 釣り広場.com等の自動巡回
- AI API・n8n連携
- Supabaseテーブル追加
- 地点編集UI
- 魚種生態マスター
- SCOREロジック変更
- 当日環境データとの結合
- 外部サイトの定期確認

## 15. 安全・表示上の注意

釣り場属性は参考情報です。

- 立入可否は現地表示と管理者の最新情報を優先する
- 水深は航海・潜水・安全判断に使わない
- 潮通しや外海区分から安全を断定しない
- 駐車可否を保証しない
- 釣果や魚種出現を保証しない
- 将来公開する場合は座標丸め・非公開化を検討する

---

## Schema v1.1.0 追補（Issue #125）

Schema v1.1.0の正本は `docs/schemas/fishing-spot-research.schema.json` です。旧v1.0.0は `docs/schemas/fishing-spot-research.v1.0.0.schema.json` として保存し、両Schemaの `$id` は一意にします。validatorは `schemaVersion` に応じて v1.0.0 / v1.1.0 を選択します。既存のChatGPTパイロットJSONとClaude原文JSONはv1.0.0で検証し、Gemini原文JSONは比較記録として従来どおり不適合を維持します。`data/research/fishing-spots/karatsu-east-port.json` は v1.0.0 のまま保持し、このIssueでは本番地点マスター、DB、画面、SCOREへ反映しません。

### scopeType

`scopeType` は調査対象範囲を示すルート項目です。`district` は港湾地区・海岸一帯、`facility` は岸壁・防波堤・フェリー埠頭・護岸等、`access_point` は実際に釣りを行う具体地点または入口です。`spotType` は地形・施設種別であり、`scopeType` とは別概念です。

### evidenceSources

v1.1.0では属性内の旧 `sourceIds` を廃止し、`evidenceSources.supportingSourceIds / checkedSourceIds / contradictingSourceIds` へ置き換えます。`confirmed` / `inferred` は標準JSON Schemaとcustom validatorの両方で `supportingSourceIds` 1件以上を必須にします。`unknown` は `supportingSourceIds` 0件、`confidence: "low"`、unknown値にします。3配列間の同一ID重複は禁止し、全IDは `sources[].id` に登録済みである必要があります。

### coordinates

`identity.coordinates` は `coordinateMethod`（`official_coordinate / map_measurement / address_geocode / supplied_reference`）と `coordinateScope`（`district / facility / access_point`）を必須にします。座標を支えるsourceは `evidenceSources.supportingSourceIds` に入れ、source側の `supports` も `identity.coordinates.latitude` / `identity.coordinates.longitude` と対応させます。

### source独立性

sourceには任意の `sourceGroup`、`originalSourceId` と、必須の `independenceStatus: independent / related / unknown` を持たせます。転載、同一運営元、同一原典の派生は独立sourceとして数えず、confidenceを上げる根拠にしません。`originalSourceId` は `sources[]` に登録済みの別sourceだけを参照でき、自己参照は禁止します。`independenceStatus: related` は `sourceGroup` または `originalSourceId` の少なくとも一方を必須とし、`independent` は `originalSourceId` を持てません。

### 時間情報

魚種は `observedAt` または `observedPeriod` を記録できます。`basis: observed` の魚種は `observedAt`、または `observedPeriod.from / to` の少なくとも一方を必須にします。`basis: expected` は観測実績ではないため両方nullを許容します。施設・規制・officialContactは `validFrom / validUntil / officiallyConfirmed` を持ちます。sourceは `publishedAt`（公開日）、`lastUpdatedAt`（source上の最終更新日）、`checkedAt`（このリポジトリで確認した日）を区別します。日付不明または非該当の場合はnullを許容しますが、項目自体はSchema skeletonとexampleに残します。期間は `observedPeriod.from <= observedPeriod.to`、`validFrom <= validUntil` をcustom validatorで確認し、同日および片側nullは許容します。

### researchStages

`researchStages.officialResearch` は `completed / incomplete`、`secondaryResearch` は `completed / skipped / incomplete`、`schemaValidation` は `passed / failed / not_run` です。これはAI自己申告欄であり、最終的なSchema検証は `scripts/fishing-spot-research-schema.test.mjs` のリポジトリ側テストで行います。

### source.supports

`source.supports` はSchema上に実在する値パスだけを許可します。配列要素は0始まりの `fishSpecies[0].name` のように表し、属性値は `attributes.spotType.value` のように `.value` まで書きます。座標は `identity.coordinates.latitude` / `identity.coordinates.longitude` です。`fishSpecies[0].value`、`fishSpecies[].name`、`fishSpecies.expected`、`attributes.foo.value`、`attributes.spotType`、`facilities.foo.value`、`restrictions.foo.value`、`sources[0].url` は拒否します。custom validatorでは、supportsの配列indexが実在すること、`evidenceSources.supportingSourceIds` のsourceが対象ノードに対応するsupportパスを少なくとも1件持つことも確認します。checked/contradicting sourceは確認・反証目的のため、対象ノードへの直接supportは必須にしません。

### 共通プロンプト

汎用共通プロンプトは `docs/research/FISHING_SPOT_RESEARCH_COMMON_PROMPT.md` に置き、完全なJSON skeleton、unknownルール、source直接性・独立性、一次/二次調査完了条件、JSON以外を出力しない指示、出力前のSchema自己検証チェックを含めます。唐津東港用の既存3AIプロンプトは比較資料として保持します。
