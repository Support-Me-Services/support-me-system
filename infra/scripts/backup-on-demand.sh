#!/usr/bin/env bash
# Run before any deployment considered risky (schema migration, major version bump, data
# backfill) - see SCRUM-185's acceptance criteria for on-demand backups. Triggers an immediate
# Cloud SQL backup for the shared instance (all 3 services live on it now - see
# infra/terraform/environments/prod/main.tf's consolidation note) plus an immediate run of the
# uploads bucket's scheduled Storage Transfer job, on top of (not instead of) their daily
# automatic backups.
#
# Usage: ./infra/scripts/backup-on-demand.sh
# Requires: gcloud, authenticated with access to the project, and terraform output access to
# infra/terraform/environments/prod's state.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
TF_DIR="$REPO_ROOT/infra/terraform/environments/prod"

tf_output() {
  terraform -chdir="$TF_DIR" output -raw "$1"
}

PROJECT_NUMBER="$(tf_output project_number)"

INSTANCE="$(tf_output auth_db_instance_name)"
echo "==> Triggering on-demand Cloud SQL backup for $INSTANCE"
gcloud sql backups create --instance="$INSTANCE" --project="$PROJECT_NUMBER" \
  --description="on-demand, pre-risky-deploy ($(date -u +%FT%TZ))"

TRANSFER_JOB="$(tf_output transfer_job_name)"
echo "==> Triggering on-demand uploads backup ($TRANSFER_JOB)"
gcloud transfer jobs run "$TRANSFER_JOB" --project="$PROJECT_NUMBER"

echo "Done."
