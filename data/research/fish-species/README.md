# fish-species research data

魚種生態の調査記録と属性別の本番採否です。Issue #274では`aji`をグループ定義専用とし、`maaji`、`maruaji`、`seabass`、`chinu`を個別種として扱います。

各JSONはsourceと`review.attributeDecisions`を持つ自己完結型記録です。`review.productionAdoption`は後続処理の投影方針を示しますが、本番SCORE、UI、DBへは接続しません。個別種から親・兄弟への暗黙継承と、`unknown`の固定値補完は禁止です。
