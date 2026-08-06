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
  type = list(string)
  default = [
    "run.googleapis.com",              # Cloud Run (サーバー実行環境)
    "artifactregistry.googleapis.com", # Artifact Registry (コンテナ倉庫)
    "iam.googleapis.com",              # IAM (ユーザー・権限管理)
    "sts.googleapis.com",              # Security Token Service (GitHubとの認証用)
    "iamcredentials.googleapis.com",   # OIDC認証のトークン生成用
    "secretmanager.googleapis.com",    # Secret Manager (APIキーの安全な管理)
    "sqladmin.googleapis.com",         # Cloud SQL (PostgreSQL)
    "cloudscheduler.googleapis.com"    # Cloud Scheduler (ゲスト自動削除の定期実行)
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
# 2. APIキーを安全に保管する Secret Manager の設定
# ------------------------------------------------------------------------------
# plaintext の環境変数ではなく、Google の鍵管理サービスに保存します。

resource "google_secret_manager_secret" "gemini_api_key" {
  depends_on = [google_project_service.enabled_apis]
  secret_id  = "${var.app_name}-gemini-api-key"

  replication {
    auto {}
  }
}

resource "google_secret_manager_secret_version" "gemini_api_key" {
  secret      = google_secret_manager_secret.gemini_api_key.id
  secret_data = var.gemini_api_key
}

resource "google_sql_database_instance" "postgres" {
  depends_on          = [google_project_service.enabled_apis]
  name                = "${var.app_name}-postgres"
  region              = var.gcp_region
  database_version    = "POSTGRES_16"
  deletion_protection = var.database_deletion_protection

  settings {
    tier              = var.database_tier
    availability_type = "ZONAL"
    disk_type         = "PD_SSD"
    disk_size         = 10

    backup_configuration {
      enabled                        = true
      point_in_time_recovery_enabled = true
    }

    ip_configuration {
      ipv4_enabled = true
    }
  }
}

resource "google_sql_database" "app_db" {
  name     = var.database_name
  instance = google_sql_database_instance.postgres.name
}

resource "google_sql_user" "app_user" {
  name     = var.database_user
  instance = google_sql_database_instance.postgres.name
  password = var.database_password
}

resource "google_secret_manager_secret" "database_password" {
  depends_on = [google_project_service.enabled_apis]
  secret_id  = "${var.app_name}-database-password"

  replication {
    auto {}
  }
}

resource "google_secret_manager_secret_version" "database_password" {
  secret      = google_secret_manager_secret.database_password.id
  secret_data = var.database_password
}

resource "google_secret_manager_secret" "database_url" {
  depends_on = [google_project_service.enabled_apis]
  secret_id  = "${var.app_name}-database-url"

  replication {
    auto {}
  }
}

resource "google_secret_manager_secret_version" "database_url" {
  secret      = google_secret_manager_secret.database_url.id
  secret_data = "postgresql://${var.database_user}:${urlencode(var.database_password)}@localhost/${var.database_name}?host=/cloudsql/${google_sql_database_instance.postgres.connection_name}"
}

locals {
  # 名前は歴史的経緯で "auth_secrets" のままだが、認証系以外（cron_secret）も
  # 同じ仕組み（Secret Manager + Cloud Run env注入）に相乗りさせている。
  # リソースアドレス（google_secret_manager_secret.auth 等）を変更すると
  # 既存デプロイ済み環境でリソースの再作成が発生してしまうため、あえて維持している。
  auth_secrets = {
    auth_secret = {
      env_name   = "AUTH_SECRET"
      secret_id  = "${var.app_name}-auth-secret"
      secret_val = var.auth_secret
    }
    auth_google_id = {
      env_name   = "AUTH_GOOGLE_ID"
      secret_id  = "${var.app_name}-auth-google-id"
      secret_val = var.auth_google_id
    }
    auth_google_secret = {
      env_name   = "AUTH_GOOGLE_SECRET"
      secret_id  = "${var.app_name}-auth-google-secret"
      secret_val = var.auth_google_secret
    }
    auth_resend_key = {
      env_name   = "AUTH_RESEND_KEY"
      secret_id  = "${var.app_name}-auth-resend-key"
      secret_val = var.auth_resend_key
    }
    auth_email_from = {
      env_name   = "AUTH_EMAIL_FROM"
      secret_id  = "${var.app_name}-auth-email-from"
      secret_val = var.auth_email_from
    }
    cron_secret = {
      env_name   = "CRON_SECRET"
      secret_id  = "${var.app_name}-cron-secret"
      secret_val = var.cron_secret
    }
  }
}

resource "google_secret_manager_secret" "auth" {
  for_each   = local.auth_secrets
  depends_on = [google_project_service.enabled_apis]
  secret_id  = each.value.secret_id

  replication {
    auto {}
  }
}

resource "google_secret_manager_secret_version" "auth" {
  for_each    = local.auth_secrets
  secret      = google_secret_manager_secret.auth[each.key].id
  secret_data = each.value.secret_val
}

# Cloud Run の実行時に使うサービスアカウント（デプロイ用の github_actions_sa とは別）
resource "google_service_account" "cloud_run_sa" {
  depends_on   = [google_project_service.enabled_apis]
  account_id   = "${var.app_name}-run"
  display_name = "Cloud Run Runtime Service Account"
  description  = "Cloud Run がアプリを実行する際に使用するサービスアカウント"
}

# Cloud Run SA に Secret へのアクセス権を付与
resource "google_secret_manager_secret_iam_member" "cloud_run_secret_access" {
  secret_id = google_secret_manager_secret.gemini_api_key.id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.cloud_run_sa.email}"
}

resource "google_secret_manager_secret_iam_member" "cloud_run_database_url_access" {
  secret_id = google_secret_manager_secret.database_url.id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.cloud_run_sa.email}"
}

resource "google_secret_manager_secret_iam_member" "cloud_run_auth_secret_access" {
  for_each  = google_secret_manager_secret.auth
  secret_id = each.value.id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.cloud_run_sa.email}"
}

resource "google_project_iam_member" "cloud_run_sql_client" {
  project = var.gcp_project_id
  role    = "roles/cloudsql.client"
  member  = "serviceAccount:${google_service_account.cloud_run_sa.email}"
}

# ------------------------------------------------------------------------------
# 3. コンテナ倉庫 (Artifact Registry) を作る
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
    service_account = google_service_account.cloud_run_sa.email

    volumes {
      name = "cloudsql"

      cloud_sql_instance {
        instances = [google_sql_database_instance.postgres.connection_name]
      }
    }

    containers {
      # ※初回は、確実に起動するGoogle公式の「Hello World」仮イメージを使います。
      # この後、GitHub Actions から本番用のNext.jsアプリが上書きデプロイされます。
      image = "us-docker.pkg.dev/cloudrun/container/hello"

      ports {
        container_port = 3000
      }

      # Gemini APIキーを Secret Manager から安全に注入します（平文では持ちません）
      env {
        name = "GEMINI_API_KEY"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.gemini_api_key.secret_id
            version = "latest"
          }
        }
      }

      env {
        name = "DATABASE_URL"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.database_url.secret_id
            version = "latest"
          }
        }
      }

      dynamic "env" {
        for_each = local.auth_secrets

        content {
          name = env.value.env_name
          value_source {
            secret_key_ref {
              secret  = google_secret_manager_secret.auth[env.key].secret_id
              version = "latest"
            }
          }
        }
      }

      volume_mounts {
        name       = "cloudsql"
        mount_path = "/cloudsql"
      }

      resources {
        limits = {
          cpu    = "1"
          memory = "512Mi"
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
# 4.5. 期限切れゲストの自動削除を定期実行する（Cloud Scheduler）
# ------------------------------------------------------------------------------
# /api/admin/cleanup-guests をCRON_SECRETのBearerトークン付きで毎日呼び出します。
# このジョブが無いと、CRON_SECRETをCloud Runに配線しても実際には誰も叩かないため
# ゲストユーザーが溜まり続けてしまいます。

resource "google_cloud_scheduler_job" "cleanup_guests" {
  depends_on = [google_project_service.enabled_apis]
  name       = "${var.app_name}-cleanup-guests"
  region     = var.gcp_region
  schedule   = "0 19 * * *" # UTC 19:00 = JST 4:00（アクセスが少ない時間帯）
  time_zone  = "Etc/UTC"

  http_target {
    uri         = "${google_cloud_run_v2_service.web_app.uri}/api/admin/cleanup-guests"
    http_method = "POST"
    headers = {
      Authorization = "Bearer ${var.cron_secret}"
    }
  }
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
