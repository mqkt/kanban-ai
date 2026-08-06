# 🚀 【初心者向け】Google Cloud デプロイ・ガイドブック

このガイドブックは、インフラ構築や Google Cloud が初めての方でも、迷わず Next.js アプリをインターネット上に公開（デプロイ）できるように、ステップバイステップで解説したものです。

---

## 🛠️ 事前準備：必要なツールをインストールする

まずはあなたのパソコン（Mac）でインフラ構築用のコマンドを使えるようにします。

### 1. Homebrew がインストールされているか確認
Mac の「ターミナル」アプリを開き、以下のコマンドを実行します。
```bash
brew -v
```
※バージョンが表示されればOKです。もしインストールされていない場合は、[Homebrew公式サイト](https://brew.sh/ja/)の手順に従ってインストールしてください。

### 2. Terraform（テラフォーム）のインストール
ターミナルで以下のコマンドを実行して、Terraform をインストールします。
```bash
brew tap hashicorp/tap
brew install hashicorp/tap/terraform
```
インストールできたか確認します：
```bash
terraform -v
```

### 3. Google Cloud CLI（gcloud コマンド）のインストール
Google Cloud をコマンド操作するための公式ツールをインストールします。
```bash
brew install --cask google-cloud-sdk
```
※インストール後、ターミナルを再起動するか、新しいターミナルウィンドウを開いて以下を実行します。
```bash
gcloud -v
```

---

## ☁️ Google Cloud でプロジェクトを作成する

### 1. Google Cloud コンソールにアクセス
ブラウザで [Google Cloud コンソール](https://console.cloud.google.com/) にアクセスし、お持ちのGoogleアカウントでログインします（初めての場合は利用規約への同意画面が出ます）。

### 2. プロジェクトを新規作成する
1. 画面の一番上にある「プロジェクトの選択」（または既存のプロジェクト名）をクリックします。
2. ポップアップの右上にある **「新しいプロジェクト」** をクリックします。
3. **プロジェクト名**（例: `my-nextjs-app`）を入力して「作成」を押します。
4. 作成が終わると、画面の上に「プロジェクトID」が表示されます。**このプロジェクトID（例: `my-nextjs-app-421508`）をメモしておいてください！**

### 3. 課金（請求先アカウント）の有効化
Cloud Run を使うには、プロジェクトに「請求先アカウント（クレジットカード等の登録）」を紐付ける必要があります。
* Google Cloud は新規アカウント作成時に **$300（約4万5千円分）の無料クレジット** が付与されるため、最初はお金がかかりません。
* Cloud Run はアクセスがない時は料金が **「0円」** になるため、課金設定をしても上限に達しない限り実質無料で使えます。
* コンソール左上のメニューから「お支払い」を選択し、プロジェクトに請求先が紐付いていることを確認してください。

---

## 🔑 ローカルPCから Google Cloud にログインする

Terraformがあなたの代わりにGoogle Cloudを操作できるように、ターミナルからログインを行います。

1. **基本ログイン**:
   ```bash
   gcloud auth login
   ```
   * ブラウザが開くので、Google Cloud で使っているアカウントを選択してログインを許可します。

2. **Terraform用ログイン（非常に重要です！）**:
   ```bash
   gcloud auth application-default login
   ```
   * これを実行することで、Terraform があなたのログイン情報を利用して自動構築できるようになります。ブラウザが開くので、同様に許可してください。

3. **操作対象のプロジェクトを設定する**:
   ```bash
   # ※角カッコ [ ] は含めずに、プロジェクトIDだけを記述して実行します
   gcloud config set project project-c812eeb4-5615-411f-aff
   ```
   * ※もし `WARNING: Your active project does not match...` という警告が出た場合は、以下のコマンドも実行しておくと、警告が消えて安心です：
     ```bash
     gcloud auth application-default set-quota-project project-c812eeb4-5615-411f-aff
     ```

---

## 🏗️ Terraform を使ってインフラを構築する

いよいよ設計図を実行して、Google Cloud上にリソース（サーバーや倉庫）を作ります！

### 1. 設定ファイル（terraform.tfvars）の用意
1. `terraform/terraform.tfvars.example` ファイルをコピーして、同じフォルダ内に **`terraform.tfvars`** というファイルを作成します。
2. 作成した `terraform.tfvars` を開き、以下の項目を入力します。

```hcl
gcp_project_id    = "あなたのGCPプロジェクトID（メモしたもの）"
github_repository = "あなたのGitHubユーザー名/リポジトリ名"
gemini_api_key    = "あなたのGemini APIキー"
database_password = "Cloud SQLで使う強いDBパスワード"
auth_secret       = "Auth.jsで使うランダムな秘密文字列"
auth_google_id    = "Google OAuth クライアントID"
auth_google_secret = "Google OAuth クライアントシークレット"
auth_resend_key   = "Resend APIキー"
auth_email_from   = "Kanban Dashboard <login@example.com>"
cron_secret       = "ゲスト自動削除API(cleanup-guests)を保護するランダムな秘密文字列"

# 本番運用ではtrue推奨（誤ってterraform destroyしてもDBが消えないようにする）。
# デフォルトがtrueなので、明示的にfalseにしない限りこの行は省略してもOK。
database_deletion_protection = true
```

`auth_secret` ・ `cron_secret` は以下のコマンドで作成できます。

```bash
openssl rand -base64 32
```

Google OAuth には、Terraform適用後に表示される `cloud_run_url` を使って以下のコールバックURLを登録します。

```text
https://あなたのCloud Run URL/api/auth/callback/google
```

ローカル開発も行う場合は、こちらも追加します。

```text
http://localhost:3000/api/auth/callback/google
```

### 2. インフラ構築コマンドの実行

ターミナルで `terraform` フォルダに移動して、順番にコマンドを実行します。
（※注意: フォルダの移動はターミナル上で行ってください）

1. **初期化（最初の1回だけ必要です）**:
   ```bash
   # プロジェクトのルートにいる場合
   cd terraform
   terraform init
   ```
   * 必要なプラグインなどが自動でダウンロードされます。

2. **事前確認（何が作られるかシミュレーションします）**:
   ```bash
   terraform plan
   ```
   * 作成される予定のリソースが一覧表示されます。エラーが表示されなければ準備万端です。

3. **本番適用（実際にGoogle Cloud上に構築します）**:
   ```bash
   terraform apply
   ```
   * 途中で `Do you want to perform these actions?` と聞かれるので、半角で **`yes`** と入力してエンターキーを押します。
   * **約2〜3分** で構築が完了します！

🎉 **完了画面に、あなたのアプリのURLや、GitHub設定に必要な情報が表示されます！**
表示された出力値（Outputs）をメモしておいてください。

### 3. DBマイグレーションを適用する

Cloud SQLを作成した直後は、まだテーブルがありません。アプリを使う前にPrismaのマイグレーションを適用します。

Cloud SQL Auth Proxyなどで `DATABASE_URL` からCloud SQLへ接続できる状態にしたうえで、プロジェクトルートで以下を実行してください。

```bash
npx prisma migrate deploy
```

ローカルPostgreSQLで開発する場合も、同じコマンドでテーブルを作成できます。

---

## 🤖 GitHub Actions で自動デプロイ（CD）を設定する

最後のステップです！コードを更新したときに自動でデプロイが走るように、GitHub側にGoogle Cloudの情報を登録します。

### 1. GitHub Secrets の登録
GitHub のリポジトリページを開き、**「Settings」>「Secrets and variables」>「Actions」** に移動します。

**「New repository secret」** ボタンを押し、以下の3つのシークレットを登録してください。

| 名前 (Name) | 値 (Value) | 説明 |
| :--- | :--- | :--- |
| `GCP_PROJECT_ID` | `あなたのGoogle CloudプロジェクトID` | 例: `my-nextjs-app-421508` |
| `GCP_WORKLOAD_IDENTITY_PROVIDER` | `Terraform完了画面に表示された workload_identity_provider の値` | `projects/...` から始まる長い文字列です。 |
| `GCP_SERVICE_ACCOUNT_EMAIL` | `Terraform完了画面に表示された service_account_email の値` | `nextjs-app-github-actions@...` から始まるメールアドレスです。 |

### 2. 自動デプロイの確認
1. これまで作成したファイルを GitHub リポジトリの `main`（または `master`）ブランチへプッシュします。
2. GitHubのリポジトリページにある **「Actions」タブ** を開きます。
3. 自動デプロイのジョブ（ワークフロー）が動き出しているはずです！
4. **緑色のチェックマーク** がつけば自動デプロイ大成功です。Terraformの完了画面に表示された `cloud_run_url` （またはCloud Runコンソールに表示されたURL）にブラウザでアクセスして、あなたのNext.jsアプリが表示されることを確認してください！

---

## ⚠️ お片付け（課金を防ぐためにすべて削除する方法）

もし実験が終わったり、インフラを一度すべて消去して初期状態に戻したい場合は、以下のコマンドを実行するだけで、作ったものがすべて自動で安全に削除されます。

```bash
# terraform フォルダの中で実行します
terraform destroy
```
* 途中で聞かれたら **`yes`** と入力すれば、数分ですべてのGoogle Cloud上のリソースが消去され、課金の心配もなくなります。

**⚠️ 注意（`database_deletion_protection` を有効にしている場合）**

`database_deletion_protection = true`（デフォルト）のままだと、Cloud SQLインスタンスが削除保護されているため `terraform destroy` は失敗します。誤った削除を防ぐための仕様です。本当に削除したい場合は、`terraform.tfvars` で一時的に

```hcl
database_deletion_protection = false
```

に変更してから `terraform apply` を一度実行し、削除保護を解除した上で改めて `terraform destroy` を実行してください。

---

## 🔄 別のGoogleアカウントへ移行する

Google OAuth・Gemini APIキー・GCPプロジェクトのすべてを別のGoogleアカウントに切り替えたい場合のチェックリストです。コード側はすべて環境変数・Terraform変数経由になっており、プロジェクト固有の値がハードコードされている箇所は無いため、コード変更は不要です。以下は「Google Cloud コンソール上での操作」と「設定ファイルの書き換え」だけで完結します。

### 1. 新しいGoogleアカウントでGCPプロジェクトを作る

このガイドの [☁️ Google Cloud でプロジェクトを作成する](#️-google-cloud-でプロジェクトを作成する) を、**別のGoogleアカウントでログインした状態**で最初からやり直します。

- [ ] 新しいGoogleアカウントで [Google Cloud コンソール](https://console.cloud.google.com/) にログイン
- [ ] 新規プロジェクトを作成し、プロジェクトIDをメモ
- [ ] 請求先アカウント（課金）を有効化

### 2. Google OAuth クライアントを新規発行する

- [ ] 新しいプロジェクトの「APIとサービス」>「認証情報」で、OAuth同意画面を設定
- [ ] OAuth 2.0 クライアントIDを新規作成（種類: ウェブアプリケーション）
- [ ] 承認済みのリダイレクトURIに、新しいCloud Run URL（`terraform apply` 完了後に判明するため、一旦ローカル開発用の `http://localhost:3000/api/auth/callback/google` だけ登録し、後述の手順4完了後にCloud Run分を追記してもよい）を登録
- [ ] 発行されたクライアントID・クライアントシークレットを控える（**チャットには貼らず**、次の手順で直接ファイルに入力する）

### 3. Gemini APIキーを新規発行する

- [ ] 新しいGoogleアカウント・プロジェクトで [Google AI Studio](https://aistudio.google.com/) もしくはCloud Consoleから新しいGemini APIキーを発行

### 4. 設定ファイルを新しい値に書き換える

以下のファイルはすべてgitignore対象（コミットされない）なので、値を直接書き換えます。

- [ ] `terraform/terraform.tfvars`: `gcp_project_id` ・ `auth_google_id` ・ `auth_google_secret` ・ `gemini_api_key` を新しい値に更新（他の値、例えば `auth_secret` や `database_password` は使い回しではなく、新環境用に発行し直すことを推奨）
- [ ] `.env.local`（ローカル開発を続ける場合）: `AUTH_GOOGLE_ID` ・ `AUTH_GOOGLE_SECRET` ・ `GEMINI_API_KEY` を同様に更新

### 5. 新しいプロジェクトにインフラを構築する

- [ ] `terraform/` フォルダで `gcloud auth login` ・ `gcloud auth application-default login` を新しいアカウントで実行し直す（[🔑 ローカルPCから Google Cloud にログインする](#-ローカルpcから-google-cloud-にログインする) 参照）
- [ ] `gcloud config set project <新しいプロジェクトID>`
- [ ] `terraform init` → `terraform plan` → `terraform apply`
- [ ] 完了画面に表示された `cloud_run_url` を、手順2のOAuthクライアントの「承認済みのリダイレクトURI」に追記（`https://<cloud_run_url>/api/auth/callback/google`）
- [ ] `npx prisma migrate deploy` でDBマイグレーションを適用

### 6. GitHub Secretsを更新する

新しいプロジェクトの `terraform apply` 完了画面に表示される値で、GitHubリポジトリの Secrets（[🤖 GitHub Actions で自動デプロイ（CD）を設定する](#-github-actions-で自動デプロイcdを設定する) 参照）を上書きします。

- [ ] `GCP_PROJECT_ID`
- [ ] `GCP_WORKLOAD_IDENTITY_PROVIDER`
- [ ] `GCP_SERVICE_ACCOUNT_EMAIL`

### 7. 旧プロジェクトの後片付け

課金を止めるため、旧アカウント・旧プロジェクト側のリソースを削除します。

- [ ] 旧プロジェクトの `terraform/`（旧 `terraform.tfvars` ・ `terraform.tfstate` が必要）で `terraform destroy` を実行、または
- [ ] Google Cloud コンソールでプロジェクトごと「シャットダウン」する（一定期間後に完全削除される）

いずれの操作も本番リソースに対する破壊的な操作のため、Claudeが代行することはありません。手順1〜3（Google Cloud コンソール上でのプロジェクト作成・OAuth設定・APIキー発行）はブラウザ操作を伴うため、Claude Browserでの同席作業も可能です（ただしログイン自体・課金情報の入力・発行されたシークレットの転記はユーザー自身が行います）。
