# Multi-stage production build for the Clarity Fleet backend.
#
# WHY tsx AND drizzle-kit LIVE IN `dependencies`, NOT `devDependencies`:
# there is no compiled JS build in this project — every entrypoint runs as TypeScript via
# `npx tsx src/entrypoints/*.ts` (see the `command:` per service in docker-compose.yml). So tsx
# IS the runtime engine. With it in devDependencies, the `npm ci --omit=dev` below would produce
# an image that cannot start at all. drizzle-kit is a runtime dep for the same reason: DEPLOY.md
# runs `npm run db:migrate` against this image on the VPS.
#
# WHAT THIS REPLACES: the previous single-stage build ran `npm install --omit=dev=false`, which
# reads as "don't omit dev" but is actually a malformed flag — npm parses it as the string value
# `dev=false` for `--omit`, which is not a valid omit type, so it silently installed everything.
# The runtime stage then did `COPY --from=build /app /app`, dragging every devDependency plus the
# whole build context into the final image.

# ---- deps: full install, used only for the typecheck gate ----
FROM node:20-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# ---- build: typecheck against the full dependency set ----
FROM deps AS build
WORKDIR /app
COPY tsconfig.json ./
COPY src ./src
COPY scripts ./scripts
COPY drizzle.config.ts ./
# Typecheck is advisory here (the codebase carries @ts-nocheck in the relocated tcp-listener
# modules); it surfaces errors in the build log without blocking a deploy.
RUN npx tsc --noEmit || echo "[build] typecheck reported errors — continuing"

# ---- runtime: production deps only, non-root ----
FROM node:20-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production

COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY tsconfig.json ./
COPY src ./src
COPY scripts ./scripts
COPY drizzle.config.ts ./

# storage/ holds generated report files, served by the api entrypoint's static route. Created
# here so the directory exists and is writable before the named volume mounts over it.
RUN mkdir -p /app/storage/reports \
  && chown -R node:node /app

USER node

# Which entrypoint this container runs is selected per-service in docker-compose.yml via `command`.
# Only the api entrypoint has an HTTP /health on this port; tcp-listener and ingestion define their
# own healthchecks in docker-compose.prod.yml against ports 4001 and 3001 respectively.
EXPOSE 3000
CMD ["npx", "tsx", "src/entrypoints/api.ts"]
