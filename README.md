# Kanban Dashboard

AI によるタスク分類・優先度推定を備えた、Next.js 製のかんばんボードです。
タスクは「未着手」「進行中」「保留」「完了」の 4 レーンで管理でき、ドラッグ＆ドロップやクイック移動ボタンでステータスを更新できます。

## 主な機能

- タスクの追加、編集、削除
- 未着手 / 進行中 / 保留 / 完了の 4 レーン管理
- ドラッグ＆ドロップによるレーン移動
- カード内ボタンによるクイック移動
- 完了タスクの一括削除
- ライト / ダークテーマ切り替え
- Auth.js による Google OAuth / メールリンク認証
- PostgreSQL によるユーザー別タスク保存
- Gemini API を使ったタスクカテゴリ・優先度の自動推定
- 3日以上ステータスが変わっていないタスクの停滞検知
- AIによる重複タスクの検出・統合提案（トリアージ）

## AIとの協働プロセス

このリポジトリはエンジニアインターン選考向けのポートフォリオとして、実装の大部分を [Claude Code](https://claude.com/claude-code) と対話しながら進めています。「AIに何を任せ、どこから自分で判断したか」「生成されたコードをどう検証したか」を明文化しておきます。

### 進め方

1. まず非機能要件のギャップ（バリデーション、テスト、可観測性、レートリミット、ページネーション、キャッシュ、CSRF、DBトランザクション、READMEの記述不足など）を洗い出し、優先順位を付けたタスクリストを作成
2. Claude Codeのサブエージェント（Explore）にコードベース全体の現状調査を任せ、各項目が実際に「有る/無い」を根拠となるファイル・行番号付きで確認してから着手（推測で「無いはず」と決めつけない）
3. リスト上から順に、1項目ずつ実装 → 型チェック・Lint・テスト・ビルド → 実際にブラウザで動作確認、というサイクルを回す
4. 実装の進行はタスク管理機能で明示的に追跡し、着手中／完了を都度更新

### AIに任せた範囲と、自分で判断した範囲

- **AIに任せた部分**: 各項目の具体的な実装（Zodスキーマ設計、React Hook Formへの置き換え、テストコード、Terraformの差分など）や、複数の実現方法とそのトレードオフの提示
- **自分で判断した部分**: 技術選定そのもの。例えばテスト基盤はJestではなくVitestを選択、APIのレートリミットは外部インフラ（Upstash Redis等）を使わずインメモリ実装に留めることを選択、構造化ログもpino等のライブラリを追加せず自前の軽量JSONラッパーで十分と判断——これらはいずれもAIが選択肢とトレードオフを提示した上で、このアプリの規模・運用コストを踏まえて自分で決定した
- **Claudeに代行させなかった部分**: `terraform apply` / `terraform destroy` などクラウド上の実リソースを変更する操作、Google Cloud コンソールでの実際のログイン・課金情報の入力・発行されたAPIキーやOAuthシークレットの授受——これらは意図的に人間側の操作として残している（[設計判断とトレードオフ](#設計判断とトレードオフ) や `DEPLOYS_GUIDE.md` の移行手順も参照）

### 生成されたコードの検証方法

- **型・静的解析**: `npx tsc --noEmit` と `npm run lint`（ESLint）を各変更後に実行
- **自動テスト**: ユニットテストと結合テストを分離している。`npm run test`（Vitest、`vi.mock`でPrismaを全面モック）はバリデーションスキーマ・APIルートが「どんな形のクエリを発行しようとしたか」・フォームコンポーネントを高速に検証する一方、モックである以上「実際にPostgres上で正しい行が読み書きされるか」は検証できない。そこで `npm run test:integration`（`vitest.integration.config.mts`、Prismaは実クライアントのまま・`@/auth`のみモック）を別に用意し、他ユーザーのタスクへの越境アクセス防止・`$transaction`の再取得結果・keysetページネーション（cursor行が削除された後も正しく次ページを返すか）を実DBに対して検証している。専用の使い捨てDB（`docker-compose.yml`の`test-db`、tmpfsで非永続化）を使い、`vitest.integration.setup.ts`で開発用DBを誤って対象にしないようDB名に`test`を含むことを強制するガードを入れている。GitHub Actions CI（`ci.yml`）では `lint-and-build`（lint → unit test → build）と並行して、Postgresサービスコンテナ上で `integration-test` ジョブを実行
- **ビルド**: `npm run build`（Next.js本番ビルド + `prisma generate`）が通ることを都度確認
- **実機確認**: Claude Codeのブラウザ操作機能で実際にdevサーバーを起動し、ゲストログイン → タスク追加（バリデーションエラー表示 → 正常系 → AI自動分類）→ ネットワークログ・コンソールエラーの確認、まで一通り操作して検証。API応答やレスポンスヘッダー（`Cache-Control` など）もネットワークログで確認
- **インフラ**: Terraformの変更は `terraform validate` / `terraform plan` で構文・整合性を確認。実際のクラウドリソースを変更する `apply` / `destroy` は行っていない（上記の通り人間側の操作）

## 設計判断とトレードオフ

### 入力バリデーション

`lib/validation/` に [Zod](https://zod.dev/) スキーマを定義し、クライアント（React Hook Form の `zodResolver`）とサーバー（各 API Route の `safeParse`）の両方で同じスキーマを再利用しています。定義を1箇所に集約することで、フロントとサーバーのルールが食い違う事態を防いでいます。

### CSRF対策

NextAuthはセッションCookieに `SameSite=Lax` を使用し、`/api/auth/*` 配下（サインイン・コールバックなど状態を変更するエンドポイント）には double-submit cookie 方式のCSRFトークンを自動的に適用しています。

`/api/tasks` ・ `/api/classify` は独自実装のエンドポイントでNextAuthのCSRFトークン検証の対象外ですが、以下の理由から追加のCSRFトークンなしでも安全と判断しています。

- セッションCookieが `SameSite=Lax` のため、他サイトからの `<form>` 送信や単純なリンク遷移ではCookieが送信されない
- これらのエンドポイントは `Content-Type: application/json` の `fetch` リクエストのみを受け付けており、これは素の `<form>` タグでは再現できない（simple requestの条件を満たさずCORSプリフライトの対象になる）
- ゲストログイン（Credentials providerの `authorize()`）は入力を一切受け取らず新規ゲストユーザーを作るだけの処理なので、CSRFで既存ユーザーのログイン状態を乗っ取る攻撃は成立しない

### CSP（Content Security Policy）

`proxy.ts`（Next.js 16でmiddlewareから改称されたリクエストフック。同じファイルで認証チェック・レートリミットも行っているため統合）でリクエストごとにnonceを発行し、`script-src`に `'unsafe-inline'` を使わずnonceベースのCSPを配布している。ダークモードのちらつき防止用インラインscript（`app/layout.tsx`）はこのnonceを検証に通した上でのみ実行を許可される。`script-src`には`'strict-dynamic'`も付与し、nonceを持つスクリプトが動的に読み込むスクリプトのみ許可（ホスト名ベースの許可リストは無視される、nonce対応ブラウザ向けのモダンな構成）。外部スクリプト・外部フォントを読み込んでいない構成（`next/font`はビルド時にセルフホスト、Google認証はサーバー側リダイレクト）のため、`connect-src`等を緩める必要がなく `default-src 'self'` を素直に適用できている。

`connect-src`は`'self'`に加え`https://*.sentry.io`を許可している。`instrumentation-client.ts`でクライアント側Sentry（`NEXT_PUBLIC_SENTRY_DSN`設定時のみ有効）がエラーレポートをSentryのingestエンドポイントへ送るため、これを許可しないと本番でDSNを設定した瞬間にCSPがエラーレポート送信をブロックし、気づかれないまま可観測性が失われる。

`style-src`は`'self' 'unsafe-inline'`のまま緩めている。XSSの実害はほぼ`script-src`（任意コード実行）側で決まり、CSS注入の被害は限定的（見た目の改ざんや一部の情報詮索に留まる）なので費用対効果が低いことに加え、`next dev`（Turbopack）のHMRがCSSチャンクをnonceなしのインライン`<style>`で差し込むため、`style-src`を厳格化すると開発時に無害な違反ログが大量に出て本来見るべきエラーを埋もれさせてしまう。本番ビルド（`next start`）ではCSP・機能とも正常動作をブラウザで確認済み（コンソールエラーなし、AI自動分類を含むタスク追加フローも問題なし）。

### レートリミット

`lib/rateLimit.ts` にプロセス内メモリでの固定ウィンドウ・レートリミット（`proxy.ts` で `${IP}:${パス}` をキーに、1エンドポイントあたり1分間60リクエストまで）を実装しています。Upstash Redis等の外部ストアを使えばCloud Runがマルチインスタンスに増えても正確に制限できますが、このアプリの規模では追加のインフラ・運用コストに見合わないと判断し、まずはインメモリ実装で単一クライアントからの連打・悪用を防ぐことを優先しました。認識している限界:

- インスタンスが複数に増えた場合、各インスタンスが独立したカウンタを持つため合算では設定値の数倍まで許容してしまう
- IP判定は `X-Forwarded-For` の値に依存する。Cloud Run（Google Front End）が接続元IPを末尾に追記する前提で末尾の値を採用しており、先頭側の値はクライアントが自由に書き換えられるため使わない
- キー数の急増によるメモリ枯渇を防ぐため、上限（`MAX_TRACKED_KEYS`）を超えたら挿入順の古いキーから追い出す（FIFO）ようにしている

### キャッシュ

`GET /api/tasks` はユーザー固有データのため `Cache-Control: private, no-store` を明示し、意図的にキャッシュしません。一方 `/api/classify` の分類結果はユーザーに依存しない（同じタスク名なら誰が入力しても同じ結果になるべき）ため、`lib/classifyCache.ts` で正規化したタイトルをキーにプロセス内メモリでキャッシュし、同一タスク名への重複したGemini呼び出し（コスト・レイテンシ）を避けています。Geminiの`responseSchema`はあくまで指示であり強制力ではないため、キャッシュに入れる前に`classifyResponseSchema`（Zod）で再検証し、モデルが指示から逸脱した値を24時間キャッシュに残さないようにしています。

### ページネーション

`GET /api/tasks` は `cursor` / `limit` によるページネーションに対応しています。Prisma組み込みの `cursor` オプション（対象行が実在している前提）ではなく、`createdAt` + `id` の値そのものをエンコードしたkeyset方式にしているのがポイントです。前者だと、ページ取得の合間にcursor行が削除された場合（例: 完了タスクの一括削除）に空配列が返り、以降のタスクが黙って取得不能になるバグがありました。値ベースの比較にすることで、対象行の削除に影響されずページングを継続できます。現状のUXである「レーンに全件表示」は変えたくなかったため、`useKanban.ts` の初期読み込みは `nextCursor` がある限り自動で全ページを取得して結合する形にとどめ、無限スクロールUI自体は今回のスコープ外としています。

### N+1回避

このアプリのAPIは、いずれもタスク一覧を1回の `findMany` で取得して返すだけで、取得した各行に対してループで追加クエリを発行する箇所がありません（`select` で必要なカラムのみ絞り込み）。タスクに紐づく関連データ（コメント・添付など）を画面ごとに個別取得するような構造ではないため、N+1が原理的に発生しない設計になっています。将来、タスクに関連エンティティを追加する場合は `include` の乱用でここが崩れやすいため、追加時は発行されるクエリ数を確認する運用にしています。

### DBトランザクション

`PATCH /api/tasks` は所有権チェック（`updateMany` で `id` と `userId` の両方に一致する行のみ更新）と更新後の再取得を `prisma.$transaction` で1つのトランザクションにまとめています。2クエリに分かれたままだと、間に別リクエストが割り込むTOCTOUギャップが理論上残るためです。

### ゲストのAI利用制限

ゲストの`aiUsageCount`チェックと加算を別々のクエリで行うと、同時に複数リクエストが飛んだ際に両方が上限チェックを通過してから加算される（TOCTOU）ため上限を超えられてしまいます。`prisma.user.updateMany({ where: { id, aiUsageCount: { lt: GUEST_AI_LIMIT } }, data: { aiUsageCount: { increment: 1 } } })` の形で「上限未満なら加算」を1クエリのアトミックな条件付き更新にすることで、この競合を防いでいます。

### 保留レーン・優先度・停滞検知

タスク管理を「他者待ちを可視化する」「優先度と停滞を意識する」という観点で強化する追加機能です。

- **保留（PENDING）レーン**: `TaskStatus` enumに`PENDING`を追加するマイグレーションを実施。レーン順序を配列（`TASK_STATUS_ORDER`）として一元管理し、クイック移動ボタンの前後判定がレーン数の変化に対して汎用的に動くようにしています
- **優先度判定**: `category` と同じ仕組みで `/api/classify` のGeminiレスポンスに `priority`（高・中・低）を追加。`Task.priority` は `category` 同様、厳密なDB enumではなく`String?`カラム（Zod側では `高|中|低` に制約）としています
- **停滞タスク検知**: `updatedAt` から3日以上ステータスが変わっていない未完了タスクをカードに警告表示。判定に使う現在時刻は`useState`の遅延初期化子でマウント時に取得し、その後は1時間おきのタイマーで更新しています（マウント時の一度きりの取得だと、タブを開きっぱなしにしたまま日をまたいでも停滞判定が更新されないため）

### WIP制限を実装したが、あえて外した判断

「進行中レーンは同時に5件まで」というWIP制限を、クライアント・サーバー両方で強制するところまで一度実装しましたが、サービスとして出す前提で見直し、削除しました。理由は、適正な同時進行数は人によって大きく異なり、固定値をすべてのユーザーに強制するのは押し付けがましく、しかも当時の実装は「例外なくハードブロック」だったため、急ぎで1件だけ追加したい場面でも回避策がなかったためです。個人設定にする・警告のみに緩める、といった改善案もありましたが、今のスコープでは「機能を削って判断の理由を残す」方を選びました。作って終わりにせず、実際のユーザー視点で要不要を再検討したという経緯自体を記録として残しています。

### 重複タスクの検出（トリアージ）

「溜まったタスクの中からAIに重複・統合できそうなものを判断させる」機能です。設計上、意図的にオンデマンド実行のみにし、Cloud Schedulerのような定期実行での自動マージは行っていません。誤検出でタスクが勝手にマージ・削除されるとデータ損失になるため、AIの提案はあくまで「候補の提示」までとし、実行（統合／無視）は必ずユーザーが1件ずつ判断します。

- `POST /api/triage` はタスクの実ID（cuid）ではなく、プロンプト内で振った1始まりの連番でGeminiに参照させています。実IDを直接返させると、モデルが存在しないIDを生成してしまうリスクがありますが、番号なら「配列の範囲内か」だけをチェックすれば安全に実IDへマッピングできます
- Geminiの提案をそのまま信じず、`triageResponseSchema`（Zod）で構造を検証してから返却します
- 実際のマージ（1件を残して残りを削除）専用のAPIは新設せず、既存の `PATCH`（タイトル変更）と `DELETE`（残りの削除）を`useKanban.ts`の`mergeTasks`で組み合わせているだけです。専用のマージエンドポイントを作るよりも、既存の検証済みロジック（所有権チェックやZod検証）をそのまま再利用できる利点を優先しました
- ゲストのAI利用回数カウンター（`aiUsageCount`）は `/api/classify` と共有しています。別カウンターを設けるより、「Geminiを呼ぶAPI全体で1つの上限を共有する」方がシンプルで説明しやすいと判断しました

### ルート統合と自動ゲスト開始

以前は「`/` = マーケティング用ランディングページ」「`/app` = 認証必須のボード」という2段構成でしたが、`/` 1本に統合しました。

- `/` はServer Componentで、`auth()` の結果に応じて出し分けるだけの薄いルーティング層です。未ログインなら `AutoGuestStart`、ログイン済み（ゲスト含む）なら `KanbanBoard` を描画します
- `AutoGuestStart` は「フォーム + Server Action」をformの`action`に指定し、マウント時に自動submitするprogressive enhancement構成にしています。JSが動く実ブラウザではボタンを押させずに一瞬でゲストセッションが立ち上がりますが、JSを実行しないクローラーやbotは何もしない（`<noscript>`のボタンのみ残る）ため、アクセスのたびに使い捨てゲストアカウントがDBに増え続ける事態を避けられます
- ゲストのセッションはCookie（JWT）としてブラウザに残るため、同じ端末で開き直せば同じゲストアカウント・同じタスクに戻ります。タスクデータ自体をlocalStorageに持たせる案も検討しましたが、その場合AI分類・トリアージなど既存のサーバー側ロジックを未認証向けに作り直す必要が生じるため、既存のゲスト機構をそのまま延長する方を選びました
- ゲストが正式アカウント（Google/メール）に切り替えられるよう、`/login` はゲストセッション中でもフォームを表示するようにしています（通常ログイン済みの場合のみスキップ）。`BoardHeader` にもゲスト時だけ「ログイン」リンクを出しています。なお、ゲストから正式アカウントへの切り替えはタスクデータを引き継ぎません（別ユーザーとして作成されるため）——現状は許容している制限です
- 旧 `/app` への直リンク・ブックマークは `proxy.ts` で `/` へリダイレクトしています

## 技術スタック

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS 4
- lucide-react
- Auth.js
- Prisma
- PostgreSQL / Cloud SQL
- Resend
- Google Gemini API (`@google/generative-ai`)
- Zod（入力バリデーション）
- React Hook Form（フォーム状態管理）
- Vitest / Testing Library（テスト）
- Sentry（エラー監視、任意）
- Docker / Docker Compose
- Google Cloud Run / Artifact Registry / Secret Manager / Cloud Scheduler
- Terraform
- GitHub Actions

---

## 開発者向け情報

ここから下は、ローカルで実際にセットアップ・動作確認したい場合の手順です。デプロイ済みのURLでゲストログインしてすぐ試すこともできます。

### セットアップ

依存パッケージをインストールします。

```bash
npm install
```

認証、DB保存、AI 自動分類を使うため、環境変数を設定してください。

ローカルでは `.env.example` を参考に `.env.local` を作成します。

```env
DATABASE_URL="postgresql://kanban_app:password@localhost:5432/kanban?schema=public"
AUTH_SECRET="generate-with-openssl-rand-base64-32"
AUTH_GOOGLE_ID="your-google-oauth-client-id"
AUTH_GOOGLE_SECRET="your-google-oauth-client-secret"
AUTH_RESEND_KEY="your-resend-api-key"
AUTH_EMAIL_FROM="Kanban Dashboard <login@example.com>"
GEMINI_API_KEY=your-gemini-api-key
# 期限切れゲストの自動削除API（/api/admin/cleanup-guests）を保護するシークレット
CRON_SECRET="generate-with-openssl-rand-base64-32"
# Sentryでのエラー監視（任意。未設定でもアプリは正常に動作する）
SENTRY_DSN="your-sentry-dsn"
NEXT_PUBLIC_SENTRY_DSN="your-sentry-dsn"
```

`AUTH_SECRET` は以下のように生成できます。

```bash
openssl rand -base64 32
```

Google OAuth のコールバックURLは以下を登録してください。

```text
http://localhost:3000/api/auth/callback/google
https://your-cloud-run-url/api/auth/callback/google
```

Prisma Client を生成し、DBへマイグレーションを適用します。

```bash
npx prisma generate
npx prisma migrate deploy
```

### 開発

開発サーバーを起動します。

```bash
npm run dev
```

ブラウザで [http://localhost:3000](http://localhost:3000) を開いて確認してください。

### 利用できる npm scripts

```bash
npm run dev              # 開発サーバーを起動
npm run build            # 本番ビルドを作成
npm run start            # 本番ビルドを起動
npm run lint             # ESLint を実行
npm run test             # Vitest でユニットテストを実行（Prismaはモック）
npm run test:integration # 実DB（要 `docker compose up -d test-db`）に対する結合テストを実行
```

### Docker での起動

Docker イメージをビルドして、コンテナをバックグラウンドで起動します。

```bash
docker compose up --build -d
```

起動後、[http://localhost:3000](http://localhost:3000) にアクセスします。

```bash
docker compose down
```

Docker Compose で AI 自動分類も使う場合は、コンテナに `GEMINI_API_KEY` を渡してください。
必要に応じて `docker-compose.yml` の `environment` に追加します。

```yaml
environment:
  - NODE_ENV=production
  - GEMINI_API_KEY=${GEMINI_API_KEY}
```

### データ保存

タスクはログインユーザーごとにPostgreSQLへ保存されます。
テーマ設定のみブラウザの `localStorage` に保存されます。

- テーマ: `theme`

タスクAPIはログイン必須です。ただし未ログインで `/` にアクセスすると、裏で自動的に使い捨てのゲストセッションを開始してからボードを表示するため、体感的にはログイン画面を経由しません（詳細は「設計判断とトレードオフ」内「ルート統合と自動ゲスト開始」参照）。

### API

#### `POST /api/classify`

ログイン済みユーザーのタスクタイトルを Gemini API に送り、カテゴリ・優先度を推定します。同一タイトルの結果はGeminiの`responseSchema`検証に加えてサーバー側でもZodで再検証してからプロセス内メモリにキャッシュされます（不正な値をキャッシュしない）。

リクエスト例:

```json
{
  "title": "週次レポートを作成する"
}
```

レスポンス例:

```json
{
  "category": "仕事",
  "priority": "中"
}
```

カテゴリは `仕事`, `勉強`, `家事`, `趣味`, `その他`、優先度は `高`, `中`, `低` のいずれかです。

#### `/api/tasks`

ログインユーザーのタスク一覧取得（cursorページネーション対応）、作成、更新、削除を行います。
すべての操作でセッションを確認し、他ユーザーのタスクにはアクセスできません。

リクエスト例（`POST`）:

```json
{
  "title": "週次レポートを作成する"
}
```

レスポンス例:

```json
{
  "task": {
    "id": "clx1234567890",
    "title": "週次レポートを作成する",
    "status": "TODO",
    "category": "仕事",
    "priority": "中",
    "createdAt": 1767225600000,
    "updatedAt": 1767225600000
  }
}
```

タスクのステータスは `TODO`（未着手）, `IN_PROGRESS`（進行中）, `PENDING`（保留）, `DONE`（完了）の4種類です。

#### `POST /api/triage`

ログイン済みユーザーの未完了タスク（最大100件）をGeminiに渡し、重複・統合できそうな組み合わせを提案します。オンデマンド実行のみで、定期実行や自動マージは行いません。

レスポンス例:

```json
{
  "suggestions": [
    {
      "taskIds": ["clx111", "clx222"],
      "reason": "同一の作業内容であり、重複しているため。",
      "suggestedTitle": "週次レポートの作成"
    }
  ]
}
```

実際の統合（1件を残して残りを削除）はこのAPI自体では行わず、クライアントが提案を受けて既存の `PATCH` / `DELETE /api/tasks` を呼び出します。

#### `GET /api/health`

ログイン不要。DBへの疎通確認（`SELECT 1`）を行い、正常なら `{ "status": "ok" }` を200で、DBに繋がらなければ503を返します。Cloud Runやモニタリングからのヘルスチェック用です。

### CI / CD

GitHub Actions には以下のワークフローがあります。

- `.github/workflows/ci.yml`: ESLint、Next.js ビルド、Docker ビルド検証
- `.github/workflows/deploy.yml`: main / master への push 時に Cloud Run へデプロイ

デプロイは Google Cloud の Workload Identity を使い、長期鍵を置かずに GitHub Actions から認証します。

### Google Cloud へのデプロイ

Terraform 設定は `terraform/` にあります。
Cloud Run、Artifact Registry、Secret Manager、Workload Identity などを構築します。
認証付き構成では Cloud SQL for PostgreSQL も作成します。

詳しい手順は [DEPLOYS_GUIDE.md](./DEPLOYS_GUIDE.md) を参照してください。

最小の流れは以下です。

```bash
cd terraform
terraform init
terraform plan
terraform apply
```

`terraform.tfvars` には、少なくとも以下を設定します。

```hcl
gcp_project_id    = "your-gcp-project-id"
github_repository = "your-github-user/your-repo"
gemini_api_key    = "your-gemini-api-key"
database_password = "your-db-password"
auth_secret       = "openssl-rand-base64-32"
auth_google_id    = "your-google-oauth-client-id"
auth_google_secret = "your-google-oauth-client-secret"
auth_resend_key   = "your-resend-api-key"
auth_email_from   = "Kanban Dashboard <login@example.com>"
cron_secret       = "openssl-rand-base64-32"

# 本番運用ではtrue推奨（デフォルトtrueのため省略可）
database_deletion_protection = true
```

本番DBのマイグレーションはCloud SQL接続を準備したうえで、デプロイ前後に以下を実行してください。

```bash
npx prisma migrate deploy
```
