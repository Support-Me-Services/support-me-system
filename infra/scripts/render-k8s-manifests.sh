#!/usr/bin/env bash
# Renders infra/k8s/overlays/prod with kustomize, then substitutes the ${...} placeholders that
# reference Terraform outputs (SecretProviderClass resource names, DB private IPs, the ingress
# static IP name, the Workload Identity GSA email). kustomize itself has no first-class "read a
# value from a Terraform output" mechanism, so plain envsubst is the least-magic way to bridge
# the two - keeps the YAML readable as YAML instead of turning it into a templating DSL.
#
# Usage (from repo root, after `terraform apply` in infra/terraform/environments/prod):
#   ./infra/scripts/render-k8s-manifests.sh > /tmp/support-me-prod.yaml
#   kubectl apply -f /tmp/support-me-prod.yaml
#
# On a fresh consolidation (see infra/terraform/environments/prod/main.tf), also apply
# infra/k8s/base/db-init/{secretproviderclass,job}.yaml (same envsubst treatment) and wait for
# that Job to complete BEFORE the above - it's deliberately not one of the resources this script
# renders, since kustomize's single `kubectl apply` has no built-in "run this Job to completion
# first" ordering. See that Job's comment and .github/workflows/deploy-prod.yml's "Create
# organization/initialization schemas" step for the exact commands.
#
# Requires: kubectl (for `kubectl kustomize`), envsubst (gettext), and `terraform output` to be
# runnable against infra/terraform/environments/prod's already-applied state.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
TF_DIR="$REPO_ROOT/infra/terraform/environments/prod"

tf_output() {
  terraform -chdir="$TF_DIR" output -raw "$1"
}

export GCP_PROJECT_NUMBER
GCP_PROJECT_NUMBER="$(tf_output project_number)"

export WORKLOAD_GSA_EMAIL
WORKLOAD_GSA_EMAIL="$(tf_output workload_service_account_email)"

export SHARED_DB_HOST
SHARED_DB_HOST="$(tf_output shared_db_private_ip)"

export AUTH_DB_HOST
AUTH_DB_HOST="$(tf_output auth_db_private_ip)"

export INGRESS_IP_NAME
INGRESS_IP_NAME="$(tf_output ingress_ip_name)"

kubectl kustomize "$REPO_ROOT/infra/k8s/overlays/prod" | envsubst
