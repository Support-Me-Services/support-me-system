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

# Single shared instance for all 3 services now - organization_db/initialization_db (Phase 1 of
# the consolidation) were destroyed once their rollout was confirmed healthy and idle. Still named
# "auth_db"/"auth-db" throughout since that's the instance/module that predates the consolidation
# and already held real prod data (Keycloak's); renaming it would mean recreating it.
output "auth_db_connection_name" {
  value = module.auth_db.connection_name
}

# Instance name, consumed by infra/scripts/backup-on-demand.sh (`gcloud sql backups create`).
output "auth_db_instance_name" {
  value = module.auth_db.instance_name
}

# Private IP, consumed by infra/scripts/render-k8s-manifests.sh to fill in ${SHARED_DB_HOST}
# (organization/initialization) and ${AUTH_DB_HOST} (auth) in the Deployment specs - same value,
# two names, since organization/initialization/auth all connect to the same instance.
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
