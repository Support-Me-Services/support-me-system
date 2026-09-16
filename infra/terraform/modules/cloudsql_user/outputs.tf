output "database_user" {
  value = google_sql_user.this.name
}

output "password_secret_id" {
  description = "Secret Manager secret ID holding this role's password (secret value itself is never a Terraform output)."
  value       = google_secret_manager_secret.db_password.secret_id
}
