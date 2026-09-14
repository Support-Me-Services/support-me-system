# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

`support-me-system`: lets organizations (foundations, NGOs, parishes, local communities) manage
their public presence and internal operations (CMS, business card, recruitment, shop,
fundraising) via QR/NFC/email/SMS entry points. One React/React Native codebase (web + mobile)
built mobile-first from Figma, plus a Spring Boot gRPC microservices backend. See the root
`README.md` for the architecture table and production hostnames, `backend/README.md` and
`frontend/README.md` for each half's full stack rationale and known TODOs, `infra/README.md` for
the GCP/Kubernetes deployment story (tracks SCRUM-185/SCRUM-186 in Jira).

## Commands

```bash
# Frontend (frontend/) — Turborepo + pnpm workspaces
pnpm install
pnpm dev              # web + mobile dev servers
pnpm --filter @support-me/web dev      # one app only
pnpm --filter @support-me/mobile dev
pnpm build            # web only produces a meaningful build; mobile uses `expo export`
pnpm lint
pnpm test
pnpm typecheck
pnpm generate:api     # regenerate packages/api-client from backend/api-gateway-openapi.json (Orval)

# Backend (backend/) — Maven multi-module reactor, needs JDK 25 + buf CLI on PATH
mvn install                                                              # full reactor build
mvn -pl proto-contracts,organization,initialization,api-gateway -am verify -DskipITs   # fast, no integration tests
mvn -pl proto-contracts,organization,initialization,api-gateway -am verify             # full, incl. Testcontainers ITs
mvn -pl organization test -Dtest=OrganizationServiceTest#someMethod       # single test

# Full local stack (Postgres ×3 + Keycloak + all 3 backend services)
docker compose up -d --build
```

### This machine: use WSL2 for Docker, not Docker Desktop

Docker Desktop crash-loops on this machine (confirmed AF_UNIX socket bug, not fixable via
reinstall/antivirus). Run Docker Engine inside WSL2 (Ubuntu) instead — see the root `README.md`'s
"This machine: Docker Desktop is broken, use WSL2 instead" section for the exact commands. Keep
one `wsl -d Ubuntu -- sleep infinity` session attached, or the VM suspends after ~1-2 min idle and
kills every container even though `dockerd` itself is a systemd service.

## Architecture

- **Cross-platform frontend**: one codebase, Next.js (`apps/web`) + Expo (`apps/mobile`), sharing
  screens/navigation via Solito. `apps/web` is a real Next.js server (`next start`), not a static
  export — dynamic segments (org id, IND/ORG slug) are created at runtime and can't be enumerated
  by `generateStaticParams()`. Every screen is still `"use client"`, fetching straight from
  `api-gateway`'s REST API via TanStack Query/axios (Orval-generated hooks in `packages/api-client`)
  — Next.js is used mainly for its router, not server-side data fetching.
- **NativeWind on Next.js needs three things at once** (easy to break by touching only one):
  `jsxImportSource: "nativewind"` in `apps/web/tsconfig.json`, `"react-native-css-interop"` in
  `next.config.js`'s `transpilePackages`, and `nativewind/preset` in `tailwind.config.js`'s
  `presets`. If `className` silently does nothing on a page, check these three first.
- **Backend**: `api-gateway` (Spring MVC REST, OAuth2 resource server validating Keycloak JWTs) is
  the only externally-reachable service; it's a gRPC client to `organization` and `initialization`,
  which are gRPC servers with their own Postgres instance each (never shared credentials/blast
  radius). `proto-contracts` holds the `.proto` sources (buf-linted) shared by all three.
- **Authorization split**: api-gateway only checks the one *global* Keycloak realm role
  (`SUPER_ADMIN`, read via the custom `KeycloakRealmRoleConverter` — Spring Security's default
  converter looks at the wrong JWT claim). Every resource-level check (IND owner? ORG admin?) lives
  in `OrganizationService` itself, the only place that owns membership data; the gateway always
  forwards `actor_user_id` from the validated JWT, never from client input.
- **Keycloak is always called `auth`** in code/config/hostnames (compose service name, issuer URIs,
  k8s deployment) — "Keycloak" is only used as the product name in prose. Local realm/client/test
  user are **not** created automatically by `docker compose up`; see root `README.md`'s "Local auth
  setup" for the Admin REST API calls (wiped by `docker compose down -v`).
- **Pinned backend dependency versions are load-bearing, not arbitrary** — Spring Boot is pinned to
  4.0.x specifically because `spring-grpc-server-spring-boot-autoconfigure:1.0.3` breaks on 4.1.x;
  protobuf-java is pinned newer than what grpc-protobuf itself declares because buf's generated code
  needs newer Editions APIs. See `backend/README.md`'s "Pinned versions" table before bumping any of
  Spring Boot / Spring gRPC / grpc-java / protobuf-java — each combination has broken the build at
  least once. Also note the BOM import order in the root `pom.xml` (grpc-bom/protobuf-bom must come
  *before* spring-boot-dependencies) and `<parameters>true</parameters>` in maven-compiler-plugin
  (without it, every `@PathVariable`/`@RequestParam` endpoint throws at request time).
- **Production infra**: GKE + Cloud SQL + GCS via Terraform (`infra/terraform`), deployed via
  Kubernetes Gateway API (not classic Ingress — this GKE version has no ingress-gce controller).
  Launching on `please-support-me.pl` first; `.com` cutover is a documented later step (see
  `infra/README.md`). CI/CD (`deploy-prod.yml`): merging to `release` then pushing a `vX.Y.Z` tag
  runs `terraform apply` (unattended) → build/push all 4 images → `kubectl apply` → smoke test.
  `backend-ci.yml` only runs tests — there is no build/deploy-on-merge-to-main pipeline.

## Where things are tracked

Jira project **SCRUM** (`please-support-me.atlassian.net`) — e.g. SCRUM-183 (organization
management feature), SCRUM-185/186 (production deployment).
