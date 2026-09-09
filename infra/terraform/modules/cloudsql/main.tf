// One Cloud SQL (Postgres) instance per service - mirrors docker-compose.yml's
// database-per-service design (own instance, own volume/disk, own low-privilege role) for the
// same blast-radius and least-privilege reasons documented there. Instantiate this module once
// per service (see environments/prod/main.tf) rather than making it create all three itself, so
// each service's DB can be resized/restored independently without touching the others' state.

resource "random_password" "db_password" {
  length  = 32
  special = false # avoid characters that need escaping in JDBC URLs / shell-sourced env files.
}

resource "google_sql_database_instance" "this" {
  project             = var.project_id
  name                = "${var.name_prefix}-${var.service_name}"
  region              = var.region
  database_version    = "POSTGRES_17"
  deletion_protection = true

  settings {
    # Explicit "ENTERPRISE" edition (as opposed to the newer, pricier "ENTERPRISE_PLUS", which
    # is now the API default for new instances and only accepts its own db-perf-optimized-N-*
    # tiers) - required for the classic db-custom-N-M tier below to be valid at all.
    edition           = "ENTERPRISE"
    tier              = var.tier
    availability_type = var.availability_type
    disk_autoresize   = true
    disk_size         = var.disk_size_gb

    ip_configuration {
      ipv4_enabled    = false # private IP only - no instance is reachable from the public internet.
      private_network = var.network_id
    }

    backup_configuration {
      enabled                        = true
      start_time                     = "02:00" # Europe/Warsaw off-peak; see also the GKE maintenance window.
      point_in_time_recovery_enabled = true    # WAL-based PITR, on top of the daily snapshot below.
      transaction_log_retention_days = 7
      backup_retention_settings {
        retained_backups = 14
        retention_unit   = "COUNT"
      }
    }

    maintenance_window {
      day  = 7 # Sunday
      hour = 3
    }
  }

  depends_on = [var.private_vpc_connection]
}

resource "google_sql_database" "this" {
  project  = var.project_id
  name     = var.database_name
  instance = google_sql_database_instance.this.name
}

resource "google_sql_user" "this" {
  project  = var.project_id
  name     = var.database_user
  instance = google_sql_database_instance.this.name
  password = random_password.db_password.result
}

// Password lives in Secret Manager, not in Terraform state alone or a K8s Secret manifest -
// pods read it at runtime via the Secret Manager CSI volume (see
// k8s/base/<service>/secretproviderclass.yaml), so it's never committed or `kubectl get`-able
// in plaintext.
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
