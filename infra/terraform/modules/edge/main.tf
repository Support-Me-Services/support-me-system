// Reserves the external IP the GKE Ingress (see infra/k8s/base/ingress.yaml) will bind to.
// Reserved *before* the Ingress exists so the address is static across Ingress
// recreations - point every domain's DNS A record at this one IP.
//
// One IP serves every hostname on every domain (please-support-me.com, please-support-me.pl,
// and their auth./api. subdomains) - the GCE Ingress + a single multi-domain ManagedCertificate
// route by Host header, not by IP, so adding a domain never needs a new address.

resource "google_compute_global_address" "ingress_ip" {
  project = var.project_id
  name    = "${var.name_prefix}-ingress-ip"
}
