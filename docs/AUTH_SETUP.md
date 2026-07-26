# FishForecastMap 認証設定

Issue #318 で、ログイン方式を Magic Link 中心から **メールアドレス + パスワード** へ変更する。

既存のSupabase Auth、既存user id、RLS、remote Supabaseデータは維持する。

## 1. メール + パスワード

Hosted Supabaseでは Email provider を有効にし、メール + パスワード認証を利用する。

新規登録は `signUp()`、通常ログインは `signInWithPassword()` を使う。メール確認が有効な環境では、新規登録時のみ確認メール内のリンクを一度開く必要がある。

既存Magic Linkユーザーは新規登録をやり直さず、画面の「パスワードを設定・忘れた方」から `resetPasswordForEmail()` を使い、届いたメールを一度開いてパスワードを設定する。その後はメールアドレス + パスワードでログインできる。

### docomoメール

`@docomo.ne.jp` は通常のメールアドレスとして扱い、アプリ側ではドメイン制限を設けない。

ただし、確認メールやパスワード再設定メールが受信側の迷惑メール設定・受信許可設定等で届かない場合は、SMTP送信元ドメインを受信許可するなど、利用者側のメール設定確認が必要になることがある。

## 2. Site URL / Redirect URLs

Supabase Dashboard の Authentication > URL Configuration で、少なくとも本番URLをSite URLとして設定する。

また、メール確認後・パスワード再設定後に戻すURLをRedirect URLsへ登録する。

対象例:

```text
https://<production-domain>/
http://localhost:3000/**
```

Vercel Previewでパスワード再設定を実機確認する場合は、プロジェクト運用方針に従ってPreview URLも許可する。ワイルドカードを利用する場合は、許可範囲を必要最小限にする。

## 3. Production用 Custom SMTP

Supabase標準のメール送信サービスは開発・試用向けであり、本番の確認メール・パスワード再設定メールには **Custom SMTP** を設定する。

Built-in email providerは本番用途に使用しない。送信回数制限や送信先制限があるため、ProductionではCustom SMTPを設定したうえで、`@docomo.ne.jp` 等のキャリアメールを含む実アドレスへの到達性を確認する。

Supabase Dashboard の Authentication > Emails > SMTP Settings から、利用するメールサービスのSMTP情報を設定する。

設定項目は利用するSMTPサービスに従うが、一般に以下を準備する。

- SMTP host
- port
- username
- password
- sender email
- sender name

`@docomo.ne.jp` 等のキャリアメールへの到達性を含め、本番公開前に実際の受信確認を行う。

## 4. 緊急時の既存ユーザーへのパスワード設定

メール送信制限等によりパスワード再設定メールを使えず、管理者判断で既存ユーザーへ直ちにパスワードを設定する必要がある場合は、`auth.users` の `encrypted_password` をSQLで直接UPDATEしない。

Supabase Auth Admin API の `updateUserById()` を、管理者だけが扱えるtrusted server / ローカル端末から利用する。

```ts
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  },
);

const { error } = await supabase.auth.admin.updateUserById(
  process.env.TARGET_USER_ID!,
  { password: process.env.TARGET_PASSWORD! },
);

if (error) throw error;
```

対象のuser idはSupabase Dashboardの Authentication > Users で確認する。既存user idを維持したままパスワードだけを設定するため、ユーザーを削除・再作成しない。

以下はGitHub、ブラウザコード、Issue/PR本文、チャットへ記載しない。

- Supabase secret key / legacy service role key
- 利用者の実パスワード
- 一時的に使った管理用資格情報

管理処理完了後は、管理用の一時ファイルや環境変数を残さない。管理APIはメール送信を伴わないため、メール送信rate limitの回避目的でAuth内部DBを直接変更する必要はない。

## 5. セキュリティ方針

ブラウザ側で利用するのは既存の安全なSupabase clientのみとする。

使用可:

- `NEXT_PUBLIC_SUPABASE_URL`
- 現行プロジェクトで利用しているanon / publishable key

ブラウザ側へ追加してはいけないもの:

- secret key / service role key
- database password
- database connection URL

認証方式の変更を理由にRLSを弱めない。

## 6. 動作確認

コード側:

```bash
npm run check:auth-safety
npm run test:issue-318-auth-refresh
npm run lint
npm run typecheck
npm test
npm run build
```

Supabase設定後のPreview確認:

1. 新規メール + パスワード登録ができる
2. 確認メールが必要な設定では確認後にログインできる
3. 既存Magic Linkユーザーがパスワード再設定メールからパスワードを設定できる
4. 設定後はメール + パスワードだけでログインできる
5. `@docomo.ne.jp` の登録・確認メール・パスワード再設定メールを実機確認する
6. email rate limit発生時に技術エラー文字列ではなく日本語案内が表示される
7. ログアウト後に既存ユーザー所有データ/RLSの所有関係が変わっていないことを確認する
