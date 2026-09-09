output "tf_state_bucket" {
  description = "Name of the GCS bucket holding environments/prod's Terraform state. Put this in environments/prod/backend.tf."
  value       = google_storage_bucket.tf_state.name
}

output "artifact_registry_repository" {
  description = "Full path of the Artifact Registry Docker repo (for `docker push`/CI)."
  value       = "${var.region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.images.repository_id}"
}

output "github_actions_workload_identity_provider" {
  description = "Full resource name for the `workload_identity_provider` input of google-github-actions/auth in .github/workflows/deploy-prod.yml."
  value       = google_iam_workload_identity_pool_provider.github.name
}

output "github_actions_deployer_email" {
  description = "Service account email for the `service_account` input of google-github-actions/auth in .github/workflows/deploy-prod.yml."
  value       = google_service_account.github_actions_deployer.email
}
