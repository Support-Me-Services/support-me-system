# support-me-system

A system for organizations to manage their public presence and internal
operations (CMS, business card, recruitment, shop, fundraising) with
QR/NFC/email/SMS-based entry points — built mobile-first from Figma, as one
React/React Native codebase plus a Spring Boot microservices backend.

## Repository layout

```
support-me-system/
  frontend/     Turborepo monorepo — Next.js (web, static SPA export) + Expo (iOS/Android),
                sharing screens/navigation via Solito. See frontend/README.md.
  backend/      Maven multi-module reactor — api-gateway, organization, initialization,
                proto-contracts. See backend/README.md.
  docker-compose.yml   Local dev environment: Postgres, Keycloak, and the three services.
  .github/workflows/   CI (backend-ci.yml; a frontend-ci.yml lives alongside it).
```

## Architecture at a glance

| Layer | Choice |
|---|---|
| Web | Next.js, static client-rendered SPA (no SSR — no public pages need SEO), NativeWind styling |
| Mobile | Expo (iOS/Android), same screens as web via `react-native-web` + Solito |
| API client | Orval-generated TanStack Query hooks from the `api-gateway` OpenAPI/Swagger spec |
| Auth | Keycloak (OIDC) — `react-oidc-context` (web) / `expo-auth-session` (native) |
| API Gateway | Spring Boot, REST + springdoc/Swagger, OAuth2 resource server (validates Keycloak JWTs) |
| Domain services | `organization` (CMS, business card, recruitment, shop, fundraising) and `initialization` (QR/NFC/email/SMS entry points) — Spring Boot, gRPC servers, PostgreSQL + Liquibase |
| Inter-service comms | gRPC (Spring gRPC, blocking stubs + virtual threads); external traffic only via api-gateway's REST API |
| Data | One PostgreSQL cluster, one logical database per service (+ Keycloak's own) |
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
data lives in) — re-run the four commands above after recreating the stack.
