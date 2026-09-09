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
    "iam.googleapis.com",
    "iamcredentials.googleapis.com",
    "sts.googleapis.com",
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

// Workload Identity Federation for GitHub Actions: lets the deploy-prod.yml workflow
// impersonate a GCP service account using its own GitHub-issued OIDC token, with no long-lived
// JSON key ever stored as a GitHub secret. The `attribute.repository` condition below is what
// actually restricts this to var.github_repository - without it, ANY GitHub Actions workflow in
// ANY repo could exchange its OIDC token for access to this project.
resource "google_iam_workload_identity_pool" "github" {
  project                   = var.project_id
  workload_identity_pool_id = "github-actions"
  display_name              = "GitHub Actions"

  depends_on = [google_project_service.required]
}

resource "google_iam_workload_identity_pool_provider" "github" {
  project                            = var.project_id
  workload_identity_pool_id          = google_iam_workload_identity_pool.github.workload_identity_pool_id
  workload_identity_pool_provider_id = "github"
  display_name                       = "GitHub"

  attribute_mapping = {
    "google.subject"       = "assertion.sub"
    "attribute.repository" = "assertion.repository"
    "attribute.ref"        = "assertion.ref"
  }
  attribute_condition = "assertion.repository == \"${var.github_repository}\""

  oidc {
    issuer_uri = "https://token.actions.githubusercontent.com"
  }
}

// The identity CI actually runs as. Kept separate from the founder/human accounts used
// throughout this session - narrower blast radius if a workflow run or its logs ever leak
// something, and it shows up distinctly in Cloud Audit Logs.
resource "google_service_account" "github_actions_deployer" {
  project      = var.project_id
  account_id   = "github-actions-deployer"
  display_name = "GitHub Actions (support-me-system deploy-prod)"
}

resource "google_service_account_iam_member" "github_actions_wif_binding" {
  service_account_id = google_service_account.github_actions_deployer.name
  role                = "roles/iam.workloadIdentityUser"
  member              = "principalSet://iam.googleapis.com/${google_iam_workload_identity_pool.github.name}/attribute.repository/${var.github_repository}"
}

// Broad for now (Editor + the IAM-admin role Editor deliberately excludes, since
// environments/prod's Terraform creates IAM bindings on secrets/service accounts/the Artifact
// Registry repo) - Terraform here manages nearly every resource type in the project (network,
// GKE, Cloud SQL, storage, secrets, their IAM policies). Tightening this to per-service custom
// roles is real follow-up work, not done here for the sake of shipping a working pipeline first.
resource "google_project_iam_member" "github_actions_deployer_roles" {
  for_each = toset([
    "roles/editor",
    "roles/resourcemanager.projectIamAdmin",
  ])
  project = var.project_id
  role    = each.value
  member  = "serviceAccount:${google_service_account.github_actions_deployer.email}"
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
