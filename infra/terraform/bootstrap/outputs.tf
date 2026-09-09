output "tf_state_bucket" {
  description = "Name of the GCS bucket holding environments/prod's Terraform state. Put this in environments/prod/backend.tf."
  value       = google_storage_bucket.tf_state.name
}

output "artifact_registry_repository" {
  description = "Full path of the Artifact Registry Docker repo (for `docker push`/CI)."
  value       = "${var.region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.images.repository_id}"
}
