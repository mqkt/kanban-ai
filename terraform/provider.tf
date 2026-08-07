# ==============================================================================
# 1. プロバイダー設定 (provider.tf)
# ==============================================================================
# このファイルは、「Google Cloud (GCP) を操作します」という宣言と、
# 使用するツールのバージョン、接続先（プロジェクトや地域）を設定する場所です。
# ------------------------------------------------------------------------------

terraform {
  # 使用する外部ツール（プロバイダー）のバージョンを指定します。
  # バージョンを固定することで、将来的なTerraformのアップデートによる予期せぬエラーを防ぎます。
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0" # 5.x 系の最新バージョンを使用します
    }
  }

  # 動作に必要な最低限のTerraform本体のバージョンを指定します
  required_version = ">= 1.5.0"

  # tfstateをローカルではなくGCSバケットで管理する（リモートバックエンド）。
  # ローカルstateだけだと、PCの紛失・複数人での作業・CI/CDからのapplyで
  # state不整合や損失のリスクがあるため、バージョニング有効なバケットに保存する。
  backend "gcs" {
    bucket = "my-app-portfolio-504711-tfstate"
    prefix = "terraform/state"
  }
}

# Google Cloudプロバイダーの基本設定
# project や region は「variables.tf」という別のファイルで定義した変数から読み込みます。
provider "google" {
  project = var.gcp_project_id
  region  = var.gcp_region
}
