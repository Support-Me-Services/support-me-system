# null while the cluster is disabled (var.enabled = false).
output "cluster_name" {
  value = one(google_container_cluster.prod[*].name)
}

output "cluster_endpoint" {
  value     = one(google_container_cluster.prod[*].endpoint)
  sensitive = true
}

output "cluster_ca_certificate" {
  value     = one(google_container_cluster.prod[*].master_auth[0].cluster_ca_certificate)
  sensitive = true
}

output "workload_service_account_email" {
  value = google_service_account.workload.email
}
