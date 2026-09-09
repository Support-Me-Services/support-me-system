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
  default     = ["api-gateway", "organization", "initialization", "auth", "web"]
}
