output "network_id" {
  value = google_compute_network.vpc.id
}

output "network_self_link" {
  value = google_compute_network.vpc.self_link
}

output "subnet_id" {
  value = google_compute_subnetwork.gke.id
}

output "subnet_name" {
  value = google_compute_subnetwork.gke.name
}

output "pods_range_name" {
  value = "pods"
}

output "services_range_name" {
  value = "services"
}

output "private_vpc_connection" {
  description = "Forces callers (e.g. cloudsql module) to depend on the peering being established before creating an instance on private IP."
  value       = google_service_networking_connection.private_vpc_connection.id
}
