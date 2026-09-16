# support-me-system

A system for organizations to manage their public presence and internal
operations (CMS, business card, recruitment, shop, fundraising) with
QR/NFC/email/SMS-based entry points — built mobile-first from Figma, as one
React/React Native codebase plus a Spring Boot microservices backend.

## Repository layout

```
support-me-system/
  frontend/     Turborepo monorepo — Next.js (web, client-rendered app on a Node server) +
                Expo (iOS/Android),
                sharing screens/navigation via Solito. See frontend/README.md.
  backend/      Maven multi-module reactor — api-gateway, organization, initialization,
                proto-contracts. See backend/README.md.
  docker-compose.yml   Local dev environment: one Postgres instance per service, Keycloak, and
                the three backend services.
  .github/workflows/   CI (backend-ci.yml; a frontend-ci.yml lives alongside it).
```

## Architecture at a glance

| Layer | Choice |
|---|---|
| Web | Next.js, client-rendered app served by `next start` (not a static export — see frontend/README.md), NativeWind styling |
| Mobile | Expo (iOS/Android), same screens as web via `react-native-web` + Solito |
| API client | Orval-generated TanStack Query hooks from the `api-gateway` OpenAPI/Swagger spec |
| Auth | Keycloak (OIDC) — `react-oidc-context` (web) / `expo-auth-session` (native) |
| API Gateway | Spring Boot, REST + springdoc/Swagger, OAuth2 resource server (validates Keycloak JWTs) |
| Domain services | `organization` (CMS, business card, recruitment, shop, fundraising) and `initialization` (QR/NFC/email/SMS entry points) — Spring Boot, gRPC servers, PostgreSQL + Liquibase |
| Inter-service comms | gRPC (Spring gRPC, blocking stubs + virtual threads); external traffic only via api-gateway's REST API |
| Data | One shared PostgreSQL instance/database (incl. Keycloak's), one schema + one low-privilege role per service - no shared superuser, isolation at the schema level instead of a dedicated instance per service |
| Local dev infra | Docker Compose | **Production infra** | Kubernetes |
| CI/CD | GitHub Actions | **Observability** | OpenTelemetry + Grafana (Prometheus/Loki/Tempo) |

See [`frontend/README.md`](frontend/README.md) and [`backend/README.md`](backend/README.md) for
the full stack rationale, setup prerequisites, and known TODOs for each half.

## Production hostnames (planned)

| Service | Hostname |
|---|---|
| Web app | `please-support-me.com` |
| Keycloak (auth/IAM) | `auth.please-support-me.com` |

Wherever a hostname is used for the auth service (env vars, docker-compose service name, issuer
URIs) it's named **`auth`**, never `keycloak` — e.g. the compose service is `auth`, and
`api-gateway`'s issuer-uri resolves to `http://auth:8080/realms/support-me` inside the compose
network. "Keycloak" is still used as the product name in prose.

## Getting started

```bash
# Frontend
cd frontend && pnpm install && pnpm dev

# Backend (needs the buf CLI installed first — see backend/README.md prerequisites)
cd backend && mvn install

# Full local stack (Postgres + auth/Keycloak + all 3 backend services)
docker compose up -d --build
```

### This machine: Docker Desktop is broken, use WSL2 instead

On this Windows machine, Docker Desktop crash-loops on startup with `AF_UNIX socket ... The file
cannot be accessed by the system` — a confirmed open Docker Desktop bug
([docker/desktop-feedback#460](https://github.com/docker/desktop-feedback/issues/460)) where every
internal Unix-socket file it creates (`dockerInference`, `docker-secrets-engine/engine.sock`,
`sailor-ingest.sock`, ...) gets corrupted the instant it's created, regardless of Docker Desktop
version, antivirus state, or a clean reinstall.

Workaround: run Docker Engine directly inside WSL2 (Ubuntu), bypassing Docker Desktop's Windows
GUI/backend entirely — AF_UNIX sockets are native to Linux there, so the bug doesn't apply.

```bash
# One-time setup already done on this machine: `wsl --install -d Ubuntu`, then Docker Engine +
# Compose plugin installed inside it via apt (see https://docs.docker.com/engine/install/ubuntu/).
# systemd is enabled in that Ubuntu distro, so `docker.service` starts automatically on boot.

# WSL2 shuts its VM down after ~1-2 min with no attached session, killing all containers even
# though dockerd keeps running as a systemd service — vmIdleTimeout=-1 in %UserProfile%\.wslconfig
# didn't reliably prevent this, so keep one session attached for the life of the work:
wsl -d Ubuntu -- sleep infinity   # run in background, leave it running

# Start the stack (run from Windows; /mnt/c/... is this repo inside WSL):
wsl -d Ubuntu -u root -- bash -c "cd /mnt/c/Users/Lenovo/Desktop/Git && docker compose up -d --build"

# Check status / logs:
wsl -d Ubuntu -u root -- bash -c "cd /mnt/c/Users/Lenovo/Desktop/Git && docker compose ps"
```

Ports are forwarded to `localhost` automatically by WSL2, so `http://localhost:8080`,
`:8081`, `:5432` etc. work from Windows exactly as if Docker Desktop were running.

`backend/docker/postgres/init-multiple-dbs.sh` must have Unix (LF) line endings — CRLF breaks it
silently inside the postgres container (`env: 'bash\r': No such file or directory`), and it fails
to create `organization_db`/`initialization_db`/`keycloak_db`, which then makes `auth` (Keycloak)
crash-loop with `UnknownHostException`/`database "keycloak_db" does not exist`. Already fixed in
this repo; watch for it coming back via `core.autocrlf=true` on a fresh Windows checkout.

## Local auth setup

The `support-me` realm, `support-me-web` client, and a test user aren't created automatically by
`docker compose up` — Keycloak starts empty. After the `auth` container is up
(`curl http://localhost:8081` should redirect), create them via the Admin REST API:

```bash
# 1. Get an admin token (master realm, default admin/admin from docker-compose.yml)
TOKEN=$(curl -s -X POST "http://localhost:8081/realms/master/protocol/openid-connect/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=password&client_id=admin-cli&username=admin&password=admin" \
  | grep -o '"access_token":"[^"]*"' | cut -d'"' -f4)

# 2. Create the realm (id "support-me", display name "Support Me")
curl -X POST "http://localhost:8081/admin/realms" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"realm":"support-me","displayName":"Support Me","enabled":true,"sslRequired":"none"}'

# 3. Create the web client (public, PKCE required)
curl -X POST "http://localhost:8081/admin/realms/support-me/clients" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{
    "clientId":"support-me-web","publicClient":true,"protocol":"openid-connect",
    "standardFlowEnabled":true,"directAccessGrantsEnabled":false,
    "redirectUris":["http://localhost:3000/*","https://please-support-me.com/*"],
    "webOrigins":["http://localhost:3000","https://please-support-me.com"],
    "attributes":{
      "pkce.code.challenge.method":"S256",
      "post.logout.redirect.uris":"http://localhost:3000/*##https://please-support-me.com/*"
    }
  }'

# 4. Create a test user
curl -X POST "http://localhost:8081/admin/realms/support-me/users" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{
    "username":"testuser","email":"testuser@please-support-me.com","emailVerified":true,
    "enabled":true,"firstName":"Test","lastName":"User",
    "credentials":[{"type":"password","value":"TestPass123!","temporary":false}]
  }'

# 5. Create the SUPER_ADMIN realm role (global role: approves ORG deletion requests -
#    see api-gateway's SecurityConfig, "/api/v1/admin/**" -> hasRole("SUPER_ADMIN"))
curl -X POST "http://localhost:8081/admin/realms/support-me/roles" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"name":"SUPER_ADMIN","description":"Can approve ORG deletion requests"}'

# 6. Assign it to testuser (swap the user id for whoever needs it)
USER_ID=$(curl -s "http://localhost:8081/admin/realms/support-me/users?username=testuser&exact=true" \
  -H "Authorization: Bearer $TOKEN" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
ROLE_ID=$(curl -s "http://localhost:8081/admin/realms/support-me/roles/SUPER_ADMIN" \
  -H "Authorization: Bearer $TOKEN" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
curl -X POST "http://localhost:8081/admin/realms/support-me/users/$USER_ID/role-mappings/realm" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d "[{\"id\":\"$ROLE_ID\",\"name\":\"SUPER_ADMIN\"}]"
```

Then `frontend/apps/web/.env.local` (gitignored, not committed):

```
NEXT_PUBLIC_KEYCLOAK_URL=http://localhost:8081
NEXT_PUBLIC_KEYCLOAK_REALM=support-me
NEXT_PUBLIC_KEYCLOAK_CLIENT_ID=support-me-web
NEXT_PUBLIC_KEYCLOAK_REDIRECT_URI=http://localhost:3000/
NEXT_PUBLIC_KEYCLOAK_SCOPE=openid profile email
```

Verified end-to-end: `pnpm dev` → click "Log in" → redirected to Keycloak's "Support Me" login
page → sign in as `testuser` / `TestPass123!` → redirected back, shows "Signed in as Test User" →
"Log out" → back to "Not signed in".

This setup is wiped by `docker compose down -v` (removes the Postgres volume Keycloak's realm
data lives in) — re-run the six commands above after recreating the stack.
