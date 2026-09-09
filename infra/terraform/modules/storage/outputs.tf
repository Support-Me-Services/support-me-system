output "uploads_bucket" {
  value = google_storage_bucket.uploads.name
}

output "uploads_backup_bucket" {
  value = google_storage_bucket.uploads_backup.name
}

output "transfer_job_name" {
  description = "Pass the trailing id (after 'transferJobs/') to `gcloud transfer jobs run` for an on-demand backup."
  value       = google_storage_transfer_job.daily_backup.name
}
