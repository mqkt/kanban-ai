# Kanban Dashboard

AI によるタスク自動分類を備えた、Next.js 製のかんばんボードです。
タスクは「未着手」「進行中」「保留」「完了」の 4 レーンで管理でき、ドラッグ＆ドロップやクイック移動ボタンでステータスを更新できます。

**🔗 [デプロイ済みアプリを試す](https://nextjs-app-ta5aoszrnq-an.a.run.app)** — アクセスすると自動でゲストセッションが始まり、アカウント登録なしですぐ試せます。Googleログインにも対応しています。

## 主な機能

- タスクの追加、編集、削除
- 未着手 / 進行中 / 保留 / 完了の 4 レーン管理
- ドラッグ＆ドロップによるレーン移動
- カード内ボタンによるクイック移動
- 完了タスクの一括削除
- ライト / ダークテーマ切り替え
- Auth.js による Google OAuth 認証
- PostgreSQL によるユーザー別タスク保存
- Gemini API を使ったタスクカテゴリの自動推定（手動での変更も可能）
- カテゴリによる絞り込み表示
- 3日以上ステータスが変わっていないタスクの停滞検知
- AIによる重複タスクの検出・統合提案

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

## セットアップ

```bash
npm install
cp .env.example .env.local   # 値を埋める
npx prisma generate
npx prisma migrate deploy
```

Google OAuth のコールバックURLは以下を登録してください。

```text
http://localhost:3000/api/auth/callback/google
https://your-cloud-run-url/api/auth/callback/google
```

## 開発

```bash
npm run dev
```

ブラウザで [http://localhost:3000](http://localhost:3000) を開いて確認してください。

## Docker での起動

```bash
docker compose up --build -d
```

起動後、[http://localhost:3000](http://localhost:3000) にアクセスします（`docker compose down` で停止）。AI自動分類を使う場合は `GEMINI_API_KEY` をコンテナに渡してください。

## データ保存

タスクはログインユーザーごとにPostgreSQLへ保存されます。テーマ設定のみブラウザの `localStorage` に保存されます。

タスクAPIはログイン必須です。ただし未ログインで `/` にアクセスすると、裏で自動的に使い捨てのゲストセッションを開始してからボードを表示するため、体感的にはログイン画面を経由しません。

## API

- `POST /api/classify` — タスクタイトルをGemini APIに送り、カテゴリを推定
- `/api/tasks` — タスクの一覧取得（cursorページネーション対応）・作成・更新・削除。他ユーザーのタスクにはアクセス不可
- `POST /api/duplicates` — 未完了タスク（最大100件）をGeminiに渡し、重複・統合できそうな組み合わせを提案（実際の統合は既存の `PATCH` / `DELETE` を利用）
- `GET /api/health` — DB疎通確認。Cloud Runやモニタリングからのヘルスチェック用

## CI / CD

- `.github/workflows/ci.yml`: ESLint、Next.js ビルド、Docker ビルド検証
- `.github/workflows/deploy.yml`: main / master への push 時に Cloud Run へデプロイ（Workload Identityで長期鍵なし認証）

## Google Cloud へのデプロイ

Terraform 設定は `terraform/` にあります。Cloud Run、Artifact Registry、Secret Manager、Workload Identity、Cloud SQL for PostgreSQL を構築します。tfstateはGCSのリモートバックエンドで管理しています。

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
app_url           = "https://your-cloud-run-url"  # 初回デプロイ後に確定
```

本番DBのマイグレーションは、Cloud SQL接続を準備したうえで `npx prisma migrate deploy` を実行してください。
