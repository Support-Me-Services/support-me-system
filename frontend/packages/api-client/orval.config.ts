import { defineConfig } from "orval";

/**
 * Orval config: generates TanStack Query (v5) hooks + TypeScript types from
 * the OpenAPI/Swagger spec produced by the backend `api-gateway` service
 * (a Springdoc-generated openapi.json).
 *
 * IMPORTANT: `input.target` below points at a PLACEHOLDER path. The backend
 * `api-gateway` service produces this file as part of its own build
 * (Springdoc OpenAPI). Until there's a shared pipeline/artifact for this,
 * a human must manually copy or fetch the generated openapi.json from the
 * backend build output into the path below before running:
 *
 *   pnpm generate:api
 *
 * TODO(backend-integration): replace this manual copy step with either:
 *   - a `prebuild` script that fetches the spec from a running api-gateway
 *     instance (e.g. `curl http://localhost:8080/v3/api-docs -o ...`), or
 *   - a shared build artifact / CI step that publishes the spec somewhere
 *     both frontend and backend CI can reach.
 */
export default defineConfig({
  "support-me-api": {
    input: {
      // TODO(backend-integration): this file does not exist yet. Copy it
      // from the api-gateway build output (Springdoc) before running
      // `pnpm generate:api`.
      target: "../../../backend/api-gateway-openapi.json",
    },
    output: {
      // NOTE: "tags-split" writes one file per tag folder but no aggregating
      // root index.ts (confirmed against @orval/core's writeSplitTagsMode) -
      // ../src/index.ts re-exports each generated file by name instead; keep
      // that list in sync with the tags below.
      mode: "tags-split",
      target: "./src/generated",
      client: "react-query",
      httpClient: "axios",
      override: {
        mutator: {
          path: "./src/axios-instance.ts",
          name: "axiosInstance",
        },
        query: {
          useQuery: true,
          useInfinite: true,
          useSuspenseQuery: true,
        },
      },
    },
  },
});
