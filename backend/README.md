# support-me-backend

Backend monorepo for the support-me-system: a Maven multi-module reactor containing three
Spring Boot microservices plus a shared proto-contracts module. Keycloak (auth/IAM) is *not*
a module here — it runs as its own container (see the root `docker-compose.yml`).

## Modules

| Module              | Description                                                                 |
|---------------------|------------------------------------------------------------------------------|
| `proto-contracts`   | `.proto` definitions (linted/checked with `buf`) + generated gRPC Java stubs |
| `organization`       | Domain service: organizations (CMS, business card, recruitment, shop, fundraising). gRPC server. |
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

See the root-level `docker-compose.yml` (one directory up) for Postgres, Keycloak, and the
three services wired together for local development.

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
all 5 tests passing (2 in `organization`, 2 in `initialization`, 1 in `api-gateway`), with:

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

## Notes / TODOs

- Create the actual `support-me` Keycloak realm; `issuer-uri` in `api-gateway`'s
  `application.yml` / the root `docker-compose.yml` env is currently a placeholder.
