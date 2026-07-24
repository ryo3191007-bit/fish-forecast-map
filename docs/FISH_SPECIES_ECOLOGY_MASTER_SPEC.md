# 魚種生態調査Schema v1.0.0

Issue #177の範囲で、`アジ`、`シーバス`、`チヌ`の3表示魚種だけを対象にした調査記録仕様です。本仕様は本番魚種配列、UI、SCORE、DBへ自動反映しません。

## 設計方針

- 表示名、canonical名、学名、alias、entityTypeを分離する。
- 通称から生物学上の単一種を推測で確定しない。
- 安定した一般生態情報と、地域・季節依存の釣れやすさ情報を分離する。
- 各属性は`value`、`status`、`confidence`、`evidenceSources`、`note`を保持する。
- 直接根拠がない属性は`status: unknown`かつ`value: null`を維持する。
- 調査値、利用者確定値、将来の本番SCORE入力値を混同しない。

## 採否判断

属性単位で`adopt`、`adopt_with_warning`、`hold`、`reject`を記録します。産卵期、水深、漁獲量、分布などを遊漁の釣れやすさへ転用する場合は原則`hold`または`reject`とします。

## v1.1.0 本番採否拡張（Issue #274）

`aji`をグループ定義専用とし、`maaji`と`maruaji`を個別種へ分離した。本番採否、非継承、unknownの扱い、機械可読な投影方針は`docs/FISH_SPECIES_ECOLOGY_PRODUCTION_ADOPTION_SPEC.md`を参照する。対象はアジグループとマアジ、マルアジ、スズキ、チヌに限定し、本番SCOREへは接続しない。
