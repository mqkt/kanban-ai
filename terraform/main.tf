# ==============================================================================
# 3. メイン設計図ファイル (main.tf)
# ==============================================================================
# このファイルは、Google Cloud上に具体的にどのようなリソース（サーバー、倉庫、権限）を
# 作成するかをすべて記述する「最も重要なファイル」です。
# ------------------------------------------------------------------------------

# ------------------------------------------------------------------------------
# 1. 必要なGoogle Cloudの「機能（API）」を有効化する
# ------------------------------------------------------------------------------
# Google Cloudでは、サービスを使用する前にそのサービスの「API」を有効にする必要があります。
# ここでは、コンテナ、サーバー、認証に必要な5つのAPIを自動で有効化します。

variable "gcp_services" {
  type    = list(string)
  default = [
    "run.googleapis.com",              # Cloud Run (サーバー実行環境)
    "artifactregistry.googleapis.com", # Artifact Registry (コンテナ倉庫)
    "iam.googleapis.com",              # IAM (ユーザー・権限管理)
    "sts.googleapis.com",              # Security Token Service (GitHubとの認証用)
    "iamcredentials.googleapis.com"    # OIDC認証のトークン生成用
  ]
}

resource "google_project_service" "enabled_apis" {
  for_each = toset(var.gcp_services)
  service  = each.value

  # Terraformがリソースを削除する際に、APIの無効化による他リソースへの影響を防ぐため、
  # API自体は削除（無効化）しないように保護します。
  disable_on_destroy = false
}

# ------------------------------------------------------------------------------
# 2. コンテナ倉庫 (Artifact Registry) を作る
# ------------------------------------------------------------------------------
# あなたのNext.jsアプリをコンテナ（Dockerイメージ）化したパッケージを保存するための倉庫です。

resource "google_artifact_registry_repository" "app_repo" {
  depends_on    = [google_project_service.enabled_apis] # API有効化が終わってから作成
  location      = var.gcp_region
  repository_id = "${var.app_name}-repo"
  description   = "Next.jsアプリのDockerイメージを保管する倉庫です"
  format        = "DOCKER"
}

# ------------------------------------------------------------------------------
# 3. サーバー (Cloud Run) を作る
# ------------------------------------------------------------------------------
# Next.jsアプリを実行し、インターネット上に公開するためのサービスです。

resource "google_cloud_run_v2_service" "web_app" {
  depends_on = [google_project_service.enabled_apis]
  name       = var.app_name
  location   = var.gcp_region
  ingress    = "INGRESS_TRAFFIC_ALL" # インターネット全体からのアクセスを許可します

  template {
    # 起動時の設定（メモリ、CPU、ポート等）
    containers {
      # ※初回は、確実に起動するGoogle公式の「Hello World」仮イメージを使います。
      # この後、GitHub Actions から本番用のNext.jsアプリが上書きデプロイされます。
      image = "us-docker.pkg.dev/cloudrun/container/hello"

      ports {
        container_port = 3000 # Next.jsアプリが起動するポート (3000番)
      }

      # Gemini APIキーを環境変数としてアプリに注入します
      env {
        name  = "GEMINI_API_KEY"
        value = var.gemini_api_key
      }

      resources {
        limits = {
          cpu    = "1"     # 1CPU (個人開発や小規模アプリなら十分です)
          memory = "512Mi" # 512MBメモリ (足りない場合は 1Gi に変更可能)
        }
      }
    }
  }
}

# ------------------------------------------------------------------------------
# 4. アプリをインターネット全体に一般公開する設定
# ------------------------------------------------------------------------------
# Cloud Runで作ったURLに、誰でもブラウザからアクセスできるようにする許可設定です。

resource "google_cloud_run_v2_service_iam_member" "allow_public_access" {
  name     = google_cloud_run_v2_service.web_app.name
  location = google_cloud_run_v2_service.web_app.location
  role     = "roles/run.invoker" # 呼び出し専用ロール
  member   = "allUsers"          # すべてのユーザー（未認証アクセスを許可）
}

# ------------------------------------------------------------------------------
# 5. 安全な自動デプロイのための「Workload Identity (認証連携)」の設定
# ------------------------------------------------------------------------------
# パスワードやアクセスキーのファイルを保存することなく、GitHub Actions と
# Google Cloud を安全に連携させる（OIDC認証）ための極めてセキュアな仕組みです。

# A. 連携用プール（グループ）の作成
resource "google_iam_workload_identity_pool" "github_pool" {
  depends_on                = [google_project_service.enabled_apis]
  workload_identity_pool_id = "${var.app_name}-github-pool"
  display_name              = "GitHub Actions Pool"
  description               = "GitHub Actions から安全に接続するためのIDプール"
}

# B. GitHubとの連携ルール（プロバイダ）の設定
resource "google_iam_workload_identity_pool_provider" "github_provider" {
  workload_identity_pool_id          = google_iam_workload_identity_pool.github_pool.workload_identity_pool_id
  workload_identity_pool_provider_id = "github-actions-provider"
  display_name                       = "GitHub Actions Provider"
  
  # GitHub Actions用のOIDC設定
  attribute_mapping = {
    "google.subject"       = "assertion.sub"
    "attribute.actor"      = "assertion.actor"
    "attribute.repository" = "assertion.repository"
  }
  
  attribute_condition = "attribute.repository == '${var.github_repository}'"

  oidc {
    issuer_uri = "https://token.actions.githubusercontent.com"
  }
}

# C. 自動デプロイの作業者となる「サービスアカウント」を作る
resource "google_service_account" "github_actions_sa" {
  depends_on   = [google_project_service.enabled_apis]
  account_id   = "${var.app_name}-github-actions"
  display_name = "GitHub Actions Service Account"
  description  = "GitHub Actionsがデプロイ作業を行う際に借りる仮想的なユーザー"
}

# D. サービスアカウントに「指定したGitHubリポジトリからのみ」アクセスを許可する
resource "google_service_account_iam_member" "github_sa_binding" {
  service_account_id = google_service_account.github_actions_sa.name
  role               = "roles/iam.workloadIdentityUser"
  
  # 指定されたリポジトリからのアクセスのみ、このサービスアカウントの権限借用を許可します
  member = "principalSet://iam.googleapis.com/${google_iam_workload_identity_pool.github_pool.name}/attribute.repository/${var.github_repository}"
}

# ------------------------------------------------------------------------------
# 6. 自動デプロイ作業者に必要な「権限」を与える
# ------------------------------------------------------------------------------
# サービスアカウントが、倉庫へのアップロードやサーバーの更新を行えるようにします。

# ① コンテナ倉庫 (Artifact Registry) への「書き込み権限」
resource "google_project_iam_member" "registry_writer" {
  project = var.gcp_project_id
  role    = "roles/artifactregistry.writer"
  member  = "serviceAccount:${google_service_account.github_actions_sa.email}"
}

# ② サーバー (Cloud Run) への「管理者デプロイ権限」
resource "google_project_iam_member" "run_developer" {
  project = var.gcp_project_id
  role    = "roles/run.developer"
  member  = "serviceAccount:${google_service_account.github_actions_sa.email}"
}

# ③ サービスアカウント自体を「借用して動かす権限」（Cloud Run実行時に必要）
resource "google_project_iam_member" "sa_user" {
  project = var.gcp_project_id
  role    = "roles/iam.serviceAccountUser"
  member  = "serviceAccount:${google_service_account.github_actions_sa.email}"
}
