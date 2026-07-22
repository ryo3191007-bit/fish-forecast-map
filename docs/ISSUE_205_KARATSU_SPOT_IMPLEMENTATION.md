# Issue #205 唐津市釣り場地点拡張 実装メモ

調査日: 2026-07-22

正本入力:

- `data/curation/fishing-spots/issue-205-karatsu-implementation-input.json`

## 実装対象

次の10地点を新規地点として追加する。座標は港の代表点であり、実釣位置、堤防先端、駐車位置を示すものではない。`coordinatePrecision` は全て `approximate` とする。

| ID | 地点名 | 緯度 | 経度 |
|---|---|---:|---:|
| `ouka-port` | 相賀漁港 | 33.506447 | 129.956971 |
| `kodomo-port` | 小友漁港 | 33.546840 | 129.906629 |
| `kabeshima-port` | 加部島漁港 | 33.556550 | 129.889400 |
| `hado-port` | 波戸漁港 | 33.546300 | 129.859000 |
| `haregi-port` | 晴気漁港 | 33.435100 | 129.811000 |
| `tobo-port` | 唐房漁港 | 33.482000 | 129.940000 |
| `minatohama-port` | 湊浜漁港 | 33.526093 | 129.954970 |
| `nagoya-port` | 名護屋漁港 | 33.532610 | 129.877582 |
| `yobuko-port` | 呼子漁港 | 33.545850 | 129.890760 |
| `takakushi-port` | 高串漁港 | 33.422500 | 129.826000 |

## 今回active化しない地点

候補一覧と採否理由はJSONへ残すが、地点マスターには追加しない。

- 座標再確認: 浜崎漁港、屋形石漁港、大浦漁港
- 座標・利用範囲再確認: 駄竹漁港
- 制限情報のため保留: 串浦漁港、京泊漁港
- 離島の第2弾候補: 高島、大泊、加唐島、松島、馬渡島、向島、神集島、小川島の各漁港

## データ方針

1. 既存の `hamasaki-beach`、`niji-matsubara`、`karatsu-east-port`、`karatsu-west-port`、`yobuko-area` は削除・改名しない。
2. 既存釣果を新地点へ自動で再割当しない。
3. `shoreAccess` は10地点すべて `不明`。釣り可能・安全と断定しない。
4. masterの `targetSpecies` と `recommendedMethods` は空配列とする。
5. JSONの `historicalTargetSpecies`、`facilities`、`geography`、`restriction` は地点詳細curationへ登録してよい。ただし民間由来情報は `weak_evidence / low` とし、SCOREへ入力しない。
6. 公的根拠は `has_evidence`、民間の地点固有参考情報は `weak_evidence`、調査しても現在の状況を確定できないものは `researched_unknown` とする。
7. 規制情報を設備・利用可能情報より優先して表示する。
8. 新規10地点は全てJMA警報区域の佐賀県唐津市へマッピングする。
9. migrationはforward-only。既存データを削除または上書きしない。
10. DB取得失敗時も静的fallbackで同じ10地点を利用できるようにする。

## 既存広域地点との関係

- `kodomo-port`、`kabeshima-port`、`hado-port`、`nagoya-port`: `yobuko-area` の広域文脈に含まれる個別地点
- `yobuko-port`: `yobuko-area` 内の具体的な漁港地点
- `tobo-port`: `karatsu-west-port` 近隣だが別地点。既存IDを置換しない
- その他: 独立地点

この関係は自動移行ロジックではなく、候補監査データまたは文書として保持する。

## 実装範囲

- 地点候補・採否理由・source metadataの保持
- 静的地点マスターへの10地点追加
- forward-only migrationおよび必要なseed同期
- 地点詳細curationとアプリ同梱fallbackへの追加
- 地図、地点評価、環境取得、釣果登録での利用
- JMAエリアマッピング
- fallbackマージ処理の修正
- 横展開手順の文書化
- 自動テスト

UIへ地点を個別ハードコードしない。既存の地点マスター／repositoryから動的に表示させる。

## fallbackの注意

`src/lib/fishingSpotDetailFallback.ts` は、既存curationが1件でもある地点について早期returnする構造により、新規地点の安全なfallbackが生成されない可能性がある。Issue #205 curationとのマージ後、欠けた項目だけ安全なfallbackを生成するよう修正する。

## 必須検証

- 新規IDの一意性
- 必須項目と座標範囲
- 10地点だけがactive masterへ追加されること
- 保留6地点と離島8地点がactive化されないこと
- DBと静的fallbackの地点一覧整合
- 地図・地点評価・環境取得・釣果登録の地点候補へ反映
- JMAエリアマッピング漏れなし
- `unresearched` と `researched_unknown` の区別
- 既存地点ID・既存釣果を破壊しないこと
- `npm run lint`
- `npm run typecheck`
- `npm test`
- `npm run build`
- `git diff --check`

## 禁止事項

- 外部サイト本文・画像・評価・地点DBの転載
- スクレイピング
- 未確認地点を釣り可能・安全と断定
- SCORE v2配点変更
- remote Supabaseへのmigration適用
- Issueクローズ、PRマージ

## 今後の地域追加手順とsource管理

1. 調査仕様とevidence policyに従い、候補を `activeCandidates`、座標・規制確認待ち、離島等の後続候補へ分離する。active化するIDは既存masterと重複しないことを確認する。
2. 採用候補だけを静的master、bootstrap seed、forward-only migrationへ同じID・座標・安全な最小値で追加する。既存IDの置換や既存釣果の再割当は行わない。
3. source metadataは候補監査JSONを正本とし、出典ごとに一意なsource ID、種別、確認日、信頼度を保持する。公的根拠と民間参考情報を混在させず、民間情報は `weak_evidence / low` としてSCOREへ入力しない。
4. 地点詳細curationをアプリ同梱fallbackとmigrationへ同期し、現行利用可否を確定できなければ値を空にした `researched_unknown` とする。未調査の `unresearched` と区別する。
5. 地域に対応するJMA自治体コードを明示し、地点masterを受け取る地図、地点評価、環境、釣果登録へ動的に反映されることを専用テストで確認する。
6. migrationはremoteへ直接適用せず、migration safety、bootstrap schema diff、lint、typecheck、test、buildをPR上で検証する。復旧時は新規地点を非active化する後続migrationを作り、既存レコードを削除しない。
