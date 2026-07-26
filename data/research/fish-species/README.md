# fish-species research data

魚種生態の調査記録と属性別の本番採否です。Issue #274では`aji`をグループ定義専用とし、`maaji`、`maruaji`、`seabass`、`chinu`を個別種として扱います。

各JSONはsourceと`review.attributeDecisions`を持つ自己完結型記録です。`review.productionAdoption`は後続処理の投影方針を示しますが、本番SCORE、UI、DBへは接続しません。個別種から親・兄弟への暗黙継承と、`unknown`の固定値補完は禁止です。

Issue #308から、既存5エントリのv1.2.0を互換維持したまま、残り魚種の展開には`fish-species-ecology.v1.3.0.schema.json`を使用します。v1.3.0のJSONは共通テストで自動発見され、`src/domain/fishing.ts`のspeciesId・表示名・entityType・親グループ・active状態と照合されます。

A〜E分割の後続Issue（#309〜#312）は、Issue #308のマージ後に最新`main`から開始し、原則としてv1.3.0の魚種JSONと担当レビューだけを追加します。共通Schema・共通テストは必要性が明確な場合を除き変更しません。
