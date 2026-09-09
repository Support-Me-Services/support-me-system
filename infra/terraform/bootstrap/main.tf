// One-time bootstrap, applied BEFORE environments/prod exists.
//
// Creates the two things Terraform needs to exist before it can manage itself with a remote
// backend: the GCS bucket that will hold environments/prod's state, and the Artifact Registry
// repo CI pushes images to. Run this with LOCAL state (there's no bucket yet to store it in) -
// it is small and changes rarely, so the chicken-and-egg problem isn't worth solving with a
// second bootstrap-of-the-bootstrap.
//
// Usage:
//   cd infra/terraform/bootstrap
//   terraform init
//   terraform apply -var="project_id=<your-gcp-project-id>"
//
// After this succeeds, note the state bucket name from the output and put it in
// environments/prod/backend.tf, then proceed to environments/prod.

terraform {
  required_version = ">= 1.7.0"

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 6.0"
    }
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
}

resource "google_project_service" "required" {
  for_each = toset([
    "cloudresourcemanager.googleapis.com",
    "artifactregistry.googleapis.com",
    "storage.googleapis.com",
  ])
  service            = each.value
  disable_on_destroy = false
}

// Terraform state for infra/terraform/environments/prod.
resource "google_storage_bucket" "tf_state" {
  name     = "${var.project_id}-tfstate"
  location = var.region
  project  = var.project_id

  uniform_bucket_level_access = true
  force_destroy               = false

  versioning {
    enabled = true
  }

  # State files can carry secrets in plaintext (e.g. a resource's generated password before it
  # moves to Secret Manager) - never let this bucket become a public bucket by accident.
  public_access_prevention = "enforced"

  depends_on = [google_project_service.required]
}

// Shared Docker repo for all four app images (api-gateway, organization, initialization, the
// Next.js web frontend). One repo keeps CI/IAM simple; images are namespaced by name:tag anyway.
resource "google_artifact_registry_repository" "images" {
  project       = var.project_id
  location      = var.region
  repository_id = "support-me-system"
  format        = "DOCKER"
  description   = "Container images for support-me-system (api-gateway, organization, initialization, web)"

  depends_on = [google_project_service.required]
}

data "google_project" "current" {
  project_id = var.project_id
}

// GKE nodes (Autopilot or Standard) pull images as the project's default Compute Engine service
// account, not as whatever identity applied this Terraform - without this grant, pulls fail
// with 403 (confirmed by a real failure: every pod stuck in ImagePullBackOff after the first
// real deploy). Granted at the repository level, not project-wide, to keep it scoped to exactly
// the images GKE needs.
resource "google_artifact_registry_repository_iam_member" "gke_node_pull" {
  project    = var.project_id
  location   = google_artifact_registry_repository.images.location
  repository = google_artifact_registry_repository.images.repository_id
  role       = "roles/artifactregistry.reader"
  member     = "serviceAccount:${data.google_project.current.number}-compute@developer.gserviceaccount.com"
}
