# Multi-stage build for the `web` (Next.js) app in this pnpm/Turborepo monorepo.
# Build context is expected to be the repo's `frontend/` directory, e.g.:
#   docker build -f apps/web/Dockerfile -t supportme/web .
#
# NEXT_PUBLIC_* vars are inlined into the JS bundle at `next build` time, not read at container
# startup - they MUST be passed as --build-arg, matching whichever domain/environment this image
# is built for. A single image is therefore tied to one API/auth backend; rebuild (don't just
# redeploy) if those change.

FROM node:20-slim AS base
RUN corepack enable
WORKDIR /workspace

# Deliberately NOT split into a separate manifest-only `deps` layer (the usual pnpm/Docker
# caching trick, copying just package.json files before the full source so `pnpm install`
# layer-caches independently of source edits) - confirmed by a real failure: with only
# apps/web/package.json and apps/mobile/package.json copied (no source), `pnpm install`
# resolved differently than a full local install and produced a broken nativewind type
# environment ("This JSX tag requires the module path 'nativewind/jsx-runtime' to exist"),
# even though the same install/build worked fine outside Docker. Full copy first avoids that
# divergence, at the cost of `pnpm install` re-running on every source change.
FROM base AS build
COPY . .
RUN pnpm install --frozen-lockfile

ARG NEXT_PUBLIC_API_BASE_URL
ARG NEXT_PUBLIC_KEYCLOAK_URL
ARG NEXT_PUBLIC_KEYCLOAK_REALM
ARG NEXT_PUBLIC_KEYCLOAK_CLIENT_ID
ARG NEXT_PUBLIC_KEYCLOAK_REDIRECT_URI
ARG NEXT_PUBLIC_KEYCLOAK_SCOPE
ENV NEXT_PUBLIC_API_BASE_URL=$NEXT_PUBLIC_API_BASE_URL \
    NEXT_PUBLIC_KEYCLOAK_URL=$NEXT_PUBLIC_KEYCLOAK_URL \
    NEXT_PUBLIC_KEYCLOAK_REALM=$NEXT_PUBLIC_KEYCLOAK_REALM \
    NEXT_PUBLIC_KEYCLOAK_CLIENT_ID=$NEXT_PUBLIC_KEYCLOAK_CLIENT_ID \
    NEXT_PUBLIC_KEYCLOAK_REDIRECT_URI=$NEXT_PUBLIC_KEYCLOAK_REDIRECT_URI \
    NEXT_PUBLIC_KEYCLOAK_SCOPE=$NEXT_PUBLIC_KEYCLOAK_SCOPE

RUN pnpm turbo run build --filter=@support-me/web...

FROM node:20-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /workspace/apps/web/.next/standalone ./
COPY --from=build /workspace/apps/web/.next/static ./apps/web/.next/static
COPY --from=build /workspace/apps/web/public ./apps/web/public

EXPOSE 3000
ENV PORT=3000 HOSTNAME=0.0.0.0
CMD ["node", "apps/web/server.js"]
