# ロードマップ

## Phase 0: プロジェクト初期化

- GitHubリポジトリを作成する。
- GitHub/Codex連携の作業フローを整える。
- README、AGENTS.md、docs配下の初期ドキュメントを作成する。
- 最初の実装Issueを作成する。

## Phase 1: MVPアプリの土台作成

- Next.js + TypeScriptプロジェクトを作成する。
- 基本レイアウトとナビゲーションを追加する。
- MapLibre GL JSを導入する。
- ドメイン型とサンプルデータを追加する。
- 基本CIを追加する。

## Phase 2: 釣果情報UI

- 釣果情報一覧を作成する。
- 釣果情報カードを作成する。
- 魚種フィルタを追加する。
- 0〜100点の釣れそう度スコアを表示する。
- スコア根拠を表示する。

## Phase 3: 地図UI

- 2D地図画面を作成する。
- 糸島西岸から唐津湾、伊万里湾、平戸方面までの代表地点を表示する。
- モック釣果地点のマーカーを表示する。
- マーカーのポップアップ/カードを表示する。
- フィルタと地図表示を連動させる。

## Phase 4: 潮汐・天気・水温連携

- 利用条件を満たす無料の潮汐データを調査する。
- 利用条件を満たす無料の天気、風、波データを調査する。
- 利用条件を満たす無料の水温データを調査する。
- 釣れそう度スコアへの反映方法を検討する。

## Phase 5: 3D海底地形表示

- 水深/海底地形レイヤーを追加する。
- 動画のような3D海底地形表示を検討する。
- Three.js、deck.gl、CesiumJSなどの採用を比較する。
- 描画性能を最適化する。

## Phase 6: 釣果予測スコアの高度化

- 釣果実績、潮汐、天気、水温、季節性を使ったスコア改善を行う。
- 魚種別、場所別の重み付けを検討する。
- スコア理由の表示を詳細化する。

## Phase 7: 釣果情報取り込み

- 情報源ごとの法務・利用条件を整理する。
- まるきん、釣具のポイントなどの情報源を候補として調査する。
- 最初は手動URL/本文からの抽出を検討する。
- RSS、公式API、許可を得た情報源を優先する。

## Phase 8: Supabase設計・連携

- データベーススキーマを設計する。
- 釣果情報の読み書きを実装する。
- 必要に応じて認証を追加する。

## Phase 5 / Post-MVP-036: 水深・3D海底地形モード

完了。マップに `通常地図 / 航空写真 / 水深・3D地形` の3モードを追加し、2D水深色分け、等深線、hillshade、MapLibre terrain、凡例、3D ON/OFF、端末条件に応じた2D表示を提供します。参考表示であり、航海・安全判断には使用できません。

## Phase 5 / Post-MVP-037: 沿岸水深高解像度化候補と海岸線データ調査

完了。公式Grid Extract / GEBCO download appから一時取得した対象boundsの実データに基づき、ETOPO 2022 60秒、ETOPO 2022 15秒、GEBCO_2026 Grid 15秒、TID Grid、国土地理院標準地図等を比較しました。調査結果は `docs/COASTAL_BATHYMETRY_DATA_RESEARCH.md` を正本とします。

## Phase 5 / Post-MVP-038: GEBCO_2026・TID・GSI overlayへの更新

完了。当時の実装として、第一sourceを `GEBCO_2026 Grid 15秒`、データ由来を `GEBCO_2026 TID Grid`、fallbackを `ETOPO 2022 60秒 Bedrock` へ更新し、GSI標準地図overlayをopacity `0.40`で任意表示しました。GEBCO失敗時はETOPOへ、ETOPOも失敗した場合は水深layer・terrain・GSI overlayを解除して通常地図へ戻す構成でした。正本は `552 x 360`、DEM nodata `-32767`、min/max `-277 / 1346`、TID nodata `127`、出現コード `0/11/17/40/43/44` です。後続のPost-MVP-045でGSI overlayは海岸線ライン＋完全不透明の緑の陸地マスクへ置き換え済みです。

## Post-MVP-039: 釣り場属性調査の共通仕様

完了。地点評価を拡充する前段として、複数AI・複数担当で共通利用する調査項目、判定基準、情報源ルール、JSON Schema、架空サンプル、検証スクリプトを `docs/FISHING_SPOT_RESEARCH_SPEC.md` 以下に定義しました。民間釣りサイトは地点候補を知る入口に限定し、実地点の一括収集、DB変更、編集UI、魚種生態マスター、SCORE変更は後続Issueで扱います。

## Post-MVP-040: 唐津東港パイロット調査

完了。唐津東港をパイロット地点としてChatGPT調査データを保存し、共通仕様とSchemaに沿った調査結果の扱いを検証しました。唐津東港の値は比較・検証用であり、本番地点マスター、DB、画面、SCOREへは未反映です。

## Post-MVP-041: 唐津東港Gemini調査結果の保存・比較

完了。Gemini調査原文とレビューを保存し、Schema適合、source品質、unknown運用、二次調査の実施状況をChatGPT調査と比較しました。Gemini原文は正本Schema不適合の記録として保持し、人間がSchemaへ移し替えた値を正本化していません。

## Post-MVP-042: 唐津東港Claude調査結果の保存・3AI比較

完了。Claude調査原文とレビューを保存し、ChatGPT / Gemini / Claudeの3AI比較を完成しました。Schema適合とsourceが値を直接裏付けるかを分けて評価し、次のSchema・共通プロンプト改訂候補を整理しました。

## Post-MVP-043: Schema v1.1.0と共通プロンプト改訂

完了。3AI比較結果を反映し、釣り場調査Schema v1.1.0、旧v1.0.0互換Schema、Ajv 2020 + custom validator、汎用共通プロンプトを追加・改訂しました。v1.1.0ではevidence source、source support path、調査stage、魚種観測時期、施設・規制の有効期間などを強化し、唐津東港の正本値は引き続き本番データへ反映していません。

## Post-MVP-044: 開発引き継ぎ書とROADMAPの最新化

完了。開発引き継ぎ書とROADMAPを最新化し、Codex既存PR更新手順を確定しました。

## Post-MVP-045: 水深モードの海岸線ライン・陸地マスク化

完了。Issue #129 / PR #132で、GSI標準地図overlayに依存しない構成へ更新し、GEBCO由来の海岸線ラインと完全不透明の落ち着いた緑の陸地マスクで陸海境界を表示するようにしました。外部GSI overlayは使用しません。merge commitは `f6c8453b8d55ee3b12bb862766f07408921ed082` です。

## Phase 5 / Post-MVP-046: 高精細3D海底地形ビュー方針

完了。Issue #133の方針策定として、参考動画に近い3D海底地形ビューへ段階的に進むため、現行GEBCO/ETOPO実装の棚卸し、公式データ候補、ライセンス・再配布判断、技術方式比較、Phase A〜Dのロードマップを `docs/HIGH_RESOLUTION_3D_BATHYMETRY_PLAN.md` に正本化しました。本Issueでは描画コード、高精細データ投入、DB、地点・魚種・釣果収集、SCORE変更は行いません。

## Phase 5 / Post-MVP-047: 水深3D表示の高さ誇張と視点プリセット

完了。Issue #135で、Post-MVP-046 Phase Aの最初の実装として、現行GEBCO_2026 15秒／ETOPO 2022 fallbackと海岸線ライン・緑の陸地マスク・TID表示を維持したまま、水深・3D地形パネルに高さ誇張スライダー（1.0〜4.0、step 0.25）、現在倍率表示、1.0×リセット、真上・斜め・低角度の視点プリセットを追加しました。誇張は表示上の強調であり水深データ精度は上がらない注記も追加済みです。高精細DEM追加、Phase B PoC、DB、SCORE変更は引き続き対象外です。

次の機能は別Issueで決定する。

## Phase 5 / Post-MVP-048: 水深モードのタップ地点参考水深

完了。Issue #137 / PR #138で、水深モードのクリック／タップ地点に一時markerとcardを表示し、緯度経度、表示中source（GEBCO_2026 15秒／ETOPO 2022 fallback 60秒）、Terrain-RGBからdecodeした参考水深を表示するようにしました。地点は保存せず、DB／Supabase／localStorage／釣り場masterは変更していません。高さ誇張倍率は参考水深計算に使いません。

## Phase 5 / Post-MVP-049: 水深3D高さ誇張の実表示反映修正

完了。Issue #139では、UIの高さ誇張倍率とMapLibre terrain geometryへ適用される`source`／`exaggeration`を一致させ、同一sourceの倍率変更時はterrainを一度解除してから最新倍率で再設定することで描画更新を確実化しました。GEBCO→ETOPO fallback、3D OFF→ON、3D OFF中に変更した倍率の次回ON反映を維持し、slider変更だけでcamera、source fallback、参考水深値を変更しません。最大倍率は引き続き4.0×で、高精細DEM追加、DB／Supabase／localStorage、地点保存、SCORE変更は対象外です。

## Phase 5 / Post-MVP-050: 水深モードの緑の海岸線ライン・陸地マスク削除

完了。Issue #141 / PR #142で、Post-MVP-045で追加したGEBCO由来の濃緑海岸線ライン、完全不透明の緑の陸地マスク、海岸線表示ボタンを削除しました。水深モードでは陸地pixelを透明のまま扱い、色別水深、hillshade、等深線、TID表示、参考水深、GEBCO→ETOPO→通常地図fallbackを維持します。

## Phase 5 / Post-MVP-051: 水深モードの浅場配色・陰影・等深線表示調整

完了。Issue #143 / PR #144で、GEBCO／ETOPOの元DEM、Terrain-RGB、参考水深decodeを変更せず、color tileの浅場パレットを `0〜10m / 10〜20m / 20〜50m` から識別できる構成へ更新しました。水深パネルには一時UI状態の `陰影` と `等深線` toggleを追加し、表示中sourceだけにcolor、hillshade、contour line、contour label、半透明海面layerのvisibilityを整合させます。toggle状態はcomponent生存中だけ維持し、localStorage、DB、Supabaseへ保存しません。半透明海面表現は実潮位・実海面高度ではない表示上の演出として統合注意事項に明記しています。PCとスマホで最終表示を確認し、スマホで横スクロールがなく、陰影・等深線toggleが動作することを確認済みです。merge commitは `2fc3159742ac8846250fd4bafeb78e25d15af4fc` です。

## Phase 5 / Post-MVP-052: 端末性能に応じた水深3D初期表示と2D fallback案内

完了。Issue #146 / PR #147で、端末能力を `auto-3d`、`manual-3d / compact`、`manual-3d / low-memory`、`manual-3d / reduced-motion`、`unsupported / no-webgl` に分類しました。720px／4GBの既存閾値を維持し、`deviceMemory` 未定義だけでは低性能扱いにしません。`manual-3d` は理由付き2D初期表示から手動3D ONを許可し、`unsupported` は3D表示・高さ誇張・視点presetを無効化します。3D適用失敗時はチェック状態、preset、実表示を2Dへrollbackし、2D水深レイヤー、参考水深、陰影、等深線、GEBCO／ETOPO表示sourceを維持します。3D失敗だけを理由にsource fallbackは発火しません。スマホPreviewでは2D初期理由、手動3D ON、3D OFF時の陰影・等深線・参考水深、操作欄の重なり・横スクロールなしを確認済みです。merge commitは `d0912d1ad944e09ca459907245d07eaeccdf8555` です。

## Phase 5 / Post-MVP-053: 水深モードの等深線密度と陰影profile調整

完了。Issue #149 / PR #150では、GEBCO_2026 15秒／ETOPO 2022 60秒の元DEM、Terrain-RGB、参考水深decode、浅場7段階paletteを変更せず、表示zoomに応じて等深線を `100 / 200 / 500m`、`50 / 100 / 200 / 500m`、`10 / 20 / 50 / 100 / 200 / 500m` へ段階表示しました。compact端末では等深線lineは既存toggleに従って維持しつつ、label密度だけをPCより抑制します。hillshadeはGEBCO／ETOPO別profileとして誇張・色・光源を本番domain定数へ集約し、陰影toggle、3D ON/OFF、高さ誇張、視点preset、source fallback、タップ地点参考水深、半透明海面表現は既存挙動を維持します。merge commitは `2a40ce0a554b625b0b402b739cbd98a06e350d29` です。

## Phase 5 / Post-MVP-054: 高精細1海域PoC候補データセットとWeb配信可否の確定

完了。Issue #151では、公式一次提供元だけを根拠に、NOAA NCEI Bathymetric Data Viewer、海しるAPI／海洋状況表示システム、AIST/GSJ、JODC J-EGG500、国土地理院等を調査しました。採用ゲートをすべて満たす `1データセット + 1海域` は確定せず、Phase Bの高精細データ取得・Terrain-RGB生成・Web配信PoCはNo-Goと判断しました。海しるAPIは一般仕様としてJSON/GeoJSON取得、1回最大1,000レコード、1応答最大64MB、`resultOffset` pagingを確認済みですが、最有力候補の `等深線` はendpoint/layer ID、属性schema、元グリッドproduct ID、bounds、native grid spacingまたは等深線間隔、鉛直基準、nodata、対象bounds総容量、派生物生成、GitHub/Vercel PreviewでのWeb配信・再配布可否が未確認のため要問い合わせです。NOAA/AIST/GSJも候補5海域の代表boundsで採用可能な個別survey/product IDを確定できませんでした。調査正本は `docs/HIGH_RESOLUTION_BATHYMETRY_POC_DATASET_RESEARCH.md` です。
