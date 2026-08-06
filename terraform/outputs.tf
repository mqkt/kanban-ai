# ==============================================================================
# 4. 出力値定義ファイル (outputs.tf)
# ==============================================================================
# このファイルは、インフラの構築（terraform apply）が無事に終わったあとに、
# 「作成されたサーバーのURL」や「GitHubの設定でコピペする必要がある文字列」を
# 画面にわかりやすく表示（出力）するための設定ファイルです。
# ------------------------------------------------------------------------------

output "cloud_run_url" {
  value       = google_cloud_run_v2_service.web_app.uri
  description = "公開されたNext.jsアプリのURL（ホームページのアドレス）です！"
}

output "artifact_registry_repository" {
  value       = "${google_artifact_registry_repository.app_repo.location}-docker.pkg.dev/${var.gcp_project_id}/${google_artifact_registry_repository.app_repo.repository_id}"
  description = "作成されたコンテナ倉庫（Artifact Registry）のフルパスです。"
}

output "workload_identity_provider" {
  value       = google_iam_workload_identity_pool_provider.github_provider.name
  description = "GitHub Actionsの設定で使用する、『Workload Identity プロバイダ』のIDです。"
}

output "service_account_email" {
  value       = google_service_account.github_actions_sa.email
  description = "GitHub Actionsの設定で使用する、『サービスアカウント』のメールアドレスです。"
}

output "cloud_sql_connection_name" {
  value       = google_sql_database_instance.postgres.connection_name
  description = "Cloud RunやPrisma migrateからCloud SQLへ接続するときに使う接続名です。"
}

output "cleanup_guests_scheduler_job" {
  value       = google_cloud_scheduler_job.cleanup_guests.name
  description = "期限切れゲスト自動削除を定期実行するCloud SchedulerジョブのIDです（`gcloud scheduler jobs describe <この値>` で状態確認できます）。"
}
