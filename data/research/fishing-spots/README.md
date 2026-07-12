# 釣り場属性調査JSON

このディレクトリには、次に基づく調査記録を保存します。

- `docs/FISHING_SPOT_RESEARCH_SPEC.md`
- `docs/FISHING_SPOT_SECONDARY_SOURCE_POLICY.md`
- `docs/schemas/fishing-spot-research.schema.json`

- `karatsu-east-port.json`: 唐津東港のPost-MVP-040パイロット調査

民間情報を補助利用した値は、source種別、`status`、`confidence`、確認日、判定理由を保持します。記事本文、写真、地図画像、コメント、プロフィール、掲載魚種一覧は保存しません。

これらは出典付きの調査値であり、そのまま本番表示値、ユーザー確定値、SCORE入力、安全判断へ使用しません。一般立入・釣り可否・施設利用は最新の管理者情報と現地表示を確認してください。
