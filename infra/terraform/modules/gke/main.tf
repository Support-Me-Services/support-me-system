// GKE Autopilot cluster. Autopilot chosen over Standard node pools so Google manages node
// provisioning/sizing/patching - the team doesn't (yet) need control over machine types or
// per-node tuning, and it bills per-pod-resource rather than per-node.

resource "google_container_cluster" "prod" {
  name     = "${var.name_prefix}-cluster"
  project  = var.project_id
  location = var.region # regional (not zonal) cluster for control-plane HA.

  enable_autopilot = true

  network    = var.network_self_link
  subnetwork = var.subnet_id

  ip_allocation_policy {
    cluster_secondary_range_name  = var.pods_range_name
    services_secondary_range_name = var.services_range_name
  }

  # Google Cloud's Secret Manager add-on for GKE: lets pods mount Secret Manager secrets
  # directly via a CSI volume (see k8s/base/*/secretproviderclass.yaml) with no privileged
  # DaemonSet to install - required because Autopilot blocks arbitrary privileged workloads,
  # which rules out the self-managed secrets-store-csi-driver. Verify this block's exact syntax
  # against the current `google_container_cluster` docs before first apply - it's a newer GKE
  # feature and the provider's field name may have shifted since this was written.
  secret_manager_config {
    enabled = true
  }

  workload_identity_config {
    workload_pool = "${var.project_id}.svc.id.goog"
  }

  # Autopilot manages release channel; pin to REGULAR for a predictable, tested cadence rather
  # than RAPID (bleeding edge) or STABLE (slower security patches).
  release_channel {
    channel = "REGULAR"
  }

  deletion_protection = true

  maintenance_policy {
    daily_maintenance_window {
      start_time = "02:00" # off-peak for the target userbase (Europe/Warsaw).
    }
  }
}

// Workload Identity binding: lets Kubernetes ServiceAccounts impersonate this GCP service
// account so pods can call Secret Manager / GCS without a downloaded key file. One shared SA
// for all four app workloads is enough for now (they don't need different permissions) - if a
// service later needs its own least-privilege scope, split it into a per-service SA then.
resource "google_service_account" "workload" {
  project      = var.project_id
  account_id   = "${var.name_prefix}-workload"
  display_name = "support-me-system workloads (GKE Workload Identity)"
}

resource "google_service_account_iam_member" "workload_identity_binding" {
  for_each = toset(var.k8s_service_accounts)

  service_account_id = google_service_account.workload.name
  role                = "roles/iam.workloadIdentityUser"
  member              = "serviceAccount:${var.project_id}.svc.id.goog[${var.k8s_namespace}/${each.value}]"

  # The `[PROJECT_ID].svc.id.goog` identity pool this member string references is created by the
  # cluster's workload_identity_config, not by this resource itself and not implied by the
  # member string alone (it's just a string to this resource, not a reference Terraform tracks)
  # - without this, Terraform has no reason to wait for the cluster to finish before binding,
  # and the pool may not exist yet ("Identity Pool does not exist" if it fires too early).
  depends_on = [google_container_cluster.prod]
}
