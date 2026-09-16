// A Postgres role + its Secret Manager password on an EXISTING Cloud SQL instance - no instance,
// no google_sql_database. Used for organization/initialization now that they're schemas inside
// the shared auth_db instance's "keycloak_db" database (see environments/prod/main.tf) rather
// than each getting its own `modules/cloudsql` instance. The schema itself, and the
// AUTHORIZATION/GRANT wiring that scopes this role to only its own schema, is created by
// infra/k8s/base/db-init/job.yaml, not Terraform - Cloud SQL's Admin API (what google_sql_user
// talks to) can create/drop roles, but CREATE SCHEMA / GRANT need an actual psql connection,
// which the Terraform runner (GitHub-hosted, outside the VPC) can't make to a private-IP-only
// instance.
//
// Every google_sql_user on Cloud SQL for Postgres is granted the `cloudsqlsuperuser` role by the
// Admin API itself (Cloud SQL's substitute for true superuser) - so this role, once the db-init
// Job runs, is exactly as privileged as the existing "keycloak" role, just confined to its own
// schema by convention (search_path + REVOKE'd CREATE on public) rather than by a hard Postgres
// permission boundary. Same trust model the old database-per-service setup already had.

resource "random_password" "db_password" {
  length  = 32
  special = false # avoid characters that need escaping in JDBC URLs / shell-sourced env files.
}

resource "google_sql_user" "this" {
  project  = var.project_id
  name     = var.database_user
  instance = var.instance_name
  password = random_password.db_password.result
}

resource "google_secret_manager_secret" "db_password" {
  project   = var.project_id
  secret_id = "${var.name_prefix}-${var.service_name}-db-password"

  replication {
    auto {}
  }
}

resource "google_secret_manager_secret_version" "db_password" {
  secret      = google_secret_manager_secret.db_password.id
  secret_data = random_password.db_password.result
}

resource "google_secret_manager_secret_iam_member" "workload_access" {
  project   = var.project_id
  secret_id = google_secret_manager_secret.db_password.secret_id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${var.workload_service_account_email}"
}
