-- Runs once, at first container startup, via docker-entrypoint-initdb.d (official postgres image
-- convention - scripts here only ever execute against a brand-new, empty data directory, never on
-- every restart). Mirrors what infra/k8s/base/db-init/job.yaml does against the shared prod Cloud
-- SQL instance: give organization and initialization their own schema + role inside the ONE
-- database, instead of each getting a whole separate database/instance. Keeps the original
-- least-privilege intent (each service can only ever see/create objects in its own schema) while
-- dropping two Postgres instances' worth of always-on cost.
--
-- POSTGRES_USER/POSTGRES_DB (see docker-compose.yml's `db` service) already created the
-- "keycloak" role (a superuser in this local container, matching the cloudsqlsuperuser privilege
-- Cloud SQL grants every google_sql_user in prod) and the "keycloak_db" database this script runs
-- inside of - that's why the roles/schemas below are created here as plain SQL rather than via
-- more POSTGRES_USER/POSTGRES_DB env vars, which only ever create ONE role/database each.

CREATE ROLE organization LOGIN PASSWORD 'organization';
CREATE ROLE initialization LOGIN PASSWORD 'initialization';

CREATE SCHEMA IF NOT EXISTS organization AUTHORIZATION organization;
CREATE SCHEMA IF NOT EXISTS initialization AUTHORIZATION initialization;

-- Each role's default search_path lands it in its own schema regardless of how it connects
-- (JDBC currentSchema param, psql, etc.) - belt and suspenders with the `?currentSchema=...` JDBC
-- URL param set in docker-compose.yml.
ALTER ROLE organization SET search_path = organization;
ALTER ROLE initialization SET search_path = initialization;

-- Without this, every role can create arbitrary objects in the "public" schema (Postgres grants
-- CREATE on public to PUBLIC by default) - revoke it so organization/initialization are truly
-- confined to their own schema, same isolation intent as the old separate-database setup.
REVOKE CREATE ON SCHEMA public FROM organization, initialization;
