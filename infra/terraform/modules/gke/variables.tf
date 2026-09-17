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
