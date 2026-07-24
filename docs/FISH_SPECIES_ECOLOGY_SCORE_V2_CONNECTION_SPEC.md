# 魚種生態マスターからSCORE v2への接続仕様

## 目的と責務境界

本仕様はIssue #276の実装前契約であり、配点、重み、閾値、UI、DBを変更しない。調査JSONは候補値、根拠、不採用判断を含む監査記録、本番投影はSCORE利用を許可された値だけを運ぶ静的な中間モデル、SCORE計算は投影済み入力から既存の配点を計算する責務を持つ。調査JSONを実行時に直接読まず、CIまたはビルド前のTypeScript変換で厳格に検証して静的生成する方式を採用する。これによりブラウザへ不採用情報を同梱せず、型とテストを一つの投影関数へ集約できる。現Issueでは生成物を本番計算へ接続しない。

## 投影ゲート

`src/domain/fishSpeciesEcologyScoreProjection.ts`を機械可読な正本とする。次の条件をすべて満たす属性だけを投影する。

1. 同じ`speciesId`の`productionAdoption.acceptedPaths`にpathがある。
2. 同じpathのdecisionが一意に存在し、`adopt`または`adopt_with_warning`である。
3. purposeが軸固有の`score_v2_water_temperature / score_v2_season_time / score_v2_spot_affinity / score_v2_method_affinity`のいずれかである。従来の`environment_score`等は広すぎるためSCORE入力許可には使わない。
4. purposeごとの許可path表に一致する。`stableGeneral`、identity、`spawningOrConfusableInfo`、`depthRange`はどのSCORE purposeにも許可しない。
5. claimが存在して`unknown`でなく、confidenceが`high / medium / low`、regionScopeが空でない。
6. decisionの各source IDが存在し、同じpathを`supports`し、sourceのregionScopeも空でない。

identity表示用`identity_display`、一般説明用`ecology_description`、除外用`score_excluded`はSCOREへ投影しない。`hold / reject`はacceptedPathsに誤って残っていても投影しない。SCORE purposeを持つaccepted pathの値欠損、`unknown`、未知confidence、path-purpose不一致、source不整合は静的生成を失敗させる。一般表示用属性の欠損はSCORE生成のエラーにせず除外する。

投影行は`speciesId / scoreSpecies / path / purpose / value / decision / confidence / regionScope / sourceIds`を保持する。元ページ本文やURLは計算入力へ複製せず、source IDにより調査記録へ監査可能にする。

## 魚種解決

| speciesId | SCORE v2名 | 状態 |
|---|---|---|
| `aji` | なし | 非対応 |
| `maaji` | マアジ | 対応 |
| `maruaji` | なし | 非対応 |
| `seabass` | スズキ | 対応 |
| `chinu` | チヌ | 対応 |

この対応はalias解決とは別の完全列挙表である。`aji`を個別種へ解決せず、親、子、兄弟間の値、source、固定値を継承しない。非対応IDは常に空の投影を返し、似た表示名やaliasをfallbackにしない。

## 欠損、coverage、confidence

投影欠損は証拠なしであって0点、不適、釣れないではない。各評価軸では入力のある要素だけを分子と分母に使い、欠損要素へ0点もlegacy値も入れない。既存計算の規則を式にすると、利用可能集合を`A`、各点を`s_i`、既存重みを`w_i`、既存confidence係数を`c_i`として次のとおりである。

```text
axisScore = Aが空ならnull、そうでなければ round(Σ(s_i × w_i × c_i) / Σ(w_i, i∈A))
axisCoverage = 100 × Σ(w_i, i∈A) / Σ(w_i, 全要素)
```

すなわち利用可能要素間では分母を再配分するが、coverageは元の全重みに対して下がる。`adopt_with_warning`自体に追加減点はせず、元decisionのconfidenceを保持して既存係数（high 1、medium 0.6、low 0.3）だけを適用する。警告を理由にconfidenceを自動昇降させない。

- `available`: overallScoreが非nullかつoverall coverage 100%。
- `partial`: overallScoreが非nullかつcoverageが100%未満。
- `reference_only`: overallScoreはnullだが、対応魚種について少なくとも地点側の参考scoreがある。
- `no_information`: 非対応魚種、または地点側にも利用可能な証拠がない。

既存の各軸最低coverage 60%を満たさない、地点軸か環境軸のどちらかが計算不能、安全ゲートが評価不可、または非対応魚種の場合は`overallScore: null`とする。新たな閾値は導入しない。

## 現行固定値の移行分類

現行コードは調査sourceでも正解データでもない。属性単位の分類は次のとおりとする。

| 現行属性 | 分類 | 方針 |
|---|---|---|
| 魚種別水温区分、時間帯、潮点数 | 根拠不足として隔離／後続調査待ち | 生態マスターの対応purposeが承認されるまで置換不可。現Issueでは値を変更しない |
| 魚種別method affinity | 根拠不足として隔離／後続調査待ち | 釣法記載だけから既存点数を正当化しない |
| 魚種別habitat点数 | 根拠不足として隔離／後続調査待ち | 一般生息域・一般水深を岸釣り地点適性へ変換しない |
| 風、突風、波、雨、雷の安全・気象評価 | legacy設定として別根拠で維持 | 魚種生態マスターの置換対象外 |
| 釣法別shape / terrain / shore access | 別マスターへ移管 | 釣法・地点形状の根拠として後続管理する |
| 手入力釣果、承認済み地点詳細 | legacy設定として別根拠で維持 | 魚種生態値ではなく既存の個別証拠経路を維持 |
| identity名・alias | identity表示／解決専用 | SCORE入力へ混入させない |

現時点の5調査JSONには軸固有SCORE purposeが一件もないため、投影結果は全魚種で空である。これは既存固定値で埋めず、後続の調査・採否・生成・接続を分離して進める。

## 後続実装単位

1. 対象地域・岸釣り文脈の根拠を属性ごとに調査し、軸固有purposeをレビューする。
2. 厳格投影を実行する生成スクリプトと、監査可能なUTF-8 JSON生成物を追加する。
3. 生成物をSCORE入力へ接続し、該当legacy固定値だけを段階的に隔離する。
4. 釣法・地点形状設定を別マスターへ移す。

各段階で配点変更は別Issueとし、`aji / maruaji`を対応種に追加しない。
