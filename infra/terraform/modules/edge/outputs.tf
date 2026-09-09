output "ingress_ip_name" {
  description = "Name to reference in the Ingress annotation (kubernetes.io/ingress.global-static-ip-name)."
  value       = google_compute_global_address.ingress_ip.name
}

output "ingress_ip_address" {
  description = "The reserved IP - point every domain's DNS A record here."
  value       = google_compute_global_address.ingress_ip.address
}
