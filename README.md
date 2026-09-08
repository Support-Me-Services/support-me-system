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

## Getting started

```bash
# Frontend
cd frontend && pnpm install && pnpm dev

# Backend (needs the buf CLI installed first — see backend/README.md prerequisites)
cd backend && mvn install

# Full local stack (Postgres + Keycloak + all 3 backend services)
docker compose up
```
