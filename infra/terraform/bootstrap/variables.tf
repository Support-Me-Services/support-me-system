variable "project_id" {
  description = "GCP project ID that will host support-me-system's production infrastructure."
  type        = string
}

variable "region" {
  description = "Primary GCP region for the state bucket and Artifact Registry."
  type        = string
  default     = "europe-central2" # Warsaw - closest GCP region to the team/users.
}

variable "github_repository" {
  description = "GitHub \"owner/repo\" allowed to impersonate the CI/CD deployer service account via Workload Identity Federation. Keep this scoped to the exact repo - it's the only thing stopping any other GitHub Actions workflow anywhere from deploying to this project."
  type        = string
  default     = "Support-Me-Services/support-me-system"
}
