FROM node:20-slim AS base
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install --omit=dev=false

FROM base AS build
COPY . .
RUN npx tsc --noEmit || true

FROM node:20-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app /app
# Which entrypoint this container runs is selected per-service in docker-compose.yml via `command`.
CMD ["npx", "tsx", "src/entrypoints/api.ts"]
