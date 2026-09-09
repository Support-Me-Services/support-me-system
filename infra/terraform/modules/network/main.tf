// VPC for the prod environment: one subnet for GKE (with secondary ranges for pod/service IPs,
// required by GKE's VPC-native networking), Cloud NAT so private nodes/Cloud SQL clients get
// egress (e.g. to pull images, call external APIs), and a private-services-access peering so
// Cloud SQL instances can use private IP only (no instance gets a public IP).

resource "google_compute_network" "vpc" {
  name                    = "${var.name_prefix}-vpc"
  project                 = var.project_id
  auto_create_subnetworks = false
}

resource "google_compute_subnetwork" "gke" {
  name          = "${var.name_prefix}-gke"
  project       = var.project_id
  region        = var.region
  network       = google_compute_network.vpc.id
  ip_cidr_range = var.subnet_cidr

  secondary_ip_range {
    range_name    = "pods"
    ip_cidr_range = var.pods_cidr
  }
  secondary_ip_range {
    range_name    = "services"
    ip_cidr_range = var.services_cidr
  }

  private_ip_google_access = true
}

resource "google_compute_router" "router" {
  name    = "${var.name_prefix}-router"
  project = var.project_id
  region  = var.region
  network = google_compute_network.vpc.id
}

resource "google_compute_router_nat" "nat" {
  name                               = "${var.name_prefix}-nat"
  project                            = var.project_id
  router                             = google_compute_router.router.name
  region                             = var.region
  nat_ip_allocate_option             = "AUTO_ONLY"
  source_subnetwork_ip_ranges_to_nat = "ALL_SUBNETWORKS_ALL_IP_RANGES"

  log_config {
    enable = true
    filter = "ERRORS_ONLY"
  }
}

// Reserved range + peering so Cloud SQL instances get a private IP inside this VPC instead of a
// public one - required for the cloudsql module's `ip_configuration.private_network`.
resource "google_compute_global_address" "private_service_range" {
  name          = "${var.name_prefix}-private-services"
  project       = var.project_id
  purpose       = "VPC_PEERING"
  address_type  = "INTERNAL"
  prefix_length = 16
  network       = google_compute_network.vpc.id
}

resource "google_service_networking_connection" "private_vpc_connection" {
  network                 = google_compute_network.vpc.id
  service                 = "servicenetworking.googleapis.com"
  reserved_peering_ranges = [google_compute_global_address.private_service_range.name]
}
