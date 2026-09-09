# infra

Production infrastructure for support-me-system: Terraform (Google Cloud) + Kubernetes
manifests. Tracks [SCRUM-185](https://please-support-me.atlassian.net/browse/SCRUM-185) (the
production deployment story) and its subtask
[SCRUM-186](https://please-support-me.atlassian.net/browse/SCRUM-186).

```
infra/
  terraform/
    bootstrap/            One-time setup (Terraform state bucket, Artifact Registry). Local state.
    environments/prod/    The actual environment: GKE, Cloud SQL, networking, storage, secrets.
    modules/               Reusable building blocks used by environments/prod.
  k8s/
    base/                  Namespace, Deployments/Services for all 4 apps, Gateway API routing.
    overlays/prod/         Points base's images at real Artifact Registry tags for a given deploy.
  scripts/
    render-k8s-manifests.sh   kustomize build + envsubst Terraform outputs into the manifests.
    backup-on-demand.sh       Manual pre-risky-deploy backup (Cloud SQL + uploads bucket).
```

## What this environment serves

**Launching on `.pl` only.** `please-support-me.com` is intentionally not wired up yet - the team
plans to land on `please-support-me.pl` first and cut over to `.com` later. See
`infra/terraform/environments/prod/variables.tf`'s `domains`/`primary_domain` for the switch
point, and the "Cutting over to please-support-me.com later" section below for what else changes.

| Hostname | App |
|---|---|
| `please-support-me.pl` | `web` (Next.js) |
| `api.please-support-me.pl` | `api-gateway` |
| `auth.please-support-me.pl` | `auth` (Keycloak) |

Even once `.com` is added alongside `.pl` (rather than as a straight swap), `api.`/`auth.` are
meant to stay on a single canonical domain rather than one-per-TLD - see the comment block in
[`k8s/base/api-gateway/deployment.yaml`](k8s/base/api-gateway/deployment.yaml) for why (Spring
Security's resource-server config only validates one static OIDC issuer; duplicating Keycloak per
domain would need a custom multi-issuer validator, out of scope here). A second web domain would
call the same api./auth. backend cross-origin - `api-gateway`'s CORS allow-list would need that
origin added.

## First-time setup, in order

1. **Bootstrap** (`terraform/bootstrap`) - creates the Terraform state bucket and Artifact
   Registry repo. Local state; apply once per GCP project.
2. **DNS**: not managed by Terraform (decided against a Cloud DNS migration for now) - once
   `terraform apply` in `environments/prod` gives you `ingress_ip_address`, add an **A record**
   for each of the three hostnames above, at whatever registrar/DNS provider currently manages
   `please-support-me.pl`, pointing at that IP.
3. **`environments/prod`** - copy `terraform.tfvars.example` to `terraform.tfvars`, fill in
   `project_id`, fill the state bucket name from step 1 into `backend.tf`, then
   `terraform init && terraform apply`.
4. **Build & push images** to the Artifact Registry repo from step 1: `api-gateway`,
   `organization`, `initialization` (Dockerfiles already in `backend/*/Dockerfile`), and `web`
   (new: `frontend/apps/web/Dockerfile` - needs `--build-arg NEXT_PUBLIC_*` set to the values in
   the table above, e.g. `NEXT_PUBLIC_API_BASE_URL=https://api.please-support-me.pl`).
5. Update `k8s/overlays/prod/kustomization.yaml`'s `images:` with the real tags/digests just
   pushed.
6. Get cluster credentials: `gcloud container clusters get-credentials <cluster_name> --region
   <region> --project <project_id>` (`cluster_name`/`region` from `terraform output`).
7. **TLS certificate** - this cluster's GKE version has no classic Ingress-GCE controller at all
   (confirmed by a real failure: an `Ingress` + `ManagedCertificate` sat for 50+ minutes with zero
   events and zero created load-balancer resources - only Gateway API `GatewayClass`es are
   registered). `k8s/base/gateway.yaml`'s HTTPS listener expects a Certificate Manager
   certificate map already set up - not yet expressed in Terraform, so create it by hand once per
   environment (DNS for every hostname must already point at the reserved IP before this can
   activate):
   ```bash
   gcloud services enable certificatemanager.googleapis.com --project=<project_id>
   gcloud certificate-manager certificates create support-me-cert \
     --domains="please-support-me.pl,api.please-support-me.pl,auth.please-support-me.pl" \
     --project=<project_id>
   gcloud certificate-manager maps create support-me-cert-map --project=<project_id>
   for host in please-support-me.pl api.please-support-me.pl auth.please-support-me.pl; do
     gcloud certificate-manager maps entries create "$(echo "$host" | tr '.' '-')" \
       --map=support-me-cert-map --certificates=support-me-cert \
       --hostname="$host" --project=<project_id>
   done
   ```
   Provisioning (`gcloud certificate-manager certificates describe support-me-cert
   --format="value(managed.state)"` reaching `ACTIVE`) can take anywhere from a few minutes to
   ~an hour on first issuance.
8. `./scripts/render-k8s-manifests.sh | kubectl apply -f -`
9. Once the certificate is `ACTIVE` and DNS has propagated, do the Keycloak realm setup from the
   root `README.md`'s "Local auth setup" section against `auth.please-support-me.pl` instead of
   `localhost:8081`, using `https://please-support-me.pl/*` for the `support-me-web` client's
   `redirectUris`/`webOrigins` instead of the `.com` ones written there.

## Cutting over to please-support-me.com later

When the team is ready:

1. Decide: adding `.com` **alongside** `.pl`, or a straight **swap**. For a swap, just replace
   the value everywhere below; for both live at once, add `.com` alongside instead of replacing.
2. `infra/terraform/environments/prod/terraform.tfvars`: update `domains` (and `primary_domain`
   if api/auth move to `.com`), `terraform apply`.
3. `infra/k8s/base/httproutes.yaml`: add a `please-support-me.com` entry to the `web` HTTPRoute's
   `hostnames` (and to `api-gateway`/`auth`'s if those move).
4. Certificate Manager: recreate `support-me-cert` with `please-support-me.com` added to
   `--domains` (Certificate Manager certs are immutable once created - delete and recreate, or
   add a second certificate to the same map), and add matching `maps entries` for the new
   hostname(s) - see step 7 of the first-time setup above for the exact commands.
5. If api/auth move to `.com`: update `infra/k8s/base/auth/deployment.yaml`'s `KC_HOSTNAME` and
   `infra/k8s/base/api-gateway/deployment.yaml`'s issuer-uri, and rebuild the `web` image with
   `NEXT_PUBLIC_API_BASE_URL`/`NEXT_PUBLIC_KEYCLOAK_URL` pointed at the new hostnames (they're
   baked in at build time - see `frontend/apps/web/Dockerfile`).
6. Update `APP_CORS_ALLOWED_ORIGINS` in `api-gateway/deployment.yaml` to include whichever web
   domain(s) are live.
7. DNS + Keycloak client `redirectUris`/`webOrigins`, same as the first-time setup above but for
   `.com`.

## Backups (SCRUM-185 acceptance criteria)

- **Cloud SQL** (all 3 instances): automatic daily backup + point-in-time recovery, configured in
  `modules/cloudsql`. On-demand: `./scripts/backup-on-demand.sh`.
- **User-uploaded files** (`modules/storage`): daily Storage Transfer job copies the uploads
  bucket to a backup bucket in a second region, plus object versioning on the primary bucket.
  On-demand: same script, which also triggers an immediate transfer run.

Run `./scripts/backup-on-demand.sh` before any deploy considered risky (schema migration, major
version bump, backfill).

## Known follow-ups (not yet done)

- **CI/CD**: this only adds the manifests/IaC - there's no GitHub Actions workflow yet to build
  images, push to Artifact Registry, and apply manifests on merge to `main`. `backend-ci.yml`
  currently only runs tests.
- **Keycloak clustering**: `auth` Deployment is pinned to `replicas: 1` - going higher needs
  Infinispan/JGroups cache config first (Keycloak 26 docs: "Configuring distributed caches").
- **Observability** (OpenTelemetry + Grafana, per the root README's architecture table) isn't
  part of this infra yet.
- **Secret Manager GKE add-on**: confirmed working against a real cluster. One correction from
  the original draft: the registered CSI driver name is **`secrets-store-gke.csi.k8s.io`**, not
  the generic community driver's `secrets-store.csi.k8s.io` - already fixed in every
  `k8s/base/*/deployment.yaml` volume spec. If this ever regresses, `kubectl get csidrivers`
  shows the driver actually registered on the cluster. Its "sync as Kubernetes Secret" feature
  also needs `k8s/base/csi-secrets-store-rbac.yaml` (a ClusterRole/ClusterRoleBinding) - without
  it, the driver's own ServiceAccount can't create the synced Secret objects and every DB
  password mount times out.
- **Gateway API, not Ingress**: this GKE version has no ingress-gce controller at all - routing
  is `k8s/base/gateway.yaml` (a `Gateway`, class `gke-l7-global-external-managed`) +
  `k8s/base/httproutes.yaml`, not a classic `Ingress`. Two gotchas hit during the first real
  deploy, both already fixed here: (1) the auto-generated backend health check defaults to path
  `/`, which 401s on api-gateway and doesn't work on Keycloak's root either - see
  `k8s/base/api-gateway/healthcheckpolicy.yaml` and `k8s/base/auth/healthcheckpolicy.yaml`
  (`HealthCheckPolicy` CRD) for the fix; (2) TLS termination needs a Certificate Manager
  certificate map referenced via the HTTPS listener's `tls.options["networking.gke.io/certificate-map"]`
  - a bare `networking.gke.io/certmap` annotation on the Gateway itself (the pattern used with
  classic Ingress) is not read by this controller.
- **Certificate Manager isn't in Terraform yet**: `support-me-cert` / `support-me-cert-map` /
  its per-hostname map entries are created by hand (step 7 of first-time setup) - a
  `google_certificate_manager_*` Terraform resource set would remove that manual step.
