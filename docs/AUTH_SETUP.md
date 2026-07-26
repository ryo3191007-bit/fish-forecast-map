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

Supabase Dashboard の Authentication > Emails > SMTP Settings から、利用するメールサービスのSMTP情報を設定する。

設定項目は利用するSMTPサービスに従うが、一般に以下を準備する。

- SMTP host
- port
- username
- password
- sender email
- sender name

`@docomo.ne.jp` 等のキャリアメールへの到達性を含め、本番公開前に実際の受信確認を行う。

## 4. セキュリティ方針

ブラウザ側で利用するのは既存の安全なSupabase clientのみとする。

使用可:

- `NEXT_PUBLIC_SUPABASE_URL`
- 現行プロジェクトで利用しているanon / publishable key

ブラウザ側へ追加してはいけないもの:

- service role key
- database password
- database connection URL

認証方式の変更を理由にRLSを弱めない。

## 5. 動作確認

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
6. ログアウト後に既存ユーザー所有データ/RLSの所有関係が変わっていないことを確認する
