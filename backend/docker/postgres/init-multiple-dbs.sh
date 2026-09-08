#!/usr/bin/env bash
# Creates one logical database per name listed in POSTGRES_MULTIPLE_DATABASES (comma or space
# separated), all on the single shared Postgres instance used for local dev. Runs automatically
# because the official postgres image executes every script in
# /docker-entrypoint-initdb.d/ on first container startup (empty data volume only).
set -euo pipefail

if [ -z "${POSTGRES_MULTIPLE_DATABASES:-}" ]; then
  echo "init-multiple-dbs: POSTGRES_MULTIPLE_DATABASES not set, skipping."
  exit 0
fi

create_database() {
  local database=$1
  echo "init-multiple-dbs: creating database '$database'"
  psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" <<-EOSQL
    CREATE DATABASE "$database";
EOSQL
}

# Split on commas and/or whitespace.
IFS=', ' read -ra DATABASES <<< "$POSTGRES_MULTIPLE_DATABASES"
for db in "${DATABASES[@]}"; do
  if [ -n "$db" ]; then
    create_database "$db"
  fi
done

echo "init-multiple-dbs: done."
