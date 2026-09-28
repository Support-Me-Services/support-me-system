variable "project_id" {
  type = string
}

variable "region" {
  type = string
}

variable "name_prefix" {
  type = string
}

variable "network_self_link" {
  type = string
}

variable "subnet_id" {
  type = string
}

variable "pods_range_name" {
  type = string
}

variable "services_range_name" {
  type = string
}

variable "enabled" {
  description = "false destroys the cluster (cost-saving hibernation) while keeping the workload GSA and its Workload Identity bindings, so re-enabling only needs this flipped back plus a normal deploy."
  type        = bool
  default     = true
}

variable "deletion_protection" {
  description = <<-EOT
    Terraform-provider-side guard on the cluster's destroy. Like modules/cloudsql's variable of the
    same name, the provider checks the value already in STATE, not config - so it must be applied
    as false in its own step before a later apply with enabled = false can remove the cluster.
  EOT
  type        = bool
  default     = true
}

variable "k8s_namespace" {
  description = "Kubernetes namespace the app workloads run in - must match k8s/base/namespace.yaml."
  type        = string
  default     = "support-me"
}

variable "k8s_service_accounts" {
  description = "KSA names allowed to impersonate the shared workload GSA via Workload Identity."
  type        = list(string)
  # "db-init" (infra/k8s/base/db-init/job.yaml) needs this too - its KSA has the
  # iam.gke.io/gcp-service-account annotation like every other app KSA, but that annotation alone
  # doesn't grant anything; without a matching entry here (and the resulting
  # google_service_account_iam_member below), the CSI secrets-store mount fails at pod startup
  # with "Permission iam.serviceAccounts.getAccessToken denied" - confirmed by a real failure.
  default = ["api-gateway", "organization", "initialization", "auth", "web", "db-init"]
}
