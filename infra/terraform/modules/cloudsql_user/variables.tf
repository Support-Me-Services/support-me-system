variable "project_id" {
  type = string
}

variable "name_prefix" {
  type = string
}

variable "service_name" {
  description = "Short service identifier, e.g. \"organization\", \"initialization\". Used in the Secret Manager secret ID."
  type        = string
}

variable "instance_name" {
  description = "Name of the EXISTING Cloud SQL instance (e.g. module.auth_db.instance_name) to create this role on."
  type        = string
}

variable "database_user" {
  type = string
}

variable "workload_service_account_email" {
  description = "GSA (from the gke module) that GKE pods use via Workload Identity - granted read access to this role's password secret."
  type        = string
}
