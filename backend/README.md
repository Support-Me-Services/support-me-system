# support-me-backend

Backend monorepo for the support-me-system: a Maven multi-module reactor containing three
Spring Boot microservices plus a shared proto-contracts module. Keycloak (auth/IAM) is *not*
a module here — it runs as its own container (see the root `docker-compose.yml`).

## Modules

| Module              | Description                                                                 |
|---------------------|------------------------------------------------------------------------------|
| `proto-contracts`   | `.proto` definitions (linted/checked with `buf`) + generated gRPC Java stubs |
| `organization`       | Domain service: organization management (SCRUM-183 - IND/ORG creation, the public "about" business-card page, both deletion workflows) plus future CMS/recruitment/shop/fundraising features. gRPC server. |
| `initialization`     | Domain service: entry points (QR/NFC/email/SMS links) and their lifecycle. gRPC server. |
| `api-gateway`        | Public REST API (Spring MVC + springdoc/OpenAPI), OAuth2 resource server validating Keycloak JWTs, gRPC client to `organization` and `initialization`. |

## Prerequisites

- **JDK 25** (LTS) on `PATH` / `JAVA_HOME`
- **Maven** 3.9+
- **[buf CLI](https://buf.build/docs/installation/)** installed and on `PATH` — required to
  regenerate Java/gRPC stubs from `.proto` sources (`proto-contracts` binds `buf generate` to
  the `generate-sources` phase via `exec-maven-plugin`)
- `protoc-gen-java` and `protoc-gen-grpc-java` — invoked by `buf generate` per
  `proto-contracts/buf.gen.yaml`. buf can manage these plugins itself (remote plugins) or you
  can install local `protoc`/gRPC Java codegen binaries on `PATH`; see
  `proto-contracts/buf.gen.yaml` comments.
- Docker (for Testcontainers-based integration tests in `organization` / `initialization`, and
  for local dev via the root `docker-compose.yml`)

## Building

Build the whole reactor in dependency order:

```bash
mvn -pl proto-contracts,organization,initialization,api-gateway -am install
```

Or simply, from `backend/`:

```bash
mvn install
```

Run only unit/fast checks without integration tests:

```bash
mvn -pl proto-contracts,organization,initialization,api-gateway -am verify -DskipITs
```

## Local dev environment

See the root-level `docker-compose.yml` (one directory up) for the per-service Postgres
instances, Keycloak, and the three services wired together for local development. Each service
gets its own Postgres container, own volume, and own low-privilege role - never a shared
superuser: `organization-db` (host port 5432), `initialization-db` (host port 5433), and
`auth-db` for Keycloak (host port 5434).

## Pinned versions (verified against Maven Central)

| Dependency | Version | Note |
|---|---|---|
| Spring Boot | 4.0.8 | Spring Boot 4 is current GA (4.1.1 is the latest minor); pinned to the 4.0.x line specifically because `spring-grpc-server-spring-boot-autoconfigure:1.0.3` is compiled directly against `spring-boot:4.0.2` — Spring Boot 4.1.1 changed an internal class shape (`PropertyMapper$Source$Adapter`) and threw `NoClassDefFoundError` at gRPC server startup, confirmed by a real failing test run |
| Spring gRPC | 1.0.3 | `spring-grpc-dependencies` BOM is pinned to 1.0.3, not the newer 1.1.x line — the split `spring-grpc-client-spring-boot-starter`/`spring-grpc-server-spring-boot-starter` artifacts we use return 404 past 1.0.3 (confirmed by directly probing Maven Central) |
| grpc-java (`grpc-bom`) | 1.77.1 | Tracks what `spring-grpc-dependencies:1.0.3` itself imports |
| protobuf-java | 4.36.1 | **Not** grpc-protobuf:1.77.1's own declared 3.25.8 — confirmed by an actual failing `mvn compile`: code from buf's remote `protocolbuffers/java` plugin uses newer "Editions" APIs (`RuntimeVersion`, `GeneratedMessage.isStringEmpty`, `FileDescriptor.resolveAllFeaturesImmutable()`) that don't exist in 3.25. protobuf-java runtime is forward-compatible (newer runtime runs older-generated code, not the reverse), so pin to the latest the generator needs, not what grpc-protobuf happens to declare. |
| springdoc-openapi | 3.1.1 | springdoc 3.x targets Spring Boot 4 (depends on Spring Boot 4-only module names like `spring-boot-health`) — the correct line now that we're on Boot 4 |
| Testcontainers | 2.0.5 | Latest stable major — **renamed its module artifacts** with a `testcontainers-` prefix (`org.testcontainers:junit-jupiter` → `org.testcontainers:testcontainers-junit-jupiter`, same for `postgresql`) vs 1.x |

**Critical pom.xml ordering note:** `grpc-bom`/`protobuf-bom` are imported as the *first* entries
in the root `pom.xml`'s `dependencyManagement`, before `spring-boot-dependencies`. Confirmed
empirically: `spring-grpc-dependencies:1.0.3` itself transitively imports `protobuf-bom:4.33.4`,
and when two imported BOMs manage the same artifact, Maven resolves the conflict in favor of
whichever import appears *first* in the list — not the more specific or later one. Getting this
order wrong silently resolves the wrong protobuf-java version on `organization`/`initialization`'s
classpath (proto-contracts itself still compiles fine either way, since its *own*
dependencyManagement doesn't propagate to sibling modules).

Confirmed via a standalone `dependency:resolve` against these exact coordinates: the whole set
resolves with no version conflicts. The `org.springframework.grpc.server.service.GrpcService`
annotation and `org.springframework.grpc.client.GrpcChannelFactory` class used in
`organization`/`initialization`/`api-gateway` were confirmed by inspecting the real
`spring-grpc-core:1.0.3` jar. If you bump `spring-boot.version`, `spring-grpc.version`,
`grpc.version`, or the buf codegen plugins, re-verify `protobuf.version` by running a real
`mvn compile` **and** `mvn test` (see the comments in `backend/pom.xml`) — every one of these
combinations has broken the build at least once during development.

## Verified end-to-end

`mvn -pl proto-contracts,organization,initialization,api-gateway -am verify` — **BUILD SUCCESS**,
all 19 tests passing (16 in `organization` - 13 `OrganizationService` unit tests plus 3
Testcontainers integration tests, 2 in `initialization`, 1 in `api-gateway`), with:

- `buf lint` clean (fixed two real STANDARD-ruleset violations: RPC response message names and
  enum value prefixes; see `proto-contracts/src/main/proto/`)
- `buf generate` using `remote: buf.build/protocolbuffers/java` / `remote: buf.build/grpc/java`
  in `proto-contracts/buf.gen.yaml`, so **no local `protoc`/`protoc-gen-grpc-java` install is
  needed** (only network access to buf.build at build time). A fully-offline local-plugin
  alternative is documented in that file's comments.
- Liquibase migrations applying against a real Testcontainers Postgres, Hibernate schema
  validation passing, and a JPA repository round-trip for both `organization` and
  `initialization`
- Both gRPC servers (`organization`, `initialization`) actually starting and registering their
  services (`OrganizationService`, `InitializationService`, plus reflection/health) on Netty

**`organization`/`initialization`'s tests bind the gRPC server to an OS-assigned ephemeral port**
(`@SpringBootTest(properties = "spring.grpc.server.port=0")`), not the fixed 9091/9092 from
`application.yml` — a real integration-test collision (with a port Testcontainers/Docker had
concurrently in use on the dev machine) confirmed this is necessary, and it's standard practice
for integration tests regardless: never bind a hardcoded port in a test.

## Verified end-to-end via Docker Compose

`docker compose up -d --build` — all 7 containers (`organization-db`, `initialization-db`,
`auth-db`, `auth`, `organization`, `initialization`, `api-gateway`) run successfully, and a full
browser login/logout cycle against
the `support-me` realm works (see the root `README.md`'s "Local auth setup"). Two real bugs
surfaced only at this stage (never running the actual executable jars before):

- **`no main manifest attribute, in app.jar`** — every service crash-looped. Root cause:
  `spring-boot-maven-plugin`'s `repackage` goal isn't automatically bound to the `package` phase
  unless a module inherits from `spring-boot-starter-parent` (which pre-declares that execution).
  This reactor doesn't (Spring Boot is managed via BOM import under a custom parent instead), so
  the execution had to be declared explicitly in the root `pom.xml`'s `pluginManagement` — without
  it, `mvn package` silently produced a plain (non-executable) jar with no `Main-Class`.
- `api-gateway`'s `/actuator/health` is unreachable from the Windows host on port 8080
  specifically (empty reply / connection reset), while the exact same request succeeds from
  *inside* the Docker network (verified with a `curlimages/curl` container sharing its network
  namespace) and Keycloak's own host-published port 8081 works fine from the host. This looks like
  a host-specific Docker Desktop/WSL2 port-forwarding quirk isolated to this one port on this dev
  machine, not an application bug — but flagging it since it'll block testing api-gateway's REST
  endpoints directly from the host until resolved (doesn't block browser-based login/logout, which
  only talks to Keycloak on 8081).

## SCRUM-183: organization management

Implements the full IND/ORG organization feature end to end:

- **Data model** (`organization`/`organization_membership` tables, migrations `001`/`002`):
  one `organization` row per IND or ORG, typed by `type`; ORG administrators live in a
  separate `organization_membership` table (IND has no memberships - ownership is
  `organization.owner_user_id` directly). Partial unique indexes (raw `sql` changesets,
  Postgres-specific) enforce: at most one non-deleted IND per owner; IND slugs unique
  globally; ORG slugs unique per `category_slug`. Deletion is a soft delete
  (`status=DELETED`) so slugs stay reserved forever and history is auditable.
- **Slugs**: `SlugGenerator` normalizes to lowercase ASCII (strips diacritics, incl. Polish
  `ł`/`Ł` which `Normalizer` doesn't decompose), then appends `-2`, `-3`, ... on collision,
  with a `DataIntegrityViolationException` retry loop in `OrganizationService` as a
  concurrency backstop.
- **Authorization split** (see `organization.proto`'s service doc comment): api-gateway
  authenticates (Keycloak JWT) and checks the one *global* role (`SUPER_ADMIN`, read from the
  non-standard `realm_access.roles` Keycloak claim via `KeycloakRealmRoleConverter` -
  Spring Security's default converter looks at `scope`/`scp` and would silently grant
  nothing). Every other, *resource-level* check (IND owner? ORG administrator?) is enforced
  in `OrganizationService`, the only place that owns membership data - the gateway always
  forwards `actor_user_id` from the validated JWT `sub` claim, never from client input.
- **Wizytowka XSS boundary**: `AboutContentSanitizer` (OWASP Java HTML Sanitizer) strips
  everything but a formatting/links/tables allowlist before persisting - the about page is
  guest-rendered HTML with no auth, so this is a real stored-XSS boundary, not defense in
  depth.
- **Deletion workflows**: ORG goes through administrator-requests -> Super Administrator
  approves (`RequestOrganizationDeletion`/`WithdrawOrganizationDeletion`/
  `ApproveOrganizationDeletion`); IND goes through an owner-only double confirmation
  (`StartIndividualOrganizationDeletion` returns a 10-minute confirmation token,
  `ConfirmIndividualOrganizationDeletion` must echo it back).
- Root `pom.xml`'s `maven-compiler-plugin` now sets `<parameters>true</parameters>` -
  **confirmed by a real failure**: every `@PathVariable`/`@RequestParam`-based endpoint threw
  `IllegalArgumentException: Name for argument of type [java.lang.String] not specified` at
  request time, because this reactor's custom parent (unlike
  `spring-boot-starter-parent`, which sets this by default) never enabled it. Records were
  unaffected (component names come from the class file regardless), which is why the
  pre-existing skeleton's tests never caught this - none of them exercised an endpoint with a
  path variable.

**Verified against the real `docker compose` stack**, not just `mvn test`: rebuilt
`organization`+`api-gateway`, then ran the full REST flow (create IND -> duplicate rejected
(409) -> list mine -> other user denied (403) -> about-page XSS payload sanitized -> guest
fetches the public about page -> deletion step 1/2 with a wrong-token rejection (409) in
between -> guest gets 404 post-deletion; then create ORG -> request deletion -> non-admin
denied (403) -> Super Administrator lists and approves it) against the live containers. Had
to run this from *inside* the `api-gateway` container (`docker exec ... bash`, raw
`/dev/tcp` HTTP - the image has no `curl`/`wget`) because of the pre-existing host port 8080
forwarding quirk noted below; every step returned exactly the expected status and body.

## Notes / TODOs

- Investigate the `api-gateway` port 8080 host-forwarding issue above (worked around for
  SCRUM-183 verification by testing from inside the Docker network instead).
