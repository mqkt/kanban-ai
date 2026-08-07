# ==============================================================================
# 2. 変数定義ファイル (variables.tf)
# ==============================================================================
# このファイルは、インフラ設計図（main.tf）で使う「設定値（変数）」の入れ物を作る場所です。
# 変数化しておくことで、プロジェクトIDやアプリ名などの環境固有の値を簡単に書き換えられます。
# 実際の値は、「terraform.tfvars」というファイルを作成してそこに記述します。
# ------------------------------------------------------------------------------

variable "gcp_project_id" {
  type        = string
  description = "Google Cloud (GCP) のプロジェクトIDです。"
}

variable "gcp_region" {
  type        = string
  description = "デプロイする場所（リージョン）です。日本国内からアクセスする場合は『東京 (asia-northeast1)』が最も高速でおすすめです。"
  default     = "asia-northeast1"
}

variable "app_name" {
  type        = string
  description = "作成するアプリの名前です。リソース名（サーバー名や倉庫名）のプレフィックス（接頭辞）として使われます。"
  default     = "nextjs-app"
}

variable "github_repository" {
  type        = string
  description = "自動デプロイを行うGitHubのリポジトリ名です。（例:『username/my-app』の形式で記述します）"
}

variable "gemini_api_key" {
  type        = string
  description = "アプリでAIを使用するための Gemini APIキーです。"
  sensitive   = true # これを指定すると、画面やログにAPIキーが生データで表示されるのを防ぎます（非常に安全です）
}

variable "database_name" {
  type        = string
  description = "Cloud SQL に作成するPostgreSQLデータベース名です。"
  default     = "kanban"
}

variable "database_user" {
  type        = string
  description = "アプリがCloud SQLへ接続するためのDBユーザー名です。"
  default     = "kanban_app"
}

variable "database_password" {
  type        = string
  description = "アプリがCloud SQLへ接続するためのDBパスワードです。"
  sensitive   = true
}

variable "database_tier" {
  type        = string
  description = "Cloud SQLインスタンスのマシンタイプです。"
  default     = "db-f1-micro"
}

variable "database_deletion_protection" {
  type        = bool
  description = "Cloud SQLインスタンスの削除保護を有効にするかどうかです。本番運用では true を推奨します。destroyする場合は事前にこれを false にしてapplyし直す必要があります（DEPLOYS_GUIDE.mdの「お片付け」参照）。"
  default     = true
}

variable "auth_secret" {
  type        = string
  description = "Auth.jsのセッション暗号化に使うランダムな秘密文字列です。"
  sensitive   = true
}

variable "auth_google_id" {
  type        = string
  description = "Google OAuth クライアントIDです。"
}

variable "auth_google_secret" {
  type        = string
  description = "Google OAuth クライアントシークレットです。"
  sensitive   = true
}

variable "cron_secret" {
  type        = string
  description = "期限切れゲスト自動削除API（/api/admin/cleanup-guests）を保護するシークレットです。Cloud Scheduler からの呼び出しをこの値のBearerトークンで認証します。"
  sensitive   = true
}
