#!/usr/bin/env bash
# Run before any deployment considered risky (schema migration, major version bump, data
# backfill) - see SCRUM-185's acceptance criteria for on-demand backups. Triggers an immediate
# Cloud SQL backup for all instances that still exist - during the single-instance consolidation's
# Phase 1 (see infra/terraform/environments/prod/main.tf's consolidation note) that's still 3:
# the old organization_db/initialization_db (not yet decommissioned) plus the shared auth_db -
# plus an immediate run of the uploads bucket's scheduled Storage Transfer job, on top of (not
# instead of) their daily automatic backups.
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

for instance in "$(tf_output organization_db_instance_name)" \
                "$(tf_output initialization_db_instance_name)" \
                "$(tf_output auth_db_instance_name)"; do
  echo "==> Triggering on-demand Cloud SQL backup for $instance"
  gcloud sql backups create --instance="$instance" --project="$PROJECT_NUMBER" \
    --description="on-demand, pre-risky-deploy ($(date -u +%FT%TZ))"
done

TRANSFER_JOB="$(tf_output transfer_job_name)"
echo "==> Triggering on-demand uploads backup ($TRANSFER_JOB)"
gcloud transfer jobs run "$TRANSFER_JOB" --project="$PROJECT_NUMBER"

echo "Done."
