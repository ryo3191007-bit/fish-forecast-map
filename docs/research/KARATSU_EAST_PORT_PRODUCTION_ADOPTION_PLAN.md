# 唐津東港 調査値の本番採用設計

最終更新: 2026-07-17 JST  
対象地点: `karatsu-east-port` / 唐津東港  
状態: 設計・人間承認待ち（本番未反映）

## 1. 目的

唐津東港について、調査データと現在の本番地点マスターを属性単位で比較し、根拠のない安全性・釣果期待・釣法を断定しない形で本番へ投影する方針を定める。

本書は人間が採用可否を判断するための設計書であり、次は変更しない。

- `src/data/fishingSpots.ts`
- `FishingSpot`型
- Supabase `fishing_spots`
- 魚種enum
- SCORE
- 画面表示
- 調査JSON

本番反映は、本書の人間承認後に別Issueで実施する。

## 2. 参照する正本

| 区分 | 正本 | 役割 |
| --- | --- | --- |
| 調査原文 | `data/research/fishing-spots/karatsu-east-port.json` | 根拠、status、confidence、source、確認日を保持する。Schema v1.0.0の比較記録として維持する |
| 調査仕様 | `docs/FISHING_SPOT_RESEARCH_SPEC.md` | 調査値の意味、情報源優先度、禁止事項を定義する |
| 現行本番型 | `src/domain/fishingSpot.ts` | アプリが現在表示できる地点属性を定義する |
| 静的fallback | `src/data/fishingSpots.ts` | Supabase未設定・失敗・空データ時の表示値 |
| Supabase取得 | `src/lib/masterDataRepository.ts` | `fishing_spots`を取得し、失敗時に静的fallbackへ戻す |
| Supabase変換 | `src/lib/masterDataMapper.ts` | DB rowを現行`FishingSpot`型へ変換する |

調査データは、根拠と不確実性を保持する調査レイヤーである。現行`FishingSpot`は表示用の簡易マスターであり、`status`、`confidence`、`sourceIds`、`checkedAt`、`scopeType`、施設、規制を保持できない。

したがって、調査JSONをそのまま本番型へコピーしてはならない。人間によるcurationを間に置き、情報を落とす場合の理由と警告を残す。

## 3. 現在の本番値

```ts
{
  id: "karatsu-east-port",
  name: "唐津東港",
  areaName: "唐津湾",
  latitude: 33.459,
  longitude: 129.993,
  spotType: "堤防",
  shoreAccess: "足場良い",
  targetSpecies: ["青物", "真鯛", "サバ", "アジ"],
  recommendedMethods: ["ジギング", "コマセ", "サビキ"],
  coordinatePrecision: "rounded"
}
```

主な問題は次のとおり。

- 座標は東港地区の代表点であり、一般利用可能な釣り位置や入口ではない
- 東港地区は岸壁、防波堤、護岸等を含むため、地点全体を`堤防`と断定すると範囲を狭く見せる
- `足場良い`を直接裏付ける調査根拠がない
- `青物`、`真鯛`、`サバ`を唐津東港の対象魚種とする直接根拠が調査データにない
- `ジギング`、`コマセ`、`サビキ`を推奨する直接根拠が調査データにない
- 一般立入可能範囲、駐車場、トイレ、釣り禁止範囲は未確認である

## 4. 人間確定ステータス

### `adopt`

次をすべて満たす場合に使用する。

- 値の意味と調査対象範囲が本番項目の意味に一致する
- 公式・公的情報で直接確認できる、または複数の独立情報源が一致する
- 安全性、立入可否、現在の釣果を過大に示さない
- 現行型への変換で重要な注意事項を失わない

### `adopt_with_warning`

値は参考表示できるが、対象範囲、時期、出典の性質などの制約を同じ利用画面で明示する必要がある場合に使用する。

警告を画面または地点noteへ表示できない場合は`hold`へ戻す。

### `hold`

次のいずれかに該当する場合に使用する。

- 根拠が弱い、古い、単独の民間情報のみ
- 調査結果はあるが、現行本番型では意味を正しく表現できない
- production enumに対応する値がない
- 一般立入可能な実釣位置と地区全体を区別できない
- 追加の公式確認、現地確認、人間判断が必要

### `reject`

次のいずれかに該当する場合に使用する。

- 調査結果と矛盾する
- 根拠なしに安全性、利用可否、釣果、釣法を断定する
- 地区代表点を実釣位置として扱う
- 別魚種への不適切な統合や、未確認値の推測補完を行う

## 5. 属性別比較と推奨判断

| 属性 | 現行本番値 | 調査結果 | 推奨判断 | 推奨投影・理由 |
| --- | --- | --- | --- | --- |
| `id` | `karatsu-east-port` | 同一 | `adopt` | 変更しない |
| 名称 | 唐津東港 | 唐津東港、別名: 唐津港東港地区・東港地区 | `adopt` | 表示名は唐津東港を維持。別名は現行型で保持できないため調査レイヤーに残す |
| `areaName` | 唐津湾 | 佐賀県唐津市、唐津湾内の港湾地区 | `adopt` | 唐津湾を維持 |
| 対象範囲 | 暗黙に1釣り場 | 東港地区全体の代表点。一般利用可能な立ち位置ではない | `adopt_with_warning` | noteに「港湾地区の代表点。釣り位置・入口を示さない」を必須表示 |
| 緯度経度 | `33.459, 129.993` | 同値、`inferred / high` | `adopt_with_warning` | 数値は維持。ただしaccess pointとして扱わない |
| `coordinatePrecision` | `rounded` | 地区代表点 | `adopt` | `approximate`へ変更する案。丸め精度より、実地点ではない意味を優先する |
| `spotType` | `堤防` | `port / breakwater / revetment`、地区全体 | `reject`（現行値） | 現行enumでは`その他`を推奨し、noteで「港湾地区（岸壁・防波堤・護岸を含む）」と補足する。将来`港湾地区`enumを追加する場合は再投影する |
| `shoreAccess` | `足場良い` | 足場・一般立入可能範囲は未確認 | `reject`（現行値） | `不明`へ変更する。防波堤・護岸の存在から安全性を推測しない |
| アジ | 対象魚種に含む | 独立した民間情報2件、`confirmed / medium` | `adopt_with_warning` | `アジ`を候補にできる。ただし過去の公開情報に基づく参考魚種で、現在の釣果・時期を保証しないnoteが必要 |
| スズキ | なし | 独立した民間情報2件、`confirmed / medium` | `adopt_with_warning` | production enumの`シーバス`へ名称対応して候補にできる。スズキとシーバスの名称対応をcuration理由へ残す |
| クロダイ | なし | 独立した民間情報2件、`confirmed / medium` | `adopt_with_warning` | production enumの`チヌ`へ名称対応して候補にできる。クロダイとチヌの名称対応をcuration理由へ残す |
| コノシロ | なし | 独立した民間情報2件、`confirmed / medium` | `hold` | production enum未対応。enum追加の必要性を魚種マスターIssueで判断する |
| キビレ | なし | 民間集約情報1件、`confirmed / low` | `hold` | 単独・低確度かつenum未対応。`チヌ`へ統合しない |
| シログチ | なし | 民間集約情報1件、`confirmed / low` | `hold` | 単独・低確度かつenum未対応 |
| 青物 | 対象魚種 | 調査JSONに直接根拠なし | `reject`（現行値） | 削除案。周辺地域の一般的な印象で補完しない |
| 真鯛 | 対象魚種 | 調査JSONに直接根拠なし | `reject`（現行値） | 削除案 |
| サバ | 対象魚種 | 調査JSONに直接根拠なし | `reject`（現行値） | 削除案 |
| 推奨釣法 | ジギング・コマセ・サビキ | 足元・近距離の実釣例はあるが、推奨釣法の直接根拠なし | `reject`（現行値） | いったん空配列を推奨。魚種から釣法を自動推定しない |
| 底質 | 本番項目なし | 砂・泥、`inferred / low` | `hold` | 現行型へ投影しない。将来の地点属性レイヤーで保持する |
| 水深 | 本番項目なし | 普通、`inferred / low`。施設値と実釣位置の対応は未確認 | `hold` | 現行型へ投影しない。SCOREへも使用しない |
| 河川影響 | 本番項目なし | 弱い、`inferred / low` | `hold` | 観測値ではないためSCOREへ使用しない |
| 潮通し | 本番項目なし | unknown | `hold` | 推測補完しない |
| 常夜灯 | 本番項目なし | unknown | `hold` | 港湾照明と釣り場を照らす常夜灯を混同しない |
| 駐車場 | 本番項目なし | 釣り目的利用可否unknown | `hold` | フェリー駐車場の存在を釣り用駐車場として表示しない |
| トイレ | 本番項目なし | unknown | `hold` | 未確認を「なし」とも「あり」とも表示しない |
| 釣り禁止 | 本番項目なし | 一部禁止との民間情報、`confirmed / low`。範囲・根拠・現行性は公式未確認 | `adopt_with_warning` | 禁止範囲を断定せず、「立入・釣り可否は現地表示と港湾管理者の最新案内を確認」とnote表示する |
| 立入禁止 | 本番項目なし | unknown | `hold` | 釣り禁止と立入禁止を同一視しない |
| 工事・閉鎖 | 本番項目なし | unknown | `hold` | 情報が見つからないことを「なし」と扱わない |

## 6. 推奨する最小本番投影案

人間承認後の後続Issueでは、最小差分として次を候補とする。

```ts
{
  id: "karatsu-east-port",
  name: "唐津東港",
  areaName: "唐津湾",
  latitude: 33.459,
  longitude: 129.993,
  spotType: "その他",
  shoreAccess: "不明",
  targetSpecies: ["アジ", "シーバス", "チヌ"],
  recommendedMethods: [],
  notes: [
    "唐津港東港地区の代表点です。一般利用可能な釣り位置や入口を示すものではありません。",
    "立入・釣り可否は、現地表示と港湾管理者の最新案内を確認してください。",
    "魚種は過去の公開情報に基づく参考情報で、現在の釣果や時期を保証しません。"
  ],
  coordinatePrecision: "approximate"
}
```

この案は承認前の推奨値であり、本書のマージだけでは本番値として確定しない。

### 安全優先の代替案

`targetSpecies`の注意文が画面に確実に表示されない場合、魚種も空配列にして保留する。

```ts
targetSpecies: []
```

`notes`が現在のカード・地図ポップアップで利用者へ届かない場合、`adopt_with_warning`項目は実装してはならない。先に注意表示のUI設計が必要である。

## 7. 人間確定時の確認項目

本番反映Issueを作成する前に、ユーザーが次を明示的に決定する。

- [ ] `spotType`を暫定的に`その他`とするか
- [ ] `shoreAccess`を`不明`へ変更するか
- [ ] `coordinatePrecision`を`approximate`へ変更するか
- [ ] `アジ / シーバス / チヌ`を注意付き参考魚種として採用するか
- [ ] `青物 / 真鯛 / サバ`を削除するか
- [ ] 推奨釣法を空配列にするか
- [ ] 3つの注意noteを利用者画面へ表示できるか
- [ ] 注意noteを表示できない場合、魚種も保留するか

## 8. curation記録形式

後続実装では、調査原文を直接書き換えず、人間判断を別ファイルで記録することを推奨する。

候補パス:

```txt
data/curation/fishing-spots/karatsu-east-port.production.json
```

例:

```json
{
  "curationVersion": "1.0.0",
  "spotId": "karatsu-east-port",
  "researchSource": "data/research/fishing-spots/karatsu-east-port.json",
  "researchSchemaVersion": "1.0.0",
  "status": "approved",
  "curatedAt": "YYYY-MM-DD",
  "curator": "repository-owner",
  "fields": [
    {
      "path": "shoreAccess",
      "decision": "reject",
      "previousValue": "足場良い",
      "productionValue": "不明",
      "reason": "足場と一般立入可能範囲を直接支える根拠がない",
      "researchPaths": ["restrictions.entryProhibited", "attributes.spotType"]
    }
  ],
  "warnings": [
    "代表点であり実釣位置ではない",
    "立入・釣り可否は現地表示と管理者案内を優先する"
  ],
  "approvedBy": "repository-owner",
  "approvedAt": "YYYY-MM-DD"
}
```

### curation記録のルール

- 調査原文とAI比較資料は変更しない
- `previousValue`、`productionValue`、理由を必須にする
- 名称対応を行う場合は変換理由を記録する
- `hold`項目は本番値へ投影しない
- 安全・規制項目は、根拠がない状態から肯定値を生成しない
- 人間承認者と承認日を記録する

## 9. 後続実装の順序

1. 本書の推奨案をユーザーが承認する
2. curation JSONと、その構造を検証するテストを追加する
3. `src/data/fishingSpots.ts`の唐津東港だけを更新する
4. `fishing_spots`の同一rowを更新するSupabase migrationを追加する
5. 静的fallbackとDB rowを同じ期待値で検証するテストを追加する
6. `notes`が地点カード・地図ポップアップ等の利用者画面へ表示されることを確認する
7. PC・スマホのVercel Previewで表示を確認する
8. ユーザーがマージを判断する
9. 本番反映後、Supabaseの実rowと静的fallbackが一致することを確認する

## 10. Supabase・静的fallbackの同期方針

本番反映時は、片方だけを変更しない。

- 静的fallback: `src/data/fishingSpots.ts`
- DB: 新規migrationで`fishing_spots.id = 'karatsu-east-port'`を更新
- mapper/repository: 現行型の範囲で変更不要か確認する
- migration適用前後の値をPR本文へ記録する
- DB未設定、DBエラー、空結果の各fallbackで同じ表示になることを確認する

手動SQLを正本にせず、migrationを正本とする。

## 11. テスト方針

後続実装では最低限次を確認する。

- curation JSONが想定構造に適合する
- `karatsu-east-port`の静的値が承認済みcuration値と一致する
- Supabase migrationの更新値が静的値と一致する
- `mapFishingSpotRow`が空の`recommendedMethods`と`不明`の`shoreAccess`を保持する
- 未対応魚種が`targetSpecies`へ混入しない
- `青物 / 真鯛 / サバ`が唐津東港へ残っていない
- `notes`に代表点・立入確認・魚種注意が含まれる
- SCORE、釣果、他地点の値が変更されていない
- lint / typecheck / test / buildが成功する

## 12. rollback方針

問題が発生した場合は履歴を書き換えず、次の組み合わせで戻す。

- 静的fallback変更をrevertするPR
- Supabaseは元値へ戻す新規migration
- curation記録は削除せず、`status: superseded`等で後続判断を残す
- rollback理由、影響、確認結果をIssueへ記録する

## 13. 未決事項

- 現在のUIで`notes`が、地点一覧・カード・ポップアップのどこまで表示されるか
- 参考魚種と「おすすめ対象魚種」を将来分離するか
- `港湾地区`を`FishingSpotType`へ追加するか
- 調査レイヤーの`status / confidence / checkedAt / sources`を画面へ表示するか
- 施設・規制を本番マスターへ持たせる型・DB設計
- 魚種enumへコノシロ、キビレ、シログチを追加するか
- 情報の再確認期限と更新フロー

これらは本番値の最小修正と分離し、必要に応じて別Issueで扱う。

## 14. 結論

唐津東港は現在の本番値をそのまま維持しない。

推奨方針は次のとおり。

- 地区代表点であることを明示する
- `堤防`を`その他`へ、`足場良い`を`不明`へ変更する
- `青物 / 真鯛 / サバ`と既存推奨釣法を削除する
- `アジ / シーバス / チヌ`は、注意文が利用者へ表示できる場合だけ採用する
- 規制・施設・底質・水深・潮通し等は、現行型へ無理に押し込まず保留する
- 静的fallbackとSupabaseを同一PR・同一承認値で更新する

本書のマージ後も、本番データは未変更のままとする。次のIssueでユーザー承認済み値のみを実装する。
