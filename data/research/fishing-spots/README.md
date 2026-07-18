# 釣り場属性調査JSON

このディレクトリには、次に基づく調査記録を保存します。

- `docs/FISHING_SPOT_RESEARCH_SPEC.md`
- `docs/FISHING_SPOT_SECONDARY_SOURCE_POLICY.md`
- `docs/schemas/fishing-spot-research.schema.json`

- `karatsu-east-port.json`: 唐津東港のPost-MVP-040パイロット調査
- `nokita-port.json`: Issue #163 野北漁港のSchema v1.1.0調査
- `keya-port.json`: Issue #163 芥屋漁港のSchema v1.1.0調査
- `funakoshi-port.json`: Issue #163 船越漁港のSchema v1.1.0調査


Issue #165の地域別10地点Schema v1.1.0調査:

- `nokita-beach.json`: 野北海岸
- `kishi-port.json`: 岐志漁港
- `fukuyoshi-port.json`: 福吉漁港
- `hamasaki-beach.json`: 浜崎海岸
- `niji-matsubara.json`: 虹の松原周辺
- `karatsu-west-port.json`: 唐津西港
- `yobuko-area.json`: 呼子周辺
- `imari-inner-bay.json`: 伊万里湾奥
- `takashima-area.json`: 鷹島周辺
- `tabira-port.json`: 田平港

Issue #165の10地点レビューは `docs/research/REGIONAL_10_SPOTS_RESEARCH_REVIEW.md` を参照してください。

Issue #163の3地点レビューは `docs/research/ITOSHIMA_WEST_3_PORTS_RESEARCH_REVIEW.md` を参照してください。

民間情報を補助利用した値は、source種別、`status`、`confidence`、確認日、判定理由を保持します。記事本文、写真、地図画像、コメント、プロフィール、掲載魚種一覧は保存しません。

これらは出典付きの調査値であり、そのまま本番表示値、ユーザー確定値、SCORE入力、安全判断へ使用しません。一般立入・釣り可否・施設利用は最新の管理者情報と現地表示を確認してください。
