variable "project_id" {
  description = "GCP project ID that will host support-me-system's production infrastructure."
  type        = string
}

variable "region" {
  description = "Primary GCP region for the state bucket and Artifact Registry."
  type        = string
  default     = "europe-central2" # Warsaw - closest GCP region to the team/users.
}
