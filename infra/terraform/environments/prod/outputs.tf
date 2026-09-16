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

# organization_db/initialization_db are PHASE 1 of the consolidation still alive (see main.tf's
# consolidation note) - kept here so backup-on-demand.sh can still back them up and Phase 2 can
# still look up their instance name to double-check deletion_protection before removing them.
output "organization_db_connection_name" {
  value = module.organization_db.connection_name
}

output "initialization_db_connection_name" {
  value = module.initialization_db.connection_name
}

output "auth_db_connection_name" {
  value = module.auth_db.connection_name
}

output "organization_db_instance_name" {
  value = module.organization_db.instance_name
}

output "initialization_db_instance_name" {
  value = module.initialization_db.instance_name
}

# Instance name, consumed by infra/scripts/backup-on-demand.sh (`gcloud sql backups create`).
output "auth_db_instance_name" {
  value = module.auth_db.instance_name
}

# Private IP, consumed by infra/scripts/render-k8s-manifests.sh to fill in ${SHARED_DB_HOST}
# (organization/initialization) and ${AUTH_DB_HOST} (auth) in the Deployment specs - same value,
# two names, since organization/initialization/auth all connect to the same instance once rolled
# out (organization_db/initialization_db above are the old, not-yet-decommissioned instances -
# organization/initialization no longer read from them after this rollout).
output "shared_db_private_ip" {
  value = module.auth_db.private_ip_address
}

output "auth_db_private_ip" {
  value = module.auth_db.private_ip_address
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
