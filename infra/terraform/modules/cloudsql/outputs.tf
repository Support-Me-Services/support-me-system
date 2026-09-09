output "instance_name" {
  value = google_sql_database_instance.this.name
}

output "connection_name" {
  description = "Cloud SQL connection name (project:region:instance), for the Cloud SQL Auth Proxy sidecar."
  value       = google_sql_database_instance.this.connection_name
}

output "private_ip_address" {
  value = google_sql_database_instance.this.private_ip_address
}

output "database_name" {
  value = google_sql_database.this.name
}

output "database_user" {
  value = google_sql_user.this.name
}

output "password_secret_id" {
  description = "Secret Manager secret ID holding this DB's password (secret value itself is never a Terraform output)."
  value       = google_secret_manager_secret.db_password.secret_id
}
