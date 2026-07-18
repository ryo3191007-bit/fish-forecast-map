# Issue #165 地域別10地点 釣り場属性調査レビュー

最終更新: 2026-07-18 JST

## 結論

Issue #165の10地点JSONは、初回作成内容にplaceholder URLとsourceの過大な`supports`指定が含まれていたため、全件を`needs_revision`として再監査した。

- 10地点に含まれていた`example.com`の自治体source・二次source計20件を削除した。
- 地理院地図だけでは直接支えられない自治体、河川影響、外海露出、施設、規制等の断定を撤回した。
- 座標は公式座標ではなく、レビュー用の`map_measurement / inferred / low`の概略代表点へ変更した。
- 直接根拠を確認できない属性は`unknown / low / supportingSourceIds: []`へ戻した。
- 現在は本番地点マスター、Supabase、UI、SCOREへ採用できない。

## 地点別状態

| バッチ | spotId | 地点名 | scopeType | 暫定spotType | 状態 | 主な追加確認 |
|---|---|---|---|---|---|---|
| A | `nokita-beach` | 野北海岸 | district | sandy_beach（inferred） | needs_revision | district範囲、管理者、規制、施設 |
| A | `kishi-port` | 岐志漁港 | facility | fishing_port（inferred） | needs_revision | 公的漁港feature、管理者、規制、施設 |
| A | `fukuyoshi-port` | 福吉漁港 | facility | fishing_port（inferred） | needs_revision | 公的漁港feature、管理者、規制、施設 |
| B | `hamasaki-beach` | 浜崎海岸 | district | sandy_beach（inferred） | needs_revision | 海岸範囲、管理者、規制、施設 |
| B | `niji-matsubara` | 虹の松原周辺 | district | sandy_beach（inferred） | needs_revision | district範囲、保安林・海岸利用条件 |
| B | `karatsu-west-port` | 唐津西港 | facility | port（inferred） | needs_revision | 港湾管理区域、立入・釣り可否 |
| B | `yobuko-area` | 呼子周辺 | district | unknown | needs_revision | district内の個別地点・施設差、規制 |
| C | `imari-inner-bay` | 伊万里湾奥 | district | unknown | needs_revision | 湾奥範囲、水深・底質、管理者、規制 |
| C | `takashima-area` | 鷹島周辺 | district | unknown | needs_revision | 島内の個別地点差、危険箇所、管理者 |
| C | `tabira-port` | 田平港 | facility | port（inferred） | needs_revision | 港湾・フェリー管理区域、立入・釣り可否 |

## source採否ルール

### supportingとして使用できるもの

source本文・データ・地図表現が対象Schema pathを直接支える場合だけ、`supports`と`supportingSourceIds`へ登録する。

### checkedに限定するもの

確認はしたものの、対象値を直接支えないsourceは`checkedSourceIds`へ置き、値は推測で確定しない。

### 使用禁止

- placeholder、架空、到達不能、内容不一致のURL
- 検索結果、トップページ、カテゴリ一覧だけのURL
- publisherや内容を確認していないURL
- 地図上で見えるという理由だけで、立入可否、釣り可否、駐車場、トイレ、常夜灯、水深、底質、潮流、魚種を確定すること

## scopeと代表点

- `facility`: 港・漁港等の施設全体を示す概略代表点。岸壁先端、入口、駐車位置、実釣ピンではない。
- `district`: 海岸、湾奥、島・地域周辺を示す概略代表点。district全域の施設・規制・魚種を一括で断定しない。
- 現在の10地点の座標は、地理院地図上のレビュー用測定点であり、公式座標として扱わない。

## 今後の完了条件

1. 各地点に対して実在する公式・公的sourceを調査する。
2. URL、publisher、sourceType、sourceGroup、内容を一件ずつ確認する。
3. sourceが直接支えるSchema pathだけを`supports`へ登録する。
4. `value / status / confidence / evidence / note`を一致させる。
5. 管理者・自治体等の現行情報がない施設・規制項目はunknownを維持する。
6. Schema検証、copy検知、lint、typecheck、test、build、GitHub Actionsを再実行する。
7. 人間レビュー完了後も、利用者判断なしにDraft解除・マージ・本番反映を行わない。
