provider "google" {
  project = var.project_id
  region  = var.region
}

provider "google-beta" {
  project = var.project_id
  region  = var.region
}

locals {
  # Every public hostname this environment serves - used here only for the all_hostnames output
  # (a checklist for DNS setup); the actual routing lives in infra/k8s/base/ingress.yaml +
  # managed-certificate.yaml as plain YAML, not templated from this, so the manifests stay
  # readable kubectl/kustomize input - see infra/k8s/README.md.
  #
  # Web app is served on every domain in var.domains; api/auth stay on var.primary_domain only
  # (see infra/k8s/base/api-gateway/deployment.yaml for why).
  web_hosts  = var.domains
  api_hosts  = ["api.${var.primary_domain}"]
  auth_hosts = ["auth.${var.primary_domain}"]
  all_hosts  = concat(local.web_hosts, local.api_hosts, local.auth_hosts)
}

data "google_project" "current" {
  project_id = var.project_id
}

resource "google_project_service" "required" {
  for_each = toset([
    "container.googleapis.com",
    "compute.googleapis.com",
    "sqladmin.googleapis.com",
    "secretmanager.googleapis.com",
    "servicenetworking.googleapis.com",
    "storagetransfer.googleapis.com",
    "artifactregistry.googleapis.com",
    "certificatemanager.googleapis.com",
  ])
  project            = var.project_id
  service            = each.value
  disable_on_destroy = false
}

module "network" {
  source = "../../modules/network"

  project_id  = var.project_id
  region      = var.region
  name_prefix = var.name_prefix

  depends_on = [google_project_service.required]
}

module "gke" {
  source = "../../modules/gke"

  project_id          = var.project_id
  region              = var.region
  name_prefix         = var.name_prefix
  network_self_link   = module.network.network_self_link
  subnet_id           = module.network.subnet_id
  pods_range_name     = module.network.pods_range_name
  services_range_name = module.network.services_range_name

  depends_on = [google_project_service.required]
}

module "edge" {
  source = "../../modules/edge"

  project_id  = var.project_id
  name_prefix = var.name_prefix

  depends_on = [google_project_service.required]
}

// organization/initialization used to each get their own `modules/cloudsql` instance here (see
// git history). Consolidated onto the shared `auth_db` instance below as schemas instead, to cut
// Cloud SQL cost - `auth_db` already holds real prod data (Keycloak's), while organization/
// initialization didn't yet, so it's the one instance worth keeping and the only one worth
// migrating data off of zero. `modules/cloudsql_user` only creates the Postgres role + its
// Secret Manager password (via the Cloud SQL Admin API, which needs no network path to the
// instance); the schema itself and its GRANTs are created by infra/k8s/base/db-init/job.yaml,
// which runs inside the VPC where it can actually open a psql connection - see that file's
// comment for why this can't be done from Terraform directly.
//
// MIGRATION NOTE (do this BEFORE the apply that first removes the old organization_db/
// initialization_db module blocks - already done in this diff, so before applying THIS diff):
// both instances have deletion_protection = true, so a plain `terraform apply` here will fail
// trying to destroy them. Disable it first, one instance at a time, e.g.:
//   gcloud sql instances patch support-me-prod-organization --no-deletion-protection --project=support-me-production
//   gcloud sql instances patch support-me-prod-initialization --no-deletion-protection --project=support-me-production
// Safe to do any time - it does not delete anything by itself, it only lifts the safety catch.
module "organization_db_user" {
  source = "../../modules/cloudsql_user"

  project_id                     = var.project_id
  name_prefix                    = var.name_prefix
  service_name                   = "organization"
  instance_name                  = module.auth_db.instance_name
  database_user                  = "organization"
  workload_service_account_email = module.gke.workload_service_account_email

  depends_on = [google_project_service.required]
}

module "initialization_db_user" {
  source = "../../modules/cloudsql_user"

  project_id                     = var.project_id
  name_prefix                    = var.name_prefix
  service_name                   = "initialization"
  instance_name                  = module.auth_db.instance_name
  database_user                  = "initialization"
  workload_service_account_email = module.gke.workload_service_account_email

  depends_on = [google_project_service.required]
}

module "auth_db" {
  source = "../../modules/cloudsql"

  project_id                     = var.project_id
  region                         = var.region
  name_prefix                    = var.name_prefix
  service_name                   = "auth"
  database_name                  = "keycloak_db"
  database_user                  = "keycloak"
  network_id                     = module.network.network_id
  private_vpc_connection         = module.network.private_vpc_connection
  workload_service_account_email = module.gke.workload_service_account_email
  # Now the shared instance for all 3 services (see the organization_db_user/
  # initialization_db_user modules above) - worth a standby replica from day one regardless, since
  # Keycloak alone was already the front door for every login before the consolidation.
  availability_type = "REGIONAL"

  depends_on = [google_project_service.required]
}

module "storage" {
  source = "../../modules/storage"

  project_id                     = var.project_id
  project_number                 = data.google_project.current.number
  region                         = var.region
  name_prefix                    = var.name_prefix
  workload_service_account_email = module.gke.workload_service_account_email

  depends_on = [google_project_service.required]
}

// Keycloak's own admin bootstrap credentials (KEYCLOAK_ADMIN / KEYCLOAK_ADMIN_PASSWORD) -
// separate from the auth_db module above, which only manages the Postgres role Keycloak uses to
// connect to its database.
resource "random_password" "keycloak_admin_password" {
  length  = 32
  special = false
}

resource "google_secret_manager_secret" "keycloak_admin_password" {
  project   = var.project_id
  secret_id = "${var.name_prefix}-keycloak-admin-password"

  replication {
    auto {}
  }

  depends_on = [google_project_service.required]
}

resource "google_secret_manager_secret_version" "keycloak_admin_password" {
  secret      = google_secret_manager_secret.keycloak_admin_password.id
  secret_data = random_password.keycloak_admin_password.result
}

resource "google_secret_manager_secret_iam_member" "keycloak_admin_password_access" {
  project   = var.project_id
  secret_id = google_secret_manager_secret.keycloak_admin_password.secret_id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${module.gke.workload_service_account_email}"
}
