# 釣り場属性調査

釣り場属性の調査では、次を正本として使用します。

- 共通仕様: `docs/FISHING_SPOT_RESEARCH_SPEC.md`
- 手動二次調査ポリシー: `docs/FISHING_SPOT_SECONDARY_SOURCE_POLICY.md`
- JSON Schema: `docs/schemas/fishing-spot-research.schema.json`

公式・公的情報で不足する項目について民間情報を補助利用する場合も、スクレイピング、自動巡回、定期実行は行いません。文章、写真、地図画像、コメント、プロフィール、掲載魚種一覧は保存しません。

## パイロット調査

- 唐津東港
  - 調査メモ: `KARATSU_EAST_PORT_PILOT_RESEARCH.md`
  - 3AI共通プロンプト: `KARATSU_EAST_PORT_MULTI_AI_PROMPT.md`
  - 3AI比較表: `KARATSU_EAST_PORT_MULTI_AI_COMPARISON.md`
  - 調査JSON: `../../data/research/fishing-spots/karatsu-east-port.json`

調査JSONは根拠付きの調査記録であり、そのまま本番地点マスター、SCORE、安全判断へ使用しません。一般立入・釣り可否・施設利用は最新の管理者情報と現地表示を確認してください。
