output "cluster_name" {
  value = module.gke.cluster_name
}

output "project_number" {
  description = "Consumed by infra/scripts/render-k8s-manifests.sh as GCP_PROJECT_NUMBER - Secret Manager's CSI provider addresses secrets by project NUMBER, not project ID."
  value       = data.google_project.current.number
}

output "ingress_ip_address" {
  description = "Point every domain's DNS A record (please-support-me.com, please-support-me.pl, and their api./auth. subdomains) at this IP."
  value       = module.edge.ingress_ip_address
}

output "ingress_ip_name" {
  value = module.edge.ingress_ip_name
}

output "all_hostnames" {
  value = local.all_hosts
}

output "organization_db_connection_name" {
  value = module.organization_db.connection_name
}

output "initialization_db_connection_name" {
  value = module.initialization_db.connection_name
}

output "auth_db_connection_name" {
  value = module.auth_db.connection_name
}

# Private IPs, consumed by infra/scripts/render-k8s-manifests.sh to fill in
# ${ORGANIZATION_DB_HOST} / ${INITIALIZATION_DB_HOST} / ${AUTH_DB_HOST} in the Deployment specs.
output "organization_db_private_ip" {
  value = module.organization_db.private_ip_address
}

output "initialization_db_private_ip" {
  value = module.initialization_db.private_ip_address
}

output "auth_db_private_ip" {
  value = module.auth_db.private_ip_address
}

# Instance names, consumed by infra/scripts/backup-on-demand.sh (`gcloud sql backups create`).
output "organization_db_instance_name" {
  value = module.organization_db.instance_name
}

output "initialization_db_instance_name" {
  value = module.initialization_db.instance_name
}

output "auth_db_instance_name" {
  value = module.auth_db.instance_name
}

output "transfer_job_name" {
  value = module.storage.transfer_job_name
}

output "uploads_bucket" {
  value = module.storage.uploads_bucket
}

output "uploads_backup_bucket" {
  value = module.storage.uploads_backup_bucket
}

output "workload_service_account_email" {
  value = module.gke.workload_service_account_email
}
