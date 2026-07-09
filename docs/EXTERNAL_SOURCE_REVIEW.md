# 外部情報元レビュー: Post-MVP-004

調査日: 2026-07-09

## 判定サマリー

| 情報元 | robotsStatus | termsStatus | crawlPolicy | 判定 |
| --- | --- | --- | --- | --- |
| 釣り具のまるきん | `partial` | `unknown` | `referenceOnly` | 釣果ページとRSS候補はあるが、利用規約を確認できず、robots.txtのContent-Signalも参照利用止まりのため自動収集しない。 |
| 釣り具のポイント | `allowed` | `restricted` | `manualOnly` | robots.txtに明示的な一般Disallowはないが、規約が私的利用限定・情報収集目的禁止を含むため自動収集しない。 |
| Chowari | `unknown` | `restricted` | `referenceOnly` | tideサブドメインのrobots.txtが404で未確認。Chowari規約上の制約もあるため、潮見表やUIの参考に留める。 |
| アングラーズ | `partial` | `restricted` | `manualOnly` | ユーザー投稿型で投稿者権利確認が必要。robots.txtもAI系クローラ制限やCrawl-delayを含むため自動収集しない。 |

## 共通方針

- このレビューは、自動巡回や大量アクセスではなく、公式サイトの利用規約、robots.txt、釣果ページ候補URLを少数回確認したメモです。
- `allowed` と判断できるサイトはありません。
- `unknown`、`manualOnly`、`referenceOnly` は将来の収集ジョブ対象に含めません。
- 本文全文、画像、コメント全文、投稿者プロフィール詳細は保存しません。
- 将来扱う場合も、魚種、釣果日、エリア、釣り方、匹数、サイズ、出典URL、情報元名、取得方法、信頼度などの構造化データに限定します。

## 釣り具のまるきん

- baseUrl: `https://marukin-net.co.jp/`
- 利用規約URL: 未確認。
- robots.txt: `https://marukin-net.co.jp/robots.txt`
- 釣果ページ候補:
  - `https://marukin-net.co.jp/fishing-report/`
  - `https://marukin-net.co.jp/fishing-report/?feed=rss2`
  - `https://marukin-net.co.jp/fishing-report/?store_filter=imari`
  - `https://marukin-net.co.jp/fishing-report/?store_filter=hirado`
  - `https://marukin-net.co.jp/fishing-report/?store_filter=itoshima`
- robotsStatus: `partial`
- termsStatus: `unknown`
- crawlPolicy: `referenceOnly`

### 調査メモ

釣果情報は `/fishing-report/` 配下にあり、対象エリアに近い店舗フィルタとして `imari`、`hirado`、`itoshima` を確認しました。RSS候補も確認できました。

robots.txtは `User-agent: *` に `Allow: /` を示す一方で、Content-Signalとして `ai-train=no`、`use=reference` を示し、複数のAI系botを個別にDisallowしています。サイト利用規約ページは確認できませんでした。

### 判定理由

利用規約が未確認で、自動収集・再利用の許諾が明確ではありません。RSS候補がある点は将来の確認材料になりますが、現時点では `allowed` にせず、参照候補に留めます。

### TODO

- 公式サイト内の利用規約、サイトポリシー、著作権表示の有無を再確認する。
- RSSを利用してよいか、本文ではなくリンクと短いメタデータに限定できるかを確認する。
- 必要であれば運営元に問い合わせ、個人利用または限定用途での利用可否を確認する。

## 釣り具のポイント

- baseUrl: `https://www.point-i.jp/`
- 利用規約URL: `https://www.point-i.jp/termsofservice`
- robots.txt: `https://www.point-i.jp/robots.txt`
- 釣果ページ候補:
  - `https://www.point-i.jp/catches`
  - `https://www.point-i.jp/fishing_infos`
  - `https://www.point-i.jp/fishing_spot_guides`
- robotsStatus: `allowed`
- termsStatus: `restricted`
- crawlPolicy: `manualOnly`

### 調査メモ

robots.txtには説明コメントのみがあり、一般クローラへの明示的なDisallowは確認できませんでした。

一方、利用規約ではWEBサービスの利用が私的目的に限定され、過度な負荷や、当社または他ユーザーの情報収集を目的とする行為が禁止されています。`/catches` は「みんなの釣果」で、ユーザー投稿やアプリ由来の情報が含まれる可能性があります。

### 判定理由

robots.txtだけを見ると機械的な取得禁止は明示されていませんが、利用規約上の制約が強く、ユーザー投稿由来データの権利確認も必要です。自動収集対象にはせず、ユーザーが出典URLを手動登録した場合の構造化メモに限定します。

### TODO

- 店舗発信情報とユーザー投稿情報を安全に区別できるか確認する。
- 利用規約の「情報収集目的」禁止に抵触しない利用方法があるか、必要なら問い合わせる。
- 手動登録時も本文・画像・コメント全文を保存しないUI/データ設計を維持する。

## Chowari

- baseUrl: `https://tide.chowari.jp/`
- 利用規約URL: `https://www.chowari.jp/sitepolicy/agreement.php`
- robots.txt: `https://tide.chowari.jp/robots.txt`（404）
- 釣果ページ候補:
  - `https://www.chowari.jp/catch/`
  - `https://www.chowari.jp/catcharea/`
  - `https://www.chowari.jp/catchfish/`
- robotsStatus: `unknown`
- termsStatus: `restricted`
- crawlPolicy: `referenceOnly`

### 調査メモ

`tide.chowari.jp` は潮見表・タイドグラフの候補として確認しました。トップページから `www.chowari.jp` の最新釣果、地域別釣果、魚種別釣果への導線があります。

`tide.chowari.jp/robots.txt` は404で、サブドメイン単位のrobots確認は未完了です。Chowariの利用規約は、釣果情報等を提供するサービスであることを示す一方、知的財産権侵害、他会員情報の収集目的、過度な負担などを禁じています。

### 判定理由

robots.txtを確認できず、利用規約上も自動収集に慎重な判断が必要です。MVPからの既存方針どおり、潮見表やタイドグラフのUI参考に留め、釣果情報の取得元にはしません。

### TODO

- `www.chowari.jp` 側のrobots.txt、サイトマップ、API/RSSの有無を別途確認する。
- 潮汐情報はOpen-Meteo等の利用条件が明確なデータソースを優先する。
- ChowariはUI・表示項目の参考に限定する方針を維持する。

## アングラーズ

- baseUrl: `https://anglers.jp/`
- 利用規約URL:
  - `https://anglers.jp/terms`
  - `https://anglers.jp/terms/free`
  - `https://anglers.jp/terms/post_guideline`
- robots.txt: `https://anglers.jp/robots.txt`
- 釣果ページ候補:
  - `https://anglers.jp/catches`
  - `https://anglers.jp/sitemap`
- robotsStatus: `partial`
- termsStatus: `restricted`
- crawlPolicy: `manualOnly`

### 調査メモ

アングラーズはユーザー投稿型/SNS的な釣果サービスです。釣果ページ候補として `/catches`、サイトマップとして `/sitemap` を確認しました。

robots.txtは `User-agent: *` に `Allow: /` を示す一方、AI系クローラの多くをDisallowし、一部botにCrawl-delayを指定しています。利用規約・投稿ガイドラインは存在しますが、投稿者の本文、画像、位置情報、コメント等の権利確認が必要です。

### 判定理由

ユーザー投稿型サービスは投稿者権利や公開範囲の確認が必要であり、このプロジェクトの安全側ルールでは `allowed` にしません。ユーザーが出典URLを手動登録し、本文や画像を保存しない範囲に限定します。

### TODO

- API、公式連携、許可済みデータ提供の有無を確認する。
- 投稿者本人が提供したURL/本文を扱う場合の同意・保存範囲を設計する。
- 正確な釣り場座標や個人情報が含まれる場合に備え、座標丸め・非公開化方針を維持する。
