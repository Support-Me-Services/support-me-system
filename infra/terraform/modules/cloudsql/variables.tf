variable "project_id" {
  type = string
}

variable "region" {
  type = string
}

variable "name_prefix" {
  type = string
}

variable "service_name" {
  description = "Short service identifier, e.g. \"organization\", \"initialization\", \"auth\". Used in the instance name and Secret Manager secret ID."
  type        = string
}

variable "database_name" {
  type = string
}

variable "database_user" {
  type = string
}

variable "network_id" {
  description = "Self-link of the VPC to attach this instance's private IP to (network module's network_id)."
  type        = string
}

variable "private_vpc_connection" {
  description = "network module's private_vpc_connection output - ensures the service-networking peering exists before this instance is created."
  type        = string
}

variable "workload_service_account_email" {
  description = "GSA (from the gke module) that GKE pods use via Workload Identity - granted read access to this DB's password secret."
  type        = string
}

variable "tier" {
  description = "Machine tier. Default is the smallest general-purpose tier suitable for a low-traffic production launch; resize once real load is observed."
  type        = string
  default     = "db-custom-1-3840" # 1 vCPU / 3.75GB - bump per-service once you have traffic data.
}

variable "availability_type" {
  description = "ZONAL (cheaper, single zone) or REGIONAL (synchronous standby in a second zone, higher cost). auth_db (now shared by all 3 services) already runs REGIONAL - see environments/prod/main.tf."
  type        = string
  default     = "ZONAL"
}

variable "disk_size_gb" {
  type    = number
  default = 20
}
