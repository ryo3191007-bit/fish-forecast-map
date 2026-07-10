# Supabaseプロジェクト作成手順と環境変数設計

## 目的

このドキュメントは、Fish Forecast MapでSupabase/PostgreSQLを導入する前に、Supabaseプロジェクト作成の手動手順、環境変数、秘密情報、Vercel/GitHub Actionsでの扱いを整理するための設計メモです。

このドキュメントでは、Supabaseプロジェクト作成、DB作成、DBマイグレーション、SQL実装、API Route追加、UI変更、localStorage key変更、SCORE計算変更は行いません。Post-MVP-016で `@supabase/supabase-js` とクライアント初期化層を最小導入済みですが、DBテーブル、RLS、画面連携はまだ未実装です。

## 前提

- 個人利用向けのPost-MVP検証として、無料枠または低コスト運用を優先します。
- MVP v0.1ではモックデータとlocalStorageの手動外部釣果メモを利用しており、Supabaseクライアント初期化層のみ導入済みです。DB連携と認証は未導入です。
- 外部釣果サイトの自動取り込み、スクレイピング、定期実行ジョブ、AI解析はこの設計の対象外です。
- Supabase導入後も、釣果を保証する表現は避け、出典とスコア根拠を明示する方針を維持します。

## Supabaseプロジェクト作成の手動手順

実際のプロジェクト作成は、ユーザーがSupabaseダッシュボードで手動実施します。Codexや自動化ジョブでは作成しません。

1. Supabaseにログインします。
2. 対象Organizationを選択します。
3. New projectを作成します。
4. Project nameを設定します。
   - 候補: `fish-forecast-map`
   - Preview/検証用を分ける場合の候補: `fish-forecast-map-dev`
5. Database Passwordを生成します。
   - パスワードマネージャーなど、安全な場所に保存します。
   - チャット、Issue、PR、README、ドキュメントへ貼り付けません。
6. Regionを選択します。
   - 主な利用者が日本であるため、低遅延を優先するなら日本または近隣リージョンを第一候補にします。
   - 無料枠、可用性、将来の移行コストも確認します。
7. プロジェクト作成完了後、Project URLとanon keyをSupabaseダッシュボードで確認します。
8. ローカル開発で必要になったタイミングで、Git管理対象外の `.env.local` に値を設定します。
9. Vercelへデプロイする段階で、Vercel Project SettingsのEnvironment Variablesへ必要な値を設定します。
10. DBマイグレーション、RLS、型生成、認証を扱う場合は、後続IssueでSecrets設計を見直します。

## 無料枠・個人利用前提の注意

- 明示的な承認なしに有料プラン、有料API、有料ホスティングを導入しません。
- 無料枠にはプロジェクト停止、容量、転送量、実行時間などの制限があり得るため、導入前に最新のSupabase料金・制限をユーザーが確認します。
- 個人利用の検証段階では、最小テーブル・最小接続から開始し、DB化対象を一度に広げません。
- 本番公開や利用者拡大前に、地点座標の丸め、詳細地点の非公開化、RLS、認証、バックアップ方針を再確認します。

## 環境変数候補

このIssueでは環境変数の設計のみを行い、実値は追加しません。

| 変数名 | 公開範囲 | 用途候補 | GitHubへコミット | 備考 |
| --- | --- | --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | ブラウザに公開され得る | Supabase Project URL | `.env.example` のダミー値のみ可 | 実URLは `.env.local` やVercel環境変数に設定します。 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ブラウザに公開され得る | クライアントからの匿名アクセス用anon key | `.env.example` のダミー値のみ可 | 公開前提ですが、RLSなしで安全になるわけではありません。 |
| `SUPABASE_SERVICE_ROLE_KEY` | 秘密情報 | 将来のサーバー側管理処理候補 | 不可 | クライアントへ渡さず、必要になるまで未使用扱いにします。 |
| `SUPABASE_DB_URL` | 秘密情報 | 将来のマイグレーション、型生成、サーバー側DB接続候補 | 不可 | DBパスワードを含む可能性があるため厳格に扱います。 |

### `NEXT_PUBLIC_*` と秘密情報の違い

- Next.jsでは `NEXT_PUBLIC_` が付く環境変数は、クライアントバンドルへ埋め込まれ、ブラウザから見える前提で扱います。
- `NEXT_PUBLIC_SUPABASE_URL` と `NEXT_PUBLIC_SUPABASE_ANON_KEY` は公開され得る値として設計し、秘密情報を含めません。
- anon keyは公開前提のキーですが、行レベルセキュリティ（RLS）や権限制御なしで安全になるものではありません。
- `SUPABASE_SERVICE_ROLE_KEY` はRLSを迂回できる強い権限を持つ可能性があるため、フロントエンドコード、README、Issue、PR、ログ、ブラウザへ絶対に出しません。
- `SUPABASE_DB_URL` やDatabase PasswordはDBへ直接接続できる秘密情報として扱い、GitHubへコミットしません。

## `.env.local` と `.env.example` の扱い

### `.env.local`

- ローカル開発者の端末だけで使うファイルです。
- `.gitignore` でGit管理対象外になっているため、コミットしません。
- `.env.example` をコピーして `.env.local` を作成します。

```bash
cp .env.example .env.local
```

- 実Project URLと実anon keyは `.env.local` にだけ設定します。
- `SUPABASE_SERVICE_ROLE_KEY` と `SUPABASE_DB_URL` は、サーバー側機能やマイグレーションなどの後続Issueで必要になるまで空欄または未設定にします。
- `.env.local` の内容をチャット、Issue、PR、README、スクリーンショット、ログに貼り付けません。
- 値を設定した後も、Post-MVP-015ではSupabase接続実装、DB/SQL/API/UI変更、npmパッケージ追加は行いません。

### `.env.example`

- Post-MVP-015で、リポジトリルートに `.env.example` を追加済みです。
- リポジトリへコミットしてよいのは、ダミー値または空値のテンプレートだけです。
- 実URL、実キー、実パスワード、実DB接続文字列は絶対に書きません。
- `NEXT_PUBLIC_SUPABASE_URL` と `NEXT_PUBLIC_SUPABASE_ANON_KEY` はブラウザ公開前提の変数として、秘密情報を含めないダミー値だけを記載します。
- `SUPABASE_SERVICE_ROLE_KEY` と `SUPABASE_DB_URL` はサーバー側・秘密情報として扱う候補です。テンプレートでは後続Issueで必要になる変数名を確認しやすくするため、明らかなダミー値を記載します。

```dotenv
NEXT_PUBLIC_SUPABASE_URL="https://example-project-ref.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="example-anon-key"
SUPABASE_SERVICE_ROLE_KEY="example-service-role-key-do-not-use"
SUPABASE_DB_URL="postgresql://example-user:example-password@example-host:5432/example-db"
```


## Supabaseクライアント初期化層

Post-MVP-016で `@supabase/supabase-js` と `src/lib/supabaseClient.ts` を追加済みです。

- 使用する環境変数は `NEXT_PUBLIC_SUPABASE_URL` と `NEXT_PUBLIC_SUPABASE_ANON_KEY` のみです。
- `SUPABASE_SERVICE_ROLE_KEY` と `SUPABASE_DB_URL` はクライアントコードでは使いません。
- 環境変数が未設定でも、モジュールimport時点でthrowせず、`npm run build` が成功する方針です。
- DBテーブル、SQL、RLS、API Route、UI連携、既存画面からのSupabase呼び出しはまだ未実装です。
- 次の候補は、読み取り専用接続の最小確認です。

## Vercel Environment Variablesの設定方針

- Vercelには、GitHubへコミットしない実値をProject SettingsのEnvironment Variablesから設定します。
- Production / Preview / Developmentを分け、必要最小限の環境だけに設定します。
- `NEXT_PUBLIC_SUPABASE_URL` と `NEXT_PUBLIC_SUPABASE_ANON_KEY` は、ブラウザ公開前提の値として設定します。
- `SUPABASE_SERVICE_ROLE_KEY` と `SUPABASE_DB_URL` は、サーバー側処理が必要になるまで設定しません。
- 将来サーバー側処理で秘密情報を使う場合も、VercelのEnvironment Variablesに保存し、クライアントへ渡らないコードパスに限定します。
- VercelのビルドログやアプリログにSecret値を出力しません。
- Preview環境で本番DBを不用意に書き換えないよう、必要に応じて開発用Supabaseプロジェクトを分けます。

## GitHub Actions / Secretsの扱い

- 現時点のCIはlint、typecheck、buildの確認が中心で、Supabase接続は不要です。そのためGitHub Actions Secretsは追加しません。
- 将来、DBマイグレーション、Supabase型生成、シード投入、統合テストなどをCIで行う場合に限り、必要なSecretsを別Issueで設計します。
- Secretsを使う場合も、ログへ値を出さず、`echo` やテスト失敗出力で漏れないようにします。
- Pull Request from forkなど、Secretsが渡らない実行条件を考慮してCIを設計します。
- service role keyやDB URLをCIに渡す場合は、最小権限、対象環境、実行ブランチ、手動承認の要否を確認します。

## ローカル開発時の扱い

- Supabase接続を実装する後続Issueまでは、ローカルにSupabase環境変数は不要です。
- 必要になった場合のみ `.env.local` を作成し、実値を設定します。
- `.env.local` はGitへ追加せず、レビュー依頼時にも内容を共有しません。
- ローカルで実データを扱う場合は、スクリーンショットやログに個人メモ、正確な地点、Secretが映り込まないようにします。

## 秘密情報を漏らした場合の対応

秘密情報をGitHub、Issue、PR、チャット、ログ、スクリーンショットなどへ漏らした場合は、削除だけでは不十分です。

1. 漏えいした値の利用を停止します。
2. Supabaseダッシュボードなどで該当キー、Database Password、DB URLに含まれるパスワードをローテーションします。
3. Vercel、GitHub Actions、ローカル `.env.local` など、保存先の値を新しいものへ更新します。
4. 漏えい範囲と影響を確認します。
5. Git履歴に含まれた場合は、履歴削除だけでなくローテーション済みであることを前提に扱います。

## GitHubにコミットしてよいもの / してはいけないもの

### コミットしてよいもの

- Supabase導入手順などの設計ドキュメント。
- `.env.example` のダミー値。
- Secretを含まない型定義や設定例。
- Secretを含まないREADMEの説明。

### コミットしてはいけないもの

- `.env.local`、`.env`、実値入りの環境変数ファイル。
- 実Project URL、実anon key、service role key、Database Password、実DB URL。
- Secretが写ったスクリーンショットやログ。
- 第三者サイト本文、画像、コメント全文、プロフィール詳細の転載データ。

## 後続Issueへの分割案

1. ユーザーがSupabaseプロジェクトを手動作成し、Project URLとanon keyの保管場所を確認する。
2. `.env.example` とローカル `.env.local` 作成手順を整備する。
3. Supabaseクライアントを導入する（Post-MVP-016で最小導入済み）。
4. 読み取り専用接続の最小確認を行う。
5. `fish_species` / `fishing_spots` / `source_registry` のDB化設計を作る。
6. RLS設計を作り、anon keyで読める範囲と書けない範囲を確認する。
7. `external_catch_memos` のDB保存を設計・実装する。
8. localStorageバックアップJSONまたは既存 `fish-forecast-map.external-catch-memos` からDBへの移行導線を実装する。
9. 認証導入とユーザー所有データの分離を設計する。
10. Vercel Production / Preview / DevelopmentごとのSupabase接続先分離を検討する。

## 今回の対象外

- Supabaseプロジェクト作成そのもの。
- DBテーブル、SQL、RLS、画面連携。
- 読み取り専用接続の最小確認。
- 実キー、実URL、実パスワードの追加。
- `.env.local` の追加。
- DBマイグレーション作成。
- SQL実装。
- API Route追加。
- UI変更。
- localStorage key変更。
- SCORE計算変更。
- 外部サイトアクセス、スクレイピング、定期実行ジョブ、AI解析、新API追加、有料API追加。
