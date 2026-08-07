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
- Auth.js による Google OAuth 認証
- PostgreSQL によるユーザー別タスク保存
- Gemini API を使ったタスクカテゴリ・優先度の自動推定（手動での変更も可能）
- カテゴリによる絞り込み表示
- 3日以上ステータスが変わっていないタスクの停滞検知
- AIによる重複タスクの検出・統合提案（トリアージ）

## AIとの協働プロセス

このリポジトリはエンジニアインターン選考向けのポートフォリオとして、実装の大部分を [Claude Code](https://claude.com/claude-code) と対話しながら進めています。

### 進め方

1. まず非機能要件のギャップ（バリデーション、テスト、可観測性、レートリミット、ページネーション、キャッシュ、CSRF、DBトランザクション、READMEの記述不足など）を洗い出し、優先順位を付けたタスクリストを作成
2. Claude Codeのサブエージェント（Explore）にコードベース全体の現状調査を任せ、各項目が実際に「有る/無い」を根拠となるファイル・行番号付きで確認してから着手（推測で「無いはず」と決めつけない）
3. リスト上から順に、1項目ずつ実装 → 型チェック・Lint・テスト・ビルド → 実際にブラウザで動作確認、というサイクルを回す
4. 実装の進行はタスク管理機能で明示的に追跡し、着手中／完了を都度更新

### AIに任せた範囲と、自分で判断した範囲

- **AIに任せた部分**: 各項目の具体的な実装（Zodスキーマ設計、React Hook Formへの置き換え、テストコード、Terraformの差分など）や、複数の実現方法とそのトレードオフの提示
- **自分で判断した部分**: 技術選定そのもの。例えばテスト基盤はJestではなくVitestを選択、APIのレートリミットは外部インフラ（Upstash Redis等）を使わずインメモリ実装に留めることを選択、構造化ログもpino等のライブラリを追加せず自前の軽量JSONラッパーで十分と判断——これらはいずれもAIが選択肢とトレードオフを提示した上で、このアプリの規模・運用コストを踏まえて自分で決定した
- **Claudeに代行させなかった部分**: Google Cloud コンソールでの実際のログイン・課金情報の入力、発行されたAPIキーやOAuthシークレットの授受——認証情報・支払い情報が絡む操作は一貫して人間側の操作として残している。`terraform apply` / `terraform destroy` 自体は基本的にClaudeが実行しているが、破壊的な変更（リソース削除を伴う `apply` など）はClaude Code側の安全機構に自動でブロックされることがあり、その場合はコマンドをそのまま人間に渡して実行してもらっている

### 生成されたコードの検証方法

- **型・静的解析**: `npx tsc --noEmit` / `npm run lint` を各変更後に実行
- **自動テスト**: ユニット（`npm run test`、Prismaはモック）と結合（`npm run test:integration`、実DB使用）を分離。モックでは「実際にDBで正しく動くか」までは検証できないため、ゲストAI利用上限の並行制御などDBの排他制御が絡む部分は結合テストで担保しています
- **ビルド**: `npm run build` が通ることを都度確認
- **実機確認**: Claude Codeのブラウザ操作でdevサーバーを実際に操作（ゲストログイン → タスク追加 → AI自動分類 → ネットワーク/コンソールエラー確認）して検証
- **インフラ**: `terraform plan` で差分を確認してから `apply`。意図しない差分（本番イメージがコード上のプレースホルダーに巻き戻る等）が出た場合は `-target` や `gcloud` コマンドで安全に反映

## 設計判断とトレードオフ

### 入力バリデーション

`lib/validation/` の [Zod](https://zod.dev/) スキーマをクライアント（`zodResolver`）とサーバー（`safeParse`）で共有し、フロントとサーバーのルールが食い違わないようにしています。

### CSRF対策

NextAuthの`SameSite=Lax`セッションCookieと、独自エンドポイント（`/api/tasks`・`/api/classify`）がJSON専用のfetchしか受け付けない仕様（素の`<form>`では再現できない）の組み合わせにより、追加のCSRFトークンなしでも安全と判断しています。

### CSP（Content Security Policy）

`proxy.ts`でリクエストごとにnonceを発行し、`script-src`をnonceベース（`'unsafe-inline'`不使用、`'strict-dynamic'`付き）にしています。外部スクリプト・フォントを使わない構成なので `default-src 'self'` をそのまま適用できます。`style-src`だけは`'unsafe-inline'`を許可しています。CSS注入はXSSほど実害が大きくなく、`next dev`のHMRがnonceなしのインラインstyleを使うため、厳格化すると開発時に無害な警告で本来見るべきエラーが埋もれるためです。

### レートリミット

`lib/rateLimit.ts`でプロセス内メモリの固定ウィンドウ制限（IP+パスごとに1分60リクエスト）を実装しています。Upstash Redis等の外部ストアの方が正確ですが、このアプリの規模では追加コストに見合わないと判断しました。認識している限界は、Cloud Runが複数インスタンスに増えると各インスタンスが独立カウンタを持つため、合算で設定値を超えうる点です。

### キャッシュ

`GET /api/tasks` はユーザー固有データなのでキャッシュしません。`/api/classify` の分類結果は同じタスク名なら誰が入力しても同じになるべきなので、`lib/classifyCache.ts` でタイトルをキーにキャッシュし、Gemini呼び出しの重複を避けています。

### ページネーション

`GET /api/tasks` はkeyset方式（`createdAt`+`id`をエンコード）でページネーションしています。Prisma標準の`cursor`オプションだと、ページ取得中にcursor行が削除された場合（完了タスクの一括削除など）に以降のタスクが取得できなくなるバグがあったための対応です。

### N+1回避

タスク一覧は1回の `findMany` で取得するだけで、行ごとの追加クエリは発生しない設計です。

### DBトランザクション

`PATCH /api/tasks` は所有権チェックと再取得を `prisma.$transaction` でまとめ、間に別リクエストが割り込むTOCTOUを防いでいます。

### ゲストのAI利用制限

`aiUsageCount` のチェックと加算を1クエリのアトミックな条件付きUPDATEにすることで、並行リクエストによる上限超えを防いでいます。

### Gemini呼び出し自体の1日上限（`lib/geminiBudget.ts`）

ユーザー単位の制限（ゲストの`aiUsageCount`）だけでは、Gemini無料枠という「アプリ全体で共有された1日あたりの資源」は守れません。ログイン済みユーザーには利用回数の上限が無く、ゲストも「ゲストで試す」を押し直すたびに新しい使い捨てアカウント（＝新しい`aiUsageCount`）を得られるため、複数ユーザーが束になる、または1人が`proxy.ts`の汎用レートリミット（1分60回）のペースで叩き続けるだけで、無料枠（Lite系モデルで500 RPD）を数分〜十数分で使い切れてしまいます。

対応として、ユーザーに関わらず「モデルごとにアプリ全体で1日に呼べる回数」自体にも上限（450回、実際の無料枠より少し低く設定）を設けています。Cloud Runが複数インスタンスに増えるとインスタンスごとに別カウンタになる（`lib/rateLimit.ts`と同じ限界）ため完全ではありませんが、「誰か1人が無制限に呼べる」状態よりは安全側です。

### 保留レーン・優先度・停滞検知

- **保留（PENDING）レーン**: `TaskStatus` にenumを追加。レーン順序は配列で一元管理しています
- **優先度判定**: `/api/classify` のGeminiレスポンスに `priority`（高・中・低）を追加
- **停滞タスク検知**: 3日以上ステータスが変わっていない未完了タスクに警告表示。判定用の現在時刻は1時間おきに更新しています

### カテゴリの手動編集と絞り込み

AIが自動分類するだけでは、カテゴリは「表示されるだけの情報」で終わり、タグとしての意味が薄いと判断しました。カード上でカテゴリを直接変更できるようにし、さらにボード上部でカテゴリごとの絞り込み表示を追加しています。カテゴリは自由入力にせず、AI分類と同じ固定5択（`TASK_CATEGORIES`、`lib/validation/task.ts`）に揃えています。自由入力を許すと「仕事」「Work」のような表記ゆれで同じ意味のカテゴリが増殖し、絞り込みも色分けも機能しなくなるためです。この定数はAPI側のZodバリデーション・Geminiへのプロンプト・UIの選択肢すべてで共有しており、選択肢を変えたい場合も1箇所の変更で済みます。

### WIP制限を実装したが、あえて外した判断

「進行中は同時5件まで」というWIP制限を一度実装しましたが削除しました。適正な同時進行数は人によって違い、固定値の強制は押し付けがましいと判断したためです。

### メールリンク認証（Resend）を実装後に削除した判断

Resendのメールリンクログインを実装しましたが削除しました。ドメイン認証をしない限り自分の検証済みアドレスにしか送れず、ログイン画面に「押しても機能しないボタン」が残る状態だったためです。Google OAuth・ゲストログインの2経路に絞りました。

### 重複タスクの検出（トリアージ）

AIに重複・統合できそうなタスクを提案させる機能です。誤検出によるデータ損失を避けるため、オンデマンド実行のみで自動マージはせず、実行は必ずユーザーが1件ずつ判断します。Geminiにはタスクの実IDではなく連番を振って参照させ、存在しないIDを生成してしまうリスクを防いでいます。

### ルート統合と自動ゲスト開始

「`/` = ランディングページ」「`/app` = ボード」という2段構成を `/` 1本に統合しました。未ログインなら `AutoGuestStart` が自動でゲストセッションを開始し、ログイン画面を経由せずすぐ使い始められます。JSを実行しないbotには何も起きないため、アクセスのたびに使い捨てアカウントが増え続ける事態も避けられます。

### Gemini APIキーをCloud Run/DBとは別プロジェクトに分離した理由

Gemini APIは他の多くのGCPサービスと異なり、**請求先アカウントを一度でもリンクすると無料枠が即座に失われます。** Cloud Run・Cloud SQLには請求先アカウントが必須のため、当初は単一プロジェクトにまとめていましたが、これによりGemini APIも無料枠を失い、429エラーで分類・トリアージ機能が止まりました。対応として、Gemini APIキーの発行元だけ別プロジェクト（請求先アカウント未リンク）に分離しました。

- 無料枠のレート制限（Lite系モデルで15 RPM / 500 RPD、有料ティアは4,000 RPM）は、ポートフォリオ規模のトラフィックなら十分と判断しました
- レート制限はモデル単位でカウントされるため、`/api/classify`（`gemini-3.5-flash-lite`、高頻度用途）と `/api/triage`（`gemini-3.1-flash-lite`、低頻度用途）で異なるモデルを使い、合計の実質使用可能量を2倍（RPD 1000 / RPM 30）にしています
- デメリットとして管理対象のプロジェクトが1つ増えます。「アーキテクチャ上の必然」ではなく「無料枠維持のためのコスト回避」であることは、面接等で聞かれたら正直に説明する前提です

## 技術スタック

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS 4
- lucide-react
- Auth.js
- Prisma
- PostgreSQL / Cloud SQL
- Google Gemini API (`@google/generative-ai`)
- Zod（入力バリデーション）
- React Hook Form（フォーム状態管理）
- Vitest / Testing Library（テスト）
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
GEMINI_API_KEY=your-gemini-api-key
# 期限切れゲストの自動削除API（/api/admin/cleanup-guests）を保護するシークレット
CRON_SECRET="generate-with-openssl-rand-base64-32"
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

tfstateはリモートバックエンド（GCS、バージョニング有効）で管理しています。ローカルstateのみだとPCの紛失やstate破損で復旧不能になるリスクがあるため、`provider.tf` の `backend "gcs"` ブロックでバケットを指定し、`terraform init -migrate-state` で移行済みです。

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
cron_secret       = "openssl-rand-base64-32"

# 本番運用ではtrue推奨（デフォルトtrueのため省略可）
database_deletion_protection = true
```

本番DBのマイグレーションはCloud SQL接続を準備したうえで、デプロイ前後に以下を実行してください。

```bash
npx prisma migrate deploy
```

