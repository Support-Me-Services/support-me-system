// User-uploaded files: a primary bucket the app writes to, a separate backup bucket in another
// region, and a daily Storage Transfer job copying primary -> backup. Object versioning on the
// primary bucket also protects against accidental overwrite/delete between transfer runs.
//
// On-demand backup before a risky deploy: run
//   gcloud transfer jobs run <job-id> --project=<project>
// (see scripts/backup-on-demand.sh) - reuses this same job instead of a separate mechanism.

resource "google_storage_bucket" "uploads" {
  project  = var.project_id
  name     = "${var.name_prefix}-uploads"
  location = var.region

  uniform_bucket_level_access = true
  public_access_prevention    = "enforced"

  versioning {
    enabled = true
  }

  lifecycle_rule {
    condition {
      num_newer_versions = 5
    }
    action {
      type = "Delete" # cap noncurrent version growth; the backup bucket is the real safety net.
    }
  }
}

resource "google_storage_bucket" "uploads_backup" {
  project  = var.project_id
  name     = "${var.name_prefix}-uploads-backup"
  location = var.backup_region

  uniform_bucket_level_access = true
  public_access_prevention    = "enforced"

  versioning {
    enabled = true
  }

  lifecycle_rule {
    condition {
      age = var.backup_retention_days
    }
    action {
      type = "Delete"
    }
  }
}

// Storage Transfer Service needs its own (Google-managed) service account granted access to
// both buckets before a transfer job can run. This resource provisions that service agent, but
// - at least for storagetransfer.googleapis.com - the provider doesn't populate its `email`
// output (comes back null even after the identity is confirmed to exist), so the IAM bindings
// below use Storage Transfer's documented, deterministic service agent email
// (project-<PROJECT_NUMBER>@storage-transfer-service.iam.gserviceaccount.com) instead of reading
// it from this resource - depends_on still ensures the identity is provisioned first.
resource "google_project_service_identity" "storage_transfer" {
  provider = google-beta
  project  = var.project_id
  service  = "storagetransfer.googleapis.com"
}

locals {
  storage_transfer_sa = "serviceAccount:project-${var.project_number}@storage-transfer-service.iam.gserviceaccount.com"
}

resource "google_storage_bucket_iam_member" "transfer_reads_uploads" {
  bucket = google_storage_bucket.uploads.name
  role   = "roles/storage.objectViewer"
  member = local.storage_transfer_sa

  depends_on = [google_project_service_identity.storage_transfer]
}

resource "google_storage_bucket_iam_member" "transfer_writes_backup" {
  bucket = google_storage_bucket.uploads_backup.name
  role   = "roles/storage.objectAdmin"
  member = local.storage_transfer_sa

  depends_on = [google_project_service_identity.storage_transfer]
}

// objectViewer/objectAdmin above are object-level only - the transfer job also calls
// storage.buckets.get on BOTH buckets (to resolve their location before copying), which needs a
// bucket-level read role too (confirmed by a real failure: "does not have storage.buckets.get
// access").
resource "google_storage_bucket_iam_member" "transfer_reads_uploads_bucket_meta" {
  bucket = google_storage_bucket.uploads.name
  role   = "roles/storage.legacyBucketReader"
  member = local.storage_transfer_sa

  depends_on = [google_project_service_identity.storage_transfer]
}

resource "google_storage_bucket_iam_member" "transfer_writes_backup_bucket_meta" {
  bucket = google_storage_bucket.uploads_backup.name
  role   = "roles/storage.legacyBucketReader"
  member = local.storage_transfer_sa

  depends_on = [google_project_service_identity.storage_transfer]
}

resource "google_storage_transfer_job" "daily_backup" {
  project     = var.project_id
  description = "Daily backup of ${google_storage_bucket.uploads.name} to ${google_storage_bucket.uploads_backup.name}"

  transfer_spec {
    gcs_data_source {
      bucket_name = google_storage_bucket.uploads.name
    }
    gcs_data_sink {
      bucket_name = google_storage_bucket.uploads_backup.name
    }
    transfer_options {
      overwrite_objects_already_existing_in_sink = true
      delete_objects_unique_in_sink               = false # never delete from backup just because it left the primary.
    }
  }

  schedule {
    schedule_start_date {
      year  = 2026
      month = 1
      day   = 1
    }
    start_time_of_day {
      hours   = 3
      minutes = 0
      seconds = 0
      nanos   = 0
    }
  }

  depends_on = [
    google_storage_bucket_iam_member.transfer_reads_uploads,
    google_storage_bucket_iam_member.transfer_writes_backup,
  ]
}

resource "google_storage_bucket_iam_member" "workload_uploads_access" {
  bucket = google_storage_bucket.uploads.name
  role   = "roles/storage.objectAdmin"
  member = "serviceAccount:${var.workload_service_account_email}"
}
