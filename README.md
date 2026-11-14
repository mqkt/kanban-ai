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
- タイトル検索、同じタイトルを追加したときの通知
- 削除の「元に戻す」（6秒間は取り消せる）

## 技術スタック

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS 4
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

## デザインと設計判断

### 画面の構成
- 看板の定番に合わせ、「未着手 / 進行中 / 保留 / 完了」を同じ幅で横に並べた4列ボードにしました（狭い画面では2列、さらに狭いと縦に積みます）。横スクロールは、マウスで操作しにくく、画面外の列へドラッグもできないため採りませんでした。
- 1人で使う前提なので、同時に進める件数を絞れるよう進行中の見出しに件数を出しています。上限は設けていません（個人利用では警告より、見えていることのほうが効くと判断）。
- ヘッダーは「名前 / アカウント（状態の説明とその操作）/ 設定（テーマ切替）」の3つだけにしました。ゲストのデータが24時間で消える事実は、ログインの導線と同じ場所に置いています。

### 見た目の決め方とAIの使い方
- 実装は Claude Code（AI）が書き、方向を決めるのは私、という分担にしました。
- 見た目の方向は、AIが生成したUIに出がちな定番（同じ配色・同じ角丸・飾りの罫線）を避けるため、デザイン用のスキル（hallmark）に候補を3案ずつ出させ、私が選びました。選んだのは、白いカードを黒の太い罫線とずらした影で囲む「Terrazzo」系の体系です。最初の2案（Notion風、スイス風）は、他のAI製UIと見分けが付かず、作り直しています。
- 構成（4列ボード、ヘッダーの3分割）はスキルが決めるものではありません。用途と看板の定番から、AIと相談しながら私が決めました。
- 文言は、日本語のまま短く直接的にし、叱る言い方（「多すぎます」など）をやめました。英語は製品名だけです。

### 生成物をどう検証したか
- **機械検査**: スキルの検査スクリプトで、色・フォントの直書き、焦点表示、タッチ対象の大きさなどを確認し、変更前後でリンク・入力欄・イベント処理が残っていることも比較しました。
- **別のAIによるレビュー**: 作った本人（のAI）とは別の文脈でレビューさせ、指摘を1件ずつ採否しました。見送った指摘は理由を残しています。
- **ブラウザでの確認**: 開発サーバーを開いたブラウザで、デスクトップ・スマホ幅・ダーク表示、タスクが入った状態、「停滞中」、重複の提案とその統合、削除と元に戻す、カテゴリのメニューを実際に操作して確かめました（スマホ本体での確認はしていません）。ドラッグ移動は、ブラウザ操作ツールのマウスドラッグでは発火しなかったため、ドラッグのイベントを直接発火して確かめています。
- **見つかった不具合**: この確認で、指定した書体が実は一度も適用されていなかったことが分かりました（フォント用の変数を `body` に付けたのに、`:root` から参照していた）。見た目は「それらしく」見えていたため、画面を眺めるだけでは気づけず、レビューの指摘から実際の描画フォントを測って判明しました。

### トレードオフ
- **削除**: 確認ダイアログではなく「元に戻す」にしました。画面から先に消し、サーバーへの削除は6秒後に送ります（ページを離れるときは即時に送信）。一方で、猶予中にブラウザが強制終了すると削除が反映されません。
- **重複**: 追加のたびにAIへ問い合わせると、呼び出し回数と待ち時間が増えるため、追加時は「同じタイトル」の通知だけをその場で出し、AIによる検出は押したときだけにしました。
- **未対応**: 同じ列の中での並べ替えは、順序を持つ列（`position`）をデータベースに追加する必要があるため、まだ入れていません。
- **確認の限界**: 描画を自動で撮って検査する仕組み（ヘッドレスブラウザ）は未導入です。読み込み中・エラー画面の表示は、コード上の実装のみで、画面では確認できていません。

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
