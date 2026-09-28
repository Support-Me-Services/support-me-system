variable "project_id" {
  description = "GCP project ID (same one used for infra/terraform/bootstrap)."
  type        = string
}

variable "region" {
  type    = string
  default = "europe-central2" # Warsaw
}

variable "name_prefix" {
  type    = string
  default = "support-me-prod"
}

variable "hibernate" {
  description = <<-EOT
    Cost-saving shutdown of the whole environment: true destroys the GKE cluster and STOPS (not
    deletes) the shared Cloud SQL instance, also dropping it to ZONAL. All DB data, backups,
    secrets, the workload GSA, the static ingress IP and Artifact Registry images are kept.

    Default is true so an unattended CI `terraform apply` can't silently bring everything back.
    To wake up: set this to false, `terraform apply`, then redeploy (push a vX.Y.Z tag) - the
    deploy workflow needs the cluster to exist, so a tag pushed while hibernated fails at the
    get-gke-credentials step.
  EOT
  type        = bool
  default     = true
}

variable "gke_deletion_protection" {
  description = "See modules/gke's deletion_protection. Applied as false (together with hibernate = false) in its own step before hibernating, since the provider checks the value in state."
  type        = bool
  default     = true
}

variable "domains" {
  description = <<-EOT
    Every domain the WEB app is served on (each must resolve to the ingress IP output).

    Currently just please-support-me.pl - please-support-me.com is intentionally not launched
    yet (team decision: land on .pl first, cut over to .com later). To add .com back, list it
    here too and add it to `k8s/base/ingress.yaml`'s rules and `managed-certificate.yaml`'s
    domains. To cut over fully to .com later, swap the value here (and primary_domain below)
    instead of running both indefinitely.
  EOT
  type        = list(string)
  default     = ["please-support-me.pl"]
}

variable "primary_domain" {
  description = "The single canonical domain api-gateway (api.<domain>) and Keycloak (auth.<domain>) are served from. Must be one of `domains`. Kept singular deliberately - see infra/k8s/base/api-gateway/deployment.yaml for why auth/api don't get a per-domain issuer."
  type        = string
  default     = "please-support-me.pl"
}
