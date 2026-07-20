# Issue #195 気象庁警報・注意報連携の事前調査と推奨案

調査日: 2026-07-20  
状態: **実装前の提案（利用者未承認）**

## 1. 結論

選択日時を判定するには、次の2電文を役割分担して使う必要がある。`VPWS50` だけを全将来日時へ適用する従来案は採用しない。

| 電文 | 公式名称 | 役割 | 時間軸 |
| --- | --- | --- | --- |
| `VPWS50` | 気象警報・注意報（R06）（集約通報） | 全国の**現在発表中**の状態を確認する集約スナップショット | 現在付近 |
| `VPWP50` | 気象警報・注意報時系列情報（R06） | 市町村等ごとに、**明日までの見通し**を時間帯別に確認する時系列情報 | 電文の `TimeDefine` が覆う期間 |

これは、2026年の防災気象情報体系整理後の[気象庁防災情報XML一覧表](https://xml.kishou.go.jp/jmaxml_20260129_format_v1_3_hyo1_1.pdf)、[電文別解説資料セット](https://xml.kishou.go.jp/jmaxml_20260707_Manual(pdf).zip)、[公式サンプル電文セット](https://xml.kishou.go.jp/jmaxml_20260326_Samples.zip)、および[体系整理用の全要素・全細分区サンプル](https://xml.kishou.go.jp/SampleXml_Weather%20warning,%20advisory,%20etc_20251217.zip)を基準に確認した。2026-07-20には現行 `regular.xml` と福岡・佐賀・長崎の実電文も確認した。

内部状態は `blocked` / `clear` / `unknown` の3値を維持する。ただし `clear` は「対象日時・対象区域・対象現象に対象状態がない」という限定的な意味であり、安全の保証ではない。アプリコード、DB、UIは本PRでは変更しない。

## 2. 公式情報と実地確認

### 2.1 参照した公式URL

- [情報の取得方法（PULL型Atomフィード）](https://xml.kishou.go.jp/xmlpull.html)
- [高頻度・定時フィード `regular.xml`](https://www.data.jma.go.jp/developer/xml/feed/regular.xml)
- [高頻度・随時フィード `extra.xml`](https://www.data.jma.go.jp/developer/xml/feed/extra.xml)
- [長期・定時フィード `regular_l.xml`](https://www.data.jma.go.jp/developer/xml/feed/regular_l.xml)
- [技術資料（現行フォーマット、コード表、解説資料、サンプル）](https://xml.kishou.go.jp/tec_material.html)
- [2026-07-07コード管理表一式](https://xml.kishou.go.jp/jmaxml_20260707_code.xlsx)
- [2026-07-07個別コード表](https://xml.kishou.go.jp/jmaxml_20260707_Code.zip)
- [気象庁防災情報XML Q&A](https://xml.kishou.go.jp/qanda.html)
- [更新情報](https://xml.kishou.go.jp/revise.html)
- [気象庁ホームページ利用規約](https://www.jma.go.jp/jma/kishou/info/coment.html)
- [XML電文利用時の留意事項](https://xml.kishou.go.jp/considerationforxml.pdf)

高頻度フィードは毎分更新で直近少なくとも10分、長期フィードは毎時更新で数日間の入電を掲載する。ただしQ&A上、保存期間は保証されず、無料PULL配信にSLAやリアルタイムサポートもない。履歴DBや配信保証として扱わない。

### 2.2 2026-07-20の実地確認結果

現行 `regular.xml` には `VPWS50` と `VPWP50` の双方が存在した。`VPWP50` のAtom entryは例として次の形だった。

- `title`: `気象警報・注意報時系列情報（Ｒ０６）`
- `id` / `link@href`: `..._VPWP50_400000.xml`（福岡県）、`..._410000.xml`（佐賀県）、`..._420000.xml`（長崎県）
- `updated`: Atomへの掲載更新時刻
- `author/name`: 発表官署
- `content`: `【福岡県警戒・注意事項時系列情報】` 等

同日に取得した3県の実電文は `Control/Status=通常`、`Head/InfoKind=気象警報・注意報時系列`、`InfoKindVersion=1.5_0` だった。11時発表・12時対象開始で、3時間の時間帯を並べ、翌日24時までを覆っていた。これは実地観測であって、将来の発表時刻・本数・終端を固定仕様としてハードコードする根拠にはしない。

公式サンプル4本では5時、11時、17時、23時発表の例と、各発表後の時間帯が確認できた。現行フィードでは定時発表に加えて同一府県の近接した更新も観測したため、最新時刻だけで決め打ちせず、臨時更新を含めて対象府県の最新正常電文へ置換する。

## 3. `VPWS50` と `VPWP50` の取得仕様

### 3.1 `VPWS50`: 現在状態

`VPWS50` は `regular.xml` のAtom entryから、`title` が公式名称と一致し、かつ `link@type=application/xml` のURL basenameに `_VPWS50_` を含むものを候補にする。XML取得後に次も検証し、Atom文字列だけを信頼しない。

- `Control/Title=気象警報・注意報（Ｒ０６）（集約通報）`
- `Control/Status=通常`
- `Head/InfoKind` と対応バージョンが許可リスト内
- XML名前空間、必須要素、対象市町村コードが解釈可能

全国の現在状態を再構成済みの集約スナップショットとして使う。任意の将来時間帯の予報には使わない。

### 3.2 `VPWP50`: 明日までの時系列

#### Atomからの識別

対象フィードは**高頻度・定時 `regular.xml`**を第一取得元とする。掲載期間内の再取得・障害調査には `regular_l.xml` を補助利用できるが、履歴保証にはしない。2026-07-20の `extra.xml` には `VPWP50` を確認できなかったため、随時フィードを必須取得元にはしない。

Atom entryは次の全条件で候補化する。

1. `title=気象警報・注意報時系列情報（Ｒ０６）`。
2. `link@type=application/xml` があり、HTTPSかつ公式hostである。
3. `link@href` のbasenameに `_VPWP50_` を含む。
4. 末尾の府県予報区コードが対象地点の府県（`400000`、`410000`、`420000`）に一致する。
5. entryの `updated` を取得順の補助に使うが、最終判定はXML内部の `Control/DateTime` と `Head/ReportDateTime` による。

XML取得後は `Control/Title`、`Control/Status`、`Head/InfoKind=気象警報・注意報時系列`、既知の `InfoKindVersion` を再検証する。ファイル名、entry title、XMLの三者が矛盾すれば `unknown` とする。

#### XML内の対象期間・区域・現象・状態

公式サンプルと実電文で確認した主構造は次のとおりである。

```text
Report
├─ Control: Title / DateTime / Status / PublishingOffice
├─ Head: ReportDateTime / TargetDateTime / InfoType / InfoKind / InfoKindVersion
└─ Body
   └─ MeteorologicalInfos type="量的予想時系列（市町村等）"
      └─ TimeSeriesInfo
         ├─ TimeDefines
         │  └─ TimeDefine@timeId: DateTime / Duration / Name
         └─ Item
            ├─ Kind: Status / DateTime@type="発表時刻" / Property
            │  └─ Type + 各Part/Baseの値（refIDで時間帯を参照）
            └─ Area: Name / Code
```

- 対象時間帯は `TimeDefine/DateTime` から `Duration` の半開区間 `[start, start + duration)` とする。表示名だけを解析しない。
- `Kind/Property/Type` には `風危険度`、`波危険度`、`雷危険度`、`大雨浸水危険度`、`高潮危険度` 等があり、`Significancy@refID` が時間帯を参照する。名称と公式コードを許可リストで判定する。
- `Significancy/Name`・`Code` は、警報級・注意報級・それ未満・値なし等の状態を表す。`00`（値なし）や未知コードを「対象なし」に変換しない。
- 量的要素（風向風速、波高、雨量等）も含まれるが、Issue #195の公式警報等ゲートは危険度要素を主とし、独自閾値との混同を避ける。
- `Area/Code` は7桁の「市町村等コード」であり、地点名ではなくコードで照合する。

同一 `Property/Type` に複数のBase（陸上・海上等）があり得る。対象地点に適用可能な区分が1つでも対象状態なら `blocked`、適用区分を確定できない又は一部しか解析できないなら `unknown` とし、都合のよい値だけで `clear` にしない。

### 3.3 更新、freshness、異常系

- 同じ府県は正常に解析できた最大 `Head/ReportDateTime` を採用する。同時刻なら `Control/DateTime`、Atom `updated`、URLを監査情報として保持し、内容矛盾は `unknown` とする。
- 定時刻の決め打ちはしない。臨時・訂正相当の新電文が来たら、対象期間を含む最新電文へ原子的に置換する。
- `VPWS50` のfreshness初期提案は30分。これは約10分間隔という観測に余裕を持たせた値で、公式SLAではない。
- `VPWP50` は「受信から一律30分」で無効にすると定時間隔との整合を失う。初期提案は、`ReportDateTime` が未来・逆行していないことに加え、**次の定時発表を十分に過ぎた目安として8時間**を上限にし、かつ選択日時が最新電文の実際の `TimeDefine` 区間内であることを必須とする。8時間は承認対象であり公式保証ではない。
- HTTP失敗、timeout、非XML、サイズ超過、XML外部実体、未知schema/`InfoKindVersion`、必須値欠損、参照先 `timeId` 不在、対象市町村欠落、時計ずれは `unknown`。
- `Control/Status` は `通常` のみ本番判定へ採用する。`試験`・`訓練`その他未知値は監査ログへ分離し `unknown`。
- 前回 `blocked` は解除又は新しい正常情報を確認するまで安全側に保持する。前回 `clear` はTTL後に継続しない。

## 4. 18地点と区域コード

### 4.1 区域単位の検証結果

`VPWP50` の `MeteorologicalInfos type="量的予想時系列（市町村等）"` は `Area/Code` に `code.AreaInformationCity`（市町村等コード）を使う。福岡・佐賀・長崎の2026-07-20実電文で、`4023000` 糸島市、`4120200` 唐津市、`4120500` 伊万里市、`4220700` 平戸市、`4220800` 松浦市を実際に確認した。

したがって、既存の `VPWS50` 用「市町村等コード」は**18地点すべてでそのまま流用できる**。「まとめた地域コード」は補助表示用であり `VPWP50` の主キーには使わない。府県別のAtom entry選択用に府県予報区コードを静的に追加する。

### 4.2 レビュー可能な静的対応表

| 地点（spotId） | 府県entryコード | 市町村等コード | 市町村等 |
| --- | ---: | ---: | --- |
| 野北漁港 (`nokita-port`) | `400000` | `4023000` | 福岡県糸島市 |
| 野北海岸 (`nokita-beach`) | `400000` | `4023000` | 福岡県糸島市 |
| 芥屋漁港 (`keya-port`) | `400000` | `4023000` | 福岡県糸島市 |
| 芥屋大門周辺 (`keya-gate`) | `400000` | `4023000` | 福岡県糸島市 |
| 船越漁港 (`funakoshi-port`) | `400000` | `4023000` | 福岡県糸島市 |
| 岐志漁港 (`kishi-port`) | `400000` | `4023000` | 福岡県糸島市 |
| 福吉漁港 (`fukuyoshi-port`) | `400000` | `4023000` | 福岡県糸島市 |
| 浜崎海岸 (`hamasaki-beach`) | `410000` | `4120200` | 佐賀県唐津市 |
| 虹の松原周辺 (`niji-matsubara`) | `410000` | `4120200` | 佐賀県唐津市 |
| 唐津東港 (`karatsu-east-port`) | `410000` | `4120200` | 佐賀県唐津市 |
| 唐津西港 (`karatsu-west-port`) | `410000` | `4120200` | 佐賀県唐津市 |
| 呼子周辺 (`yobuko-area`) | `410000` | `4120200` | 佐賀県唐津市 |
| 伊万里湾奥 (`imari-inner-bay`) | `410000` | `4120500` | 佐賀県伊万里市 |
| 福島周辺 (`fukushima-area`) | `420000` | `4220800` | 長崎県松浦市 |
| 鷹島周辺 (`takashima-area`) | `420000` | `4220800` | 長崎県松浦市 |
| 田平港 (`tabira-port`) | `420000` | `4220700` | 長崎県平戸市 |
| 平戸瀬戸周辺 (`hirado-seto`) | `420000` | `4220700` | 長崎県平戸市 |
| 生月島方面 (`ikitsuki-area`) | `420000` | `4220700` | 長崎県平戸市 |

実装時も地点名・座標から行政区域を推測せず、2026-07-07公式コード表をfixture化してこの対応をレビューする。行政界をまたぐ海域や代表地点範囲を変更する場合だけ、複数コード対応を別Issueで再検討する。

## 5. 対象現象

| 判定グループ | `VPWS50` の対象 | `VPWP50` で照合する主な危険度Type |
| --- | --- | --- |
| 風 | 強風注意報、暴風警報・特別警報 | `風危険度`（海上/陸上区分も確認） |
| 波 | 波浪注意報、波浪警報・特別警報 | `波危険度` |
| 雷 | 雷注意報 | `雷危険度` |
| 大雨 | 大雨注意報、警報、危険警報、特別警報 | `大雨浸水危険度`、必要に応じ `土砂災害危険度` |
| 高潮 | 高潮注意報、警報、危険警報、特別警報 | `高潮危険度` |

正確なName/Code許可リストは実装時に2026年版コード管理表から生成・fixture化する。未知の上位コード、`値なし`、要素欠損を無視して `clear` にしない。風雪系を含めるか、高波・高潮で市町村より細かい区分を使うかは利用者承認事項である。

## 6. 選択日時ごとの判定案

### 6.1 時間軸別ルール

「現在付近」は実装時の時計ずれ許容値を含む短い窓（初期提案: 現在±30分）とする。

| 選択日時 | JMA判定 | 理由 |
| --- | --- | --- |
| 現在付近 | 新鮮な `VPWS50` を第一に現在の発表状態を判定。`VPWP50` は補助照合 | 集約通報が現在状態の正本候補 |
| `VPWP50` の `TimeDefine` 区間内 | 対象市町村・対象時間帯・対象危険度のSignificancyを判定 | 将来時間帯に対応する公式見通し |
| 最後の `TimeDefine` 終端より先 | JMAは `out-of-range`（`unknown` の理由コード） | 明日までの情報から先を推測しない |
| 過去 | 保存した当時の正常電文がなければ `unknown` | Atomフィードを履歴DBとして扱わない |

現在の `VPWS50` が `blocked` でも、その状態が明日午後まで継続すると `VPWS50` 自体からは断定できない。したがって**現在警報があるだけで全将来日時を一律blockedにする旧案は不採用**とする。将来選択時刻が `VPWP50` 内なら、その時間帯の値で判定しつつ、「現在は発表中」という別の注意を併記する案を推奨する。

### 6.2 矛盾・欠損・stale時の優先順位

1. 現在付近で新鮮な `VPWS50=blocked` は `blocked`。`VPWP50` が注意報級未満でも現在状態を上書きしない。
2. 将来の対象時間帯は、新鮮な `VPWP50=blocked` を採用する。`VPWS50=blocked` は「現在の注意」として残すが、その将来時間帯を自動でblockedにはしない。
3. 同じ対象時刻を両方が意味上覆い、片方がblocked・片方がclearなら安全側の `blocked`。ただしデータ矛盾も表示・記録する。
4. 対象時刻を担当する電文が欠損/stale/解析不能なら `unknown`。他方の電文が時間軸外なら代用しない。
5. `VPWP50` 対象期間外は `out-of-range` としてJMA判定を明示的に分離する。総合点非表示にするかOpen-Meteoのみへ進むかは未承認。
6. 前回blocked後に取得失敗した場合は解除未確認として総合点を抑止する。

## 7. Open-Meteoとの時間軸込み優先順位

JMAの対象時間帯内では `JMA blocked > JMA unknown > Open-Meteo危険 > Open-Meteo不明 > 両方クリア` とする。

| 対象日時のJMA状態 | Open-Meteo | 最終状態 | 総合点（初期提案） |
| --- | --- | --- | --- |
| `blocked` | 任意 | `blocked-jma` | 非表示 |
| `unknown`（欠損・stale・矛盾） | 任意 | `unknown-jma` | 非表示 |
| `clear` | 危険 | `blocked-open-meteo` | 非表示 |
| `clear` | 不明 | `unknown-open-meteo` | 非表示 |
| `clear` | クリア | `clear` | 表示可（安全保証表現はしない） |
| `out-of-range` | 危険/不明 | Open-Meteo側の状態 + `jma-out-of-range` | 非表示 |
| `out-of-range` | クリア | **未確定** | A: 非表示、又はB: JMA対象外を明示して表示 |

Open-Meteoは対象期間内のJMA blocked/unknownを上書きしない。一方、JMAの予報対象外までJMAが危険又は安全と推測することもしない。現在の `VPWS50` と将来の `VPWP50` の根拠、発表時刻、対象時間帯、Open-Meteo取得時刻を別々に保持・表示する。

## 8. 実装する場合の取得・解析案（承認後）

1. Next.jsサーバー側だけが公式Atom/XMLへアクセスし、ブラウザーから直接取得しない。
2. `regular.xml` を1回取得し、最新 `VPWS50` と対象3府県の最新 `VPWP50` を識別する。
3. URL単位の共有キャッシュ、固定timeout、応答サイズ上限、HTTPS host allowlist、外部実体無効のparser、schema/必須値検証を設ける。
4. 18地点の静的な府県entryコード・市町村等コードと、対象危険度コード許可リストをドメイン層に置く。
5. Atom `updated`、`Control/DateTime`、`Head/ReportDateTime`、受信時刻、対象 `TimeDefine` を保存する。電文URLごとに再取得しない。
6. 公式fixtureを基に、定時・臨時更新、発表、継続、解除、注意報級未満、値なし、訓練、未知schema、欠損、refID不整合、区域欠落、stale、期間外を純粋関数でテストする。
7. UIはblocked、unknown、out-of-rangeを区別し、理由・対象時間帯・出典を表示する。

cronや履歴DBは本Issueの前提にしない。アクセス量を計測し、必要な場合のみ別Issueで検討する。

## 9. 利用条件と制約

気象庁ホームページのコンテンツは出典記載等の利用規約に従う。XMLの第三者提供・Web掲載等は公式Q&Aの条件を確認し、画面には `出典: 気象庁`、原情報への導線、加工判定であること、航海・安全判断を代替しないことを表示する。

無償PULL配信にはSLAがなく、迅速・確実な配信には気象業務支援センターの有償配信が案内されている。有料サービスは低コスト方針により採用しない。同一XMLの再取得を避け、公式が示すアクセス負荷上の注意にも従う。

## 10. 未確定事項と利用者承認項目

次を明示承認されるまで実装へ進まない。

1. **対象期間外**: `out-of-range/unknown` として総合点を非表示にする（案A、安全側）か、「JMA対象外」を明示してOpen-Meteoのみで判定する（案B）か。
2. **併用方針**: 現在付近は `VPWS50`、`VPWP50` の対象期間内は該当時間帯を主判定とし、他方を補助注意として表示する方針。
3. **freshness**: `VPWS50=30分`、`VPWP50=8時間かつTimeDefine内` という初期値。いずれも公式SLAではなく運用値である。
4. **区域粒度**: `VPWP50` も市町村等コードを使い、表の18地点対応を流用し、府県entryコードを追加する方針。
5. **矛盾時**: 同じ時間軸ならblocked優先、時間軸外の電文は代用しない方針。
6. **対象現象**: 風雪系を風へ含めるか、高潮予報区間・海上/陸上区分を本Issueでどこまで精緻化するか。
7. **fail-closed**: 取得不能、stale、未知schema、欠損を `unknown` とし、JMA対象期間内は総合点を隠す方針。
8. **無償PULL**: SLAなしを受容し、参考情報としてのみ利用する方針。

## 11. 調査の再現手順

2026-07-20には次を実施した。

1. `regular.xml` と `extra.xml` を取得し、Atom entryの `VPWS50` / `VPWP50` 掲載先を確認。
2. `regular.xml` から福岡 `400000`、佐賀 `410000`、長崎 `420000` の最新 `VPWP50` を取得。
3. XMLのControl/Head、TimeDefine/Duration、Kind/Property、Significancy/refID、Area/Codeを確認。
4. 3県の実電文に5市の市町村等コードが存在することを確認。
5. 2026年版公式サンプル4本で発表時刻・対象期間・欠損し得る値を補足確認。

フィード上の個別電文URLは掲載期間が保証されないため、恒久参照には上記の公式技術資料・サンプルセットURLを記載した。

**この時点で停止する。利用者の明示承認前にアプリコード・DB・UIの実装、マージ、本番反映、Issue #195のクローズを行わない。**
