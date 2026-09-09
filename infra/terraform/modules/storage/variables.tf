variable "project_id" {
  type = string
}

variable "project_number" {
  description = "Numeric project ID (data.google_project.current.number in environments/prod) - used to construct Storage Transfer Service's deterministic service agent email."
  type        = string
}

variable "region" {
  type = string
}

variable "backup_region" {
  description = "Region for the backup bucket - deliberately different from `region` so a regional GCS outage doesn't take out both copies."
  type        = string
  default     = "europe-west1" # Belgium - nearest distinct GCS region to europe-central2.
}

variable "name_prefix" {
  type = string
}

variable "backup_retention_days" {
  type    = number
  default = 90
}

variable "workload_service_account_email" {
  type = string
}
